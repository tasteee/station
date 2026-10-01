import { autoPosition, clamp } from "@station/behaviors";
import { c, css, useEffect, useHost, useProp, useRef, useState } from "atomico";
import type { DockGroup, DockLayout } from "../data-types.ts";
import { fire } from "../shared/events.ts";
import { hostReset } from "../shared/styles.ts";
import { attachTooltip } from "../shared/tooltip.tsx";

export type { DockGroup, DockLayout };

type PanelEl = HTMLElement & { name?: string; label?: string; icon?: string; group?: string };
type DockEl = HTMLElement & { autosave?: string; layout: DockLayout; side?: string };
type Drop = { group: number; index?: number; position: "tab" | "before" | "after" };

const MIN_GROUP_PX = 72;
const panelsOf = (dock: HTMLElement) =>
  [...dock.children].filter((c) => c.localName === "st-dock-panel") as PanelEl[];
const nameOf = (p: PanelEl, i: number) => p.name || p.getAttribute("name") || `panel-${i}`;

/** Layout from the panels' `group` attributes, then any saved layout reconciled with the current panels. */
function initialLayout(dock: DockEl): DockLayout {
  const panels = panelsOf(dock);
  const names = panels.map(nameOf);
  const byGroup = new Map<string, string[]>();
  panels.forEach((p, i) => {
    const g = p.getAttribute("group") ?? "main";
    byGroup.set(g, [...(byGroup.get(g) ?? []), names[i]!]);
  });
  let layout: DockLayout = {
    collapsed: dock.hasAttribute("collapsed"),
    groups: [...byGroup.values()].map((ps) => ({ panels: ps, active: ps[0]!, size: 1, minimized: false })),
  };
  if (dock.autosave) {
    try {
      const saved = JSON.parse(
        localStorage.getItem(`st-dock:${dock.autosave}`) ?? "null",
      ) as DockLayout | null;
      if (saved?.groups) {
        const groups = saved.groups
          .map((g) => ({ ...g, panels: g.panels.filter((n) => names.includes(n)) }))
          .filter((g) => g.panels.length)
          .map((g) => ({ ...g, active: g.panels.includes(g.active) ? g.active : g.panels[0]! }));
        const placed = new Set(groups.flatMap((g) => g.panels));
        const missing = names.filter((n) => !placed.has(n));
        if (missing.length) groups.push({ panels: missing, active: missing[0]!, size: 1, minimized: false });
        layout = { collapsed: !!saved.collapsed, groups };
      }
    } catch {}
  }
  return layout;
}

/**
 * Docked panel groups (Photoshop, After Effects). Panels are flat children with
 * a `group`; the dock arranges them without moving your DOM, so it is safe with
 * any framework.
 * - Tabs switch panels; drag a tab to another group, or above/below one for a new group.
 * - Alt+↑/↓ on a tab moves its panel between groups from the keyboard.
 * - Drag dividers to resize groups; double-click a tab bar to minimize.
 * - `collapsed` turns the dock into an icon strip whose icons open panels as flyouts.
 *
 * <st-dock autosave="editor">
 *   <st-dock-panel name="color" label="Color" icon="palette" group="a">…</st-dock-panel>
 *   <st-dock-panel name="layers" label="Layers" icon="stack" group="b">…</st-dock-panel>
 * </st-dock>
 */
export const Dock = c(
  ({ label, side }) => {
    const host = useHost<DockEl>();
    const [layout, setLayoutState] = useState<DockLayout>(() => initialLayout(host.current));
    const [collapsed, setCollapsed] = useProp<boolean>("collapsed");
    const [flyoutPanel, setFlyoutPanel] = useState<string | null>(null);
    const [drop, setDrop] = useState<Drop | null>(null);
    const dragTab = useRef<{ name: string; from: number; x: number; y: number; active: boolean } | null>(
      null,
    );
    const resize = useRef<{
      index: number;
      y: number;
      heights: [number, number];
      sizes: [number, number];
    } | null>(null);
    const flyout = useRef<HTMLElement>();
    const strip = useRef<HTMLElement>();
    const layoutRef = useRef(layout);
    layoutRef.current = layout;

    const el = host.current;
    const panels = panelsOf(el);
    const panelByName = new Map(panels.map((p, i) => [nameOf(p, i), p]));
    const isCollapsed = !!collapsed;

    const commit = (next: DockLayout) => {
      layoutRef.current = next;
      setLayoutState(next);
      if (el.autosave) {
        try {
          localStorage.setItem(`st-dock:${el.autosave}`, JSON.stringify(next));
        } catch {}
      }
      fire(el, "layoutchange", { layout: next });
    };

    // Public `layout` property.
    useEffect(() => {
      Object.defineProperty(el, "layout", {
        configurable: true,
        get: () => layoutRef.current,
        set: (next: DockLayout) => commit(next),
      });
    }, []);

    useEffect(() => {
      if (!!collapsed !== layout.collapsed) commit({ ...layoutRef.current, collapsed: !!collapsed });
      if (!collapsed) setFlyoutPanel(null);
    }, [collapsed]);

    // New or removed panels: reconcile the layout.
    useEffect(() => {
      const mo = new MutationObserver(() => {
        const names = panelsOf(el).map(nameOf);
        const cur = layoutRef.current;
        const groups = cur.groups
          .map((g) => ({ ...g, panels: g.panels.filter((n) => names.includes(n)) }))
          .filter((g) => g.panels.length)
          .map((g) => ({ ...g, active: g.panels.includes(g.active) ? g.active : g.panels[0]! }));
        const placed = new Set(groups.flatMap((g) => g.panels));
        const missing = names.filter((n) => !placed.has(n));
        if (missing.length) groups.push({ panels: missing, active: missing[0]!, size: 1, minimized: false });
        commit({ ...cur, groups });
      });
      mo.observe(el, { childList: true });
      return () => mo.disconnect();
    }, []);

    // Put each group's active panel (or the flyout's panel) into its slot.
    useEffect(() => {
      const root = el.shadowRoot!;
      const slots = [...root.querySelectorAll<HTMLSlotElement>("slot[data-group]")];
      for (const slot of slots) {
        const g = layout.groups[Number(slot.dataset.group)];
        const p = g && !g.minimized ? panelByName.get(g.active) : undefined;
        slot.assign(...(p ? [p] : []));
      }
      const fly = root.querySelector<HTMLSlotElement>("slot[data-flyout]");
      const fp = flyoutPanel ? panelByName.get(flyoutPanel) : undefined;
      fly?.assign(...(fp ? [fp] : []));
      for (const [name, p] of panelByName) {
        const shown = isCollapsed
          ? name === flyoutPanel
          : layout.groups.some((g) => g.active === name && !g.minimized);
        p.toggleAttribute("data-active", shown);
      }
    });

    useEffect(() => {
      if (!flyoutPanel) return;
      const f = flyout.current!;
      if (!f.matches(":popover-open")) f.showPopover();
      return autoPosition(strip.current!, f, {
        placement: side === "left" ? "right-start" : "left-start",
        offset: 4,
      });
    }, [flyoutPanel]);

    // ---- layout operations ----
    const activate = (gi: number, name: string) => {
      const groups = layout.groups.map((g, i) => (i === gi ? { ...g, active: name, minimized: false } : g));
      commit({ ...layout, groups });
    };

    const movePanel = (name: string, target: Drop) => {
      const cur = layoutRef.current;
      let groups: DockGroup[] = cur.groups.map((g) => ({ ...g, panels: g.panels.filter((n) => n !== name) }));
      if (target.position === "tab") {
        const g = groups[target.group]!;
        const panelsNext = [...g.panels];
        panelsNext.splice(target.index ?? panelsNext.length, 0, name);
        groups[target.group] = { ...g, panels: panelsNext, active: name, minimized: false };
      } else {
        const at = target.position === "before" ? target.group : target.group + 1;
        groups.splice(at, 0, { panels: [name], active: name, size: 1, minimized: false });
      }
      groups = groups
        .filter((g) => g.panels.length)
        .map((g) => ({ ...g, active: g.panels.includes(g.active) ? g.active : g.panels[0]! }));
      commit({ ...cur, groups });
    };

    // ---- tab drag ----
    const dropAt = (x: number, y: number): Drop | null => {
      const root = el.shadowRoot!;
      const hit = root.elementsFromPoint(x, y).find((n) => n.closest?.(".group")) as HTMLElement | undefined;
      const groupEl = hit?.closest(".group") as HTMLElement | null;
      if (!groupEl) return null;
      const gi = Number(groupEl.dataset.index);
      const bar = groupEl.querySelector(".tabs")!.getBoundingClientRect();
      if (y <= bar.bottom) {
        const tabs = [...groupEl.querySelectorAll<HTMLElement>(".tab")];
        const index = tabs.findIndex(
          (t) => x < t.getBoundingClientRect().left + t.getBoundingClientRect().width / 2,
        );
        return { group: gi, index: index < 0 ? tabs.length : index, position: "tab" };
      }
      const r = groupEl.getBoundingClientRect();
      const f = (y - r.top) / r.height;
      if (f < 0.35) return { group: gi, position: "before" };
      if (f > 0.65) return { group: gi, position: "after" };
      return { group: gi, index: layout.groups[gi]!.panels.length, position: "tab" };
    };

    const onTabPointerDown = (e: PointerEvent, gi: number, name: string) => {
      if (e.button !== 0) return;
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      dragTab.current = { name, from: gi, x: e.clientX, y: e.clientY, active: false };
    };
    const onTabPointerMove = (e: PointerEvent) => {
      const d = dragTab.current;
      if (!d) return;
      if (!d.active && Math.hypot(e.clientX - d.x, e.clientY - d.y) < 5) return;
      d.active = true;
      el.dataset.dragging = "";
      setDrop(dropAt(e.clientX, e.clientY));
    };
    const onTabPointerUp = (e: PointerEvent, gi: number, name: string) => {
      const d = dragTab.current;
      dragTab.current = null;
      delete el.dataset.dragging;
      if (!d?.active) {
        activate(gi, name);
        return;
      }
      const target = dropAt(e.clientX, e.clientY);
      setDrop(null);
      if (target) movePanel(d.name, target);
    };

    const onTabKey = (e: KeyboardEvent, gi: number, name: string) => {
      const g = layout.groups[gi]!;
      const i = g.panels.indexOf(name);
      const tabs = [...(e.currentTarget as HTMLElement).parentElement!.querySelectorAll<HTMLElement>(".tab")];
      if (e.altKey && (e.key === "ArrowUp" || e.key === "ArrowDown")) {
        e.preventDefault();
        const up = e.key === "ArrowUp";
        const target: Drop =
          up && gi === 0
            ? { group: 0, position: "before" }
            : !up && gi === layout.groups.length - 1
              ? { group: gi, position: "after" }
              : { group: gi + (up ? -1 : 1), position: "tab" };
        movePanel(name, target);
        requestAnimationFrame(() =>
          (el.shadowRoot!.querySelector(`.tab[data-panel="${name}"]`) as HTMLElement | null)?.focus(),
        );
      } else if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        e.preventDefault();
        const next = g.panels[(i + (e.key === "ArrowRight" ? 1 : -1) + g.panels.length) % g.panels.length]!;
        activate(gi, next);
        requestAnimationFrame(() => tabs.find((t) => t.dataset.panel === next)?.focus());
      } else if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        activate(gi, name);
      }
    };

    // ---- divider resize ----
    const onDividerDown = (e: PointerEvent, index: number) => {
      const groupsEls = [...el.shadowRoot!.querySelectorAll<HTMLElement>(".group")];
      const a = groupsEls[index]!.getBoundingClientRect().height;
      const b = groupsEls[index + 1]!.getBoundingClientRect().height;
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      resize.current = {
        index,
        y: e.clientY,
        heights: [a, b],
        sizes: [layout.groups[index]!.size, layout.groups[index + 1]!.size],
      };
    };
    const onDividerMove = (e: PointerEvent) => {
      const r = resize.current;
      if (!r) return;
      const [ha, hb] = r.heights;
      const delta = clamp(e.clientY - r.y, MIN_GROUP_PX - ha, hb - MIN_GROUP_PX);
      const total = r.sizes[0] + r.sizes[1];
      const sa = (total * (ha + delta)) / (ha + hb);
      const groups = layoutRef.current.groups.map((g, i) =>
        i === r.index ? { ...g, size: sa } : i === r.index + 1 ? { ...g, size: total - sa } : g,
      );
      layoutRef.current = { ...layoutRef.current, groups };
      setLayoutState(layoutRef.current);
    };
    const onDividerUp = () => {
      if (!resize.current) return;
      resize.current = null;
      commit(layoutRef.current);
    };

    const iconButton = (name: string) => {
      const p = panelByName.get(name);
      return (
        <button
          type="button"
          class="strip-btn"
          data-panel={name}
          aria-label={p?.label ?? name}
          aria-expanded={flyoutPanel === name ? "true" : "false"}
          data-open={flyoutPanel === name ? "" : null}
          onclick={() => {
            if (flyoutPanel === name) flyout.current?.hidePopover();
            else setFlyoutPanel(name);
          }}
        >
          {p?.icon ? (
            <st-icon name={p.icon} />
          ) : (
            <span class="initial">{(p?.label ?? name).slice(0, 1)}</span>
          )}
        </button>
      );
    };

    useEffect(() => {
      if (!isCollapsed) return;
      const buttons = [...el.shadowRoot!.querySelectorAll<HTMLElement>(".strip-btn")];
      const cleanups = buttons.map((b) =>
        attachTooltip(b, () => ({
          label: b.getAttribute("aria-label"),
          placement: side === "left" ? "right" : "left",
        })),
      );
      return () => {
        for (const c2 of cleanups) c2();
      };
    }, [isCollapsed, layout]);

    const toggleCollapsed = () => {
      setCollapsed(!isCollapsed);
      fire(el, "openchange", { open: isCollapsed });
    };

    return (
      <host shadowDom={{ slotAssignment: "manual" }} role="complementary" aria-label={label ?? "Panels"}>
        {isCollapsed ? (
          <div class="strip" ref={strip} part="strip">
            <button
              type="button"
              class="collapse"
              aria-label="Expand panels"
              title="Expand panels"
              onclick={toggleCollapsed}
            >
              <svg viewBox="0 0 16 16" aria-hidden="true">
                <path
                  d={side === "left" ? "M5 4l4 4-4 4M9 4l4 4-4 4" : "M11 4L7 8l4 4M7 4L3 8l4 4"}
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.4"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </button>
            {layout.groups.map((g, gi) => [
              gi > 0 && <span class="strip-sep" />,
              ...g.panels.map(iconButton),
            ])}
            <div
              ref={flyout}
              class="flyout"
              popover="auto"
              role="dialog"
              aria-label={flyoutPanel ? (panelByName.get(flyoutPanel)?.label ?? flyoutPanel) : undefined}
              ontoggle={(e: ToggleEvent) => e.newState === "closed" && setFlyoutPanel(null)}
            >
              <div class="flyout-head">
                <span>{flyoutPanel ? (panelByName.get(flyoutPanel)?.label ?? flyoutPanel) : ""}</span>
              </div>
              <div class="flyout-body">
                <slot data-flyout="" />
              </div>
            </div>
          </div>
        ) : (
          <div class="dock" part="dock">
            {layout.groups.map((g, gi) => [
              gi > 0 && (
                <div
                  class="divider"
                  role="separator"
                  aria-orientation="horizontal"
                  onpointerdown={(e: PointerEvent) => onDividerDown(e, gi - 1)}
                  onpointermove={onDividerMove}
                  onpointerup={onDividerUp}
                />
              ),
              <section
                class="group"
                part="group"
                data-index={String(gi)}
                data-minimized={g.minimized ? "" : null}
                data-drop={drop?.group === gi ? drop.position : null}
                style={g.minimized ? "" : `flex:${g.size} 1 0`}
              >
                <div
                  class="tabs"
                  role="tablist"
                  aria-label={`Panel group ${gi + 1}`}
                  ondblclick={(e: MouseEvent) => {
                    if ((e.target as Element).closest(".tab")) return;
                    commit({
                      ...layout,
                      groups: layout.groups.map((x, i) => (i === gi ? { ...x, minimized: !x.minimized } : x)),
                    });
                  }}
                >
                  {g.panels.map((name, ti) => {
                    const p = panelByName.get(name);
                    const isActive = g.active === name;
                    return [
                      drop?.group === gi && drop.position === "tab" && drop.index === ti && (
                        <span class="insert" />
                      ),
                      <button
                        type="button"
                        class="tab"
                        role="tab"
                        data-panel={name}
                        aria-selected={isActive ? "true" : "false"}
                        tabindex={isActive ? "0" : "-1"}
                        onpointerdown={(e: PointerEvent) => onTabPointerDown(e, gi, name)}
                        onpointermove={onTabPointerMove}
                        onpointerup={(e: PointerEvent) => onTabPointerUp(e, gi, name)}
                        onkeydown={(e: KeyboardEvent) => onTabKey(e, gi, name)}
                      >
                        {p?.label ?? name}
                      </button>,
                    ];
                  })}
                  {drop?.group === gi && drop.position === "tab" && drop.index === g.panels.length && (
                    <span class="insert" />
                  )}
                  <span class="spacer" />
                  {gi === 0 && (
                    <button
                      type="button"
                      class="collapse"
                      aria-label="Collapse to icons"
                      title="Collapse to icons"
                      onclick={toggleCollapsed}
                    >
                      <svg viewBox="0 0 16 16" aria-hidden="true">
                        <path
                          d={side === "left" ? "M11 4L7 8l4 4M7 4L3 8l4 4" : "M5 4l4 4-4 4M9 4l4 4-4 4"}
                          fill="none"
                          stroke="currentColor"
                          stroke-width="1.4"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                        />
                      </svg>
                    </button>
                  )}
                </div>
                <div class="body" role="tabpanel" hidden={g.minimized}>
                  <slot data-group={String(gi)} />
                </div>
              </section>,
            ])}
          </div>
        )}
      </host>
    );
  },
  {
    props: {
      label: { type: String, reflect: true },
      side: { type: String, reflect: true, value: (): "right" | "left" => "right" },
      collapsed: { type: Boolean, reflect: true },
      autosave: { type: String, reflect: true },
    },
    styles: [
      hostReset,
      css`
        :host {
          display: flex;
          flex-direction: column;
          min-height: 0;
          height: 100%;
          background: var(--st-bg-canvas);
          font-family: var(--st-font-sans);
          font-size: var(--st-text-2);
          color: var(--st-text);
        }
        .dock {
          display: flex;
          flex-direction: column;
          flex: 1;
          min-height: 0;
        }
        .group {
          position: relative;
          display: flex;
          flex-direction: column;
          min-height: 0;
          background: var(--st-bg-panel);
        }
        .group[data-minimized] {
          flex: none;
        }
        .group[data-drop="before"]::before,
        .group[data-drop="after"]::after {
          content: "";
          position: absolute;
          left: 0;
          right: 0;
          height: 2px;
          background: var(--st-border-focus);
          z-index: 2;
        }
        .group[data-drop="before"]::before {
          top: -1px;
        }
        .group[data-drop="after"]::after {
          bottom: -1px;
        }
        .tabs {
          display: flex;
          align-items: center;
          gap: 1px;
          flex: none;
          height: calc(var(--st-control-height) + var(--st-space-2));
          padding-inline: var(--st-space-1);
          border-bottom: 1px solid var(--st-border-subtle);
          background: var(--st-bg-panel);
          overflow: hidden;
        }
        .group[data-minimized] .tabs {
          border-bottom: 0;
        }
        .tab {
          all: unset;
          flex: none;
          height: var(--st-control-height);
          padding-inline: var(--st-space-2);
          border-radius: var(--st-radius-2);
          color: var(--st-text-muted);
          font-weight: var(--st-weight-medium);
          font-size: var(--st-control-font-size);
          white-space: nowrap;
          cursor: default;
          touch-action: none;
        }
        .tab:hover {
          color: var(--st-text-strong);
        }
        .tab[aria-selected="true"] {
          color: var(--st-text-strong);
          background: var(--st-bg-selected);
        }
        .tab:focus-visible,
        .collapse:focus-visible,
        .strip-btn:focus-visible {
          outline: var(--st-focus-ring-width) solid var(--st-border-focus);
          outline-offset: -1px;
        }
        :host([data-dragging]) .tab {
          cursor: grabbing;
        }
        .insert {
          width: 2px;
          height: 16px;
          background: var(--st-border-focus);
          flex: none;
        }
        .spacer {
          flex: 1;
        }
        .collapse {
          all: unset;
          display: grid;
          place-items: center;
          width: 22px;
          height: 22px;
          border-radius: var(--st-radius-1);
          color: var(--st-text-muted);
        }
        .collapse:hover {
          color: var(--st-text-strong);
          background: var(--st-bg-hover);
        }
        .collapse svg {
          width: 14px;
          height: 14px;
        }
        .body {
          display: flex;
          flex-direction: column;
          flex: 1;
          min-height: 0;
          overflow: auto;
          scrollbar-width: thin;
        }
        .body[hidden] {
          display: none;
        }
        .group[data-drop="tab"] .body {
          box-shadow: inset 0 0 0 2px var(--st-border-focus);
        }
        .divider {
          position: relative;
          flex: none;
          height: 1px;
          background: var(--st-border);
          cursor: row-resize;
          touch-action: none;
          z-index: 1;
        }
        .divider::before {
          content: "";
          position: absolute;
          inset: -3px 0;
        }
        .divider:hover {
          background: var(--st-border-focus);
        }
        /* Collapsed icon strip */
        .strip {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
          width: 36px;
          height: 100%;
          padding-block: var(--st-space-1);
          background: var(--st-bg-panel);
        }
        .strip-btn {
          all: unset;
          display: grid;
          place-items: center;
          width: 28px;
          height: 28px;
          border-radius: var(--st-radius-2);
          color: var(--st-text-muted);
        }
        .strip-btn:hover {
          background: var(--st-bg-hover);
          color: var(--st-text-strong);
        }
        .strip-btn[data-open] {
          background: var(--st-bg-pressed);
          color: var(--st-text-strong);
        }
        .initial {
          font-weight: var(--st-weight-strong);
          font-size: var(--st-text-1);
        }
        .strip-sep {
          width: 20px;
          height: 1px;
          margin-block: var(--st-space-1);
          background: var(--st-border-subtle);
        }
        .flyout {
          margin: 0;
          inset: auto;
          box-sizing: border-box;
          width: 280px;
          max-height: min(560px, var(--st-available-height, 560px));
          padding: 0;
          border: 0;
          border-radius: var(--st-radius-3);
          background: var(--st-bg-panel);
          color: var(--st-text);
          box-shadow: var(--st-shadow-floating);
          overflow: hidden;
        }
        .flyout:popover-open {
          display: flex;
          flex-direction: column;
        }
        .flyout-head {
          display: flex;
          align-items: center;
          height: 32px;
          padding-inline: var(--st-space-3);
          border-bottom: 1px solid var(--st-border-subtle);
          font-weight: var(--st-weight-strong);
          color: var(--st-text-strong);
          flex: none;
        }
        .flyout-body {
          display: flex;
          flex-direction: column;
          min-height: 0;
          overflow: auto;
        }
      `,
    ],
  },
);

/** One panel in st-dock. `group` sets where it starts; the dock may rearrange it. */
export const DockPanel = c(
  () => (
    <host shadowDom>
      <slot />
    </host>
  ),
  {
    props: {
      name: { type: String, reflect: true },
      label: { type: String, reflect: true },
      icon: { type: String, reflect: true },
      group: { type: String, reflect: true },
    },
    styles: [
      hostReset,
      css`
        :host {
          display: flex;
          flex-direction: column;
          flex: 1;
          min-height: 0;
        }
        :host(:not([data-active])) {
          display: none;
        }
      `,
    ],
  },
);
