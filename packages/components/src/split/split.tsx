import { clamp } from "@station/behaviors";
import { c, css, useEffect, useHost, useRef, useState } from "atomico";
import { fire, fireOpenChange } from "../shared/events.ts";
import { hostReset } from "../shared/styles.ts";

export type PaneEl = HTMLElement & {
  label?: string;
  collapse?: string;
  size?: number;
  min?: number;
  max?: number;
  collapsible?: boolean;
  collapsed?: boolean;
  collapsedSize?: number;
};
type SplitEl = HTMLElement & { orientation?: string; autosave?: string; kind?: string };

const panesOf = (split: HTMLElement) =>
  [...split.children].filter((c) => c.localName === "st-pane") as PaneEl[];

/** Which pane a handle resizes: the fixed-size one next to it (the other one fills). */
function target(panes: PaneEl[], handle: number): { pane: PaneEl; sign: 1 | -1 } | null {
  const before = panes[handle];
  const after = panes[handle + 1];
  if (before?.size != null) return { pane: before, sign: 1 };
  if (after?.size != null) return { pane: after, sign: -1 };
  return null;
}

function applySize(pane: PaneEl) {
  const railed = pane.collapsed && pane.label && pane.collapse !== "hide";
  const size = pane.collapsed ? (pane.collapsedSize ?? (railed ? RAIL : 0)) : pane.size;
  if (size == null) {
    pane.style.removeProperty("--_pane-size");
    pane.toggleAttribute("data-fill", true);
  } else {
    pane.style.setProperty("--_pane-size", `${size}px`);
    pane.removeAttribute("data-fill");
  }
}

function storageKey(split: SplitEl) {
  return split.autosave ? `st-split:${split.autosave}` : null;
}

function save(split: SplitEl) {
  const key = storageKey(split);
  if (!key) return;
  try {
    localStorage.setItem(
      key,
      JSON.stringify(panesOf(split).map((p) => ({ size: p.size ?? null, collapsed: !!p.collapsed }))),
    );
  } catch {}
}

function restore(split: SplitEl) {
  const key = storageKey(split);
  if (!key) return;
  try {
    const saved = JSON.parse(localStorage.getItem(key) ?? "null") as
      | { size: number | null; collapsed: boolean }[]
      | null;
    panesOf(split).forEach((p, i) => {
      const s = saved?.[i];
      if (!s) return;
      if (s.size != null && p.size != null) p.size = s.size;
      p.collapsed = s.collapsed;
    });
  } catch {}
}

/**
 * Resizable panes. Fixed panes have a `size`; panes without one fill.
 * Drag a divider, use arrow keys on it, or double-click to collapse a collapsible pane.
 *
 * <st-split autosave="main">
 *   <st-pane size="240" min="160" max="480" collapsible>Layers</st-pane>
 *   <st-pane>Canvas</st-pane>
 *   <st-pane size="280" min="220">Inspector</st-pane>
 * </st-split>
 */
export const Split = c(
  ({ orientation, kind }) => {
    const host = useHost<SplitEl>();
    const [count, setCount] = useState(0);
    const [, rerender] = useState(0);
    const drag = useRef<{ index: number; start: number; startSize: number } | null>(null);
    const vertical = orientation === "vertical";

    const layout = () => {
      const el = host.current;
      const panes = panesOf(el);
      if (panes.length !== count) setCount(panes.length);
      const slots = [...(el.shadowRoot?.querySelectorAll("slot") ?? [])];
      const cards = el.getAttribute("kind") === "cards";
      panes.forEach((p, i) => {
        applySize(p);
        p.toggleAttribute("data-card", cards);
        slots[i]?.assign(p);
      });
    };

    useEffect(() => {
      restore(host.current);
      layout();
      const observer = new MutationObserver(layout);
      observer.observe(host.current, {
        childList: true,
        subtree: false,
        attributes: true,
        attributeFilter: ["size", "collapsed", "collapsed-size", "label", "collapse"],
      });
      // Panes announce their own toggles (rail click, st-pane-toggle, pane.toggle()).
      const onToggle = (e: Event) => {
        if ((e.target as Element).parentElement !== host.current) return;
        e.stopPropagation();
        layout();
        rerender((n) => n + 1);
        save(host.current);
        fire(host.current, "change");
      };
      host.current.addEventListener("openchange", onToggle);
      return () => {
        observer.disconnect();
        host.current.removeEventListener("openchange", onToggle);
      };
    }, []);
    useEffect(() => layout(), [kind]);
    useEffect(layout);

    const resize = (index: number, next: number, commit: boolean) => {
      const t = target(panesOf(host.current), index);
      if (!t) return;
      const { pane } = t;
      if (pane.collapsed) pane.collapsed = false;
      pane.size = Math.round(clamp(next, pane.min ?? 0, pane.max ?? Number.POSITIVE_INFINITY));
      applySize(pane);
      fire(host.current, "input");
      if (commit) {
        save(host.current);
        fire(host.current, "change");
      }
    };

    const toggle = (index: number) => {
      const panes = panesOf(host.current);
      const pane = [panes[index], panes[index + 1]].find((p) => p?.collapsible) as
        | (PaneEl & { toggle?(): void })
        | undefined;
      pane?.toggle?.(); // fires openchange → layout, save, change
    };

    const handle = (index: number) => {
      const panes = panesOf(host.current);
      const t = target(panes, index);
      const size = t ? (t.pane.collapsed ? (t.pane.collapsedSize ?? 0) : (t.pane.size ?? 0)) : 0;
      // No divider next to a pane that is hidden entirely.
      const hidden = [panes[index], panes[index + 1]].some((p) => p?.collapsed && p.collapse === "hide");
      return (
        <div
          class="handle"
          hidden={hidden}
          part="handle"
          role="separator"
          tabindex="0"
          aria-label="Resize panes"
          aria-orientation={vertical ? "horizontal" : "vertical"}
          aria-valuenow={String(size)}
          aria-valuemin={t?.pane.min != null ? String(t.pane.min) : null}
          aria-valuemax={t?.pane.max != null ? String(t.pane.max) : null}
          data-disabled={t ? null : ""}
          onpointerdown={(e: PointerEvent) => {
            if (!t || e.button !== 0) return;
            (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
            drag.current = {
              index,
              start: vertical ? e.clientY : e.clientX,
              startSize: t.pane.collapsed ? (t.pane.collapsedSize ?? 0) : (t.pane.size ?? 0),
            };
            host.current.dataset.resizing = "";
            e.preventDefault();
          }}
          onpointermove={(e: PointerEvent) => {
            const d = drag.current;
            if (!d || d.index !== index || !t) return;
            const rtl = !vertical && getComputedStyle(host.current).direction === "rtl";
            const delta = ((vertical ? e.clientY : e.clientX) - d.start) * (rtl ? -1 : 1);
            resize(index, d.startSize + delta * t.sign, false);
          }}
          onpointerup={() => {
            if (!drag.current) return;
            drag.current = null;
            delete host.current.dataset.resizing;
            save(host.current);
            fire(host.current, "change");
          }}
          ondblclick={() => toggle(index)}
          onkeydown={(e: KeyboardEvent) => {
            if (!t) return;
            const step = e.shiftKey ? 32 : 8;
            const back = vertical ? "ArrowUp" : "ArrowLeft";
            const fwd = vertical ? "ArrowDown" : "ArrowRight";
            if (e.key === back || e.key === fwd) {
              e.preventDefault();
              resize(index, (t.pane.size ?? 0) + (e.key === fwd ? step : -step) * t.sign, true);
            } else if (e.key === "Home" && t.pane.min != null) resize(index, t.pane.min, true);
            else if (e.key === "End" && t.pane.max != null) resize(index, t.pane.max, true);
            else if (e.key === "Enter") toggle(index);
          }}
        />
      );
    };

    const children: unknown[] = [];
    for (let i = 0; i < count; i++) {
      children.push(<slot />);
      if (i < count - 1) children.push(handle(i));
    }

    return <host shadowDom={{ slotAssignment: "manual" }}>{children}</host>;
  },
  {
    props: {
      orientation: { type: String, reflect: true, value: (): "horizontal" | "vertical" => "horizontal" },
      autosave: { type: String, reflect: true },
      /** cards = panes are rounded cards with gaps on the backdrop. */
      kind: { type: String, reflect: true },
    },
    styles: [
      hostReset,
      css`
        :host {
          display: flex;
          flex-direction: row;
          min-width: 0;
          min-height: 0;
          overflow: hidden;
        }
        :host([orientation="vertical"]) {
          flex-direction: column;
        }
        :host([data-resizing]) {
          cursor: col-resize;
          user-select: none;
        }
        :host([orientation="vertical"][data-resizing]) {
          cursor: row-resize;
        }
        .handle {
          position: relative;
          flex: none;
          width: 1px;
          background: var(--st-border-subtle);
          outline: none;
          z-index: 1;
          cursor: col-resize;
          touch-action: none;
        }
        :host([orientation="vertical"]) .handle {
          width: auto;
          height: 1px;
          cursor: row-resize;
        }
        /* Bigger hit area than the 1px line. */
        .handle::before {
          content: "";
          position: absolute;
          inset: 0 -3px;
        }
        :host([orientation="vertical"]) .handle::before {
          inset: -3px 0;
        }
        .handle::after {
          content: "";
          position: absolute;
          inset: 0 -1px;
          background: transparent;
          transition: background-color var(--st-duration-fast) var(--st-ease);
        }
        :host([orientation="vertical"]) .handle::after {
          inset: -1px 0;
        }
        .handle:hover::after,
        .handle:focus-visible::after,
        :host([data-resizing]) .handle:active::after {
          background: var(--st-border-focus);
          transition-delay: 150ms;
        }
        .handle:focus-visible::after {
          transition-delay: 0ms;
        }
        .handle[data-disabled] {
          cursor: default;
          pointer-events: none;
        }
        .handle[hidden] {
          display: none;
        }

        /* ---- kind="cards": rounded panes with gaps on the backdrop ---- */
        :host([kind="cards"]) {
          --_gap: var(--st-split-gap, var(--st-space-3));
          padding: var(--_gap);
          background: var(--st-bg-backdrop);
        }
        :host([kind="cards"]) .handle {
          width: var(--_gap);
          background: transparent;
        }
        :host([kind="cards"][orientation="vertical"]) .handle {
          width: auto;
          height: var(--_gap);
        }
        :host([kind="cards"]) .handle::before {
          inset: 0;
        }
        /* A small grip instead of a line. */
        :host([kind="cards"]) .handle::after {
          inset: 50% auto auto 50%;
          width: 3px;
          height: 32px;
          translate: -50% -50%;
          border-radius: var(--st-radius-full);
        }
        :host([kind="cards"][orientation="vertical"]) .handle::after {
          width: 32px;
          height: 3px;
        }
        :host([kind="cards"]) .handle:hover::after,
        :host([kind="cards"]) .handle:focus-visible::after,
        :host([kind="cards"][data-resizing]) .handle:active::after {
          background: var(--st-border-strong);
        }
      `,
    ],
  },
);

const RAIL = 40;

/**
 * One pane in <st-split>. With `size` it is fixed (px); without it fills.
 * Collapsible panes with a `label` collapse to a slim rail (icon + label) that
 * expands on click; `collapse="hide"` removes them entirely instead.
 */
export const Pane = c(
  ({ collapsed, label, icon, collapse }) => {
    const host = useHost<PaneEl>();
    const rail = !!collapsed && !!label && collapse !== "hide";

    useEffect(() => {
      // pane.toggle(force?): collapse or expand, and tell the split (it saves and fires change).
      (host.current as PaneEl & { toggle(force?: boolean): void }).toggle = (force?: boolean) => {
        const el = host.current;
        const next = force === undefined ? !el.collapsed : !force;
        if (next === !!el.collapsed) return;
        el.collapsed = next;
        fireOpenChange(el, !next);
      };
    }, []);

    return (
      <host shadowDom data-rail={rail ? "" : null}>
        {rail ? (
          <button
            type="button"
            class="rail"
            part="rail"
            aria-expanded="false"
            aria-label={`Expand ${label}`}
            onclick={() => (host.current as PaneEl & { toggle(): void }).toggle()}
          >
            {icon && <st-icon name={icon} />}
            <span class="rail-label">{label}</span>
          </button>
        ) : (
          <slot />
        )}
      </host>
    );
  },
  {
    props: {
      size: { type: Number, reflect: true },
      min: { type: Number, reflect: true },
      max: { type: Number, reflect: true },
      collapsible: { type: Boolean, reflect: true },
      collapsed: { type: Boolean, reflect: true },
      collapsedSize: { type: Number, reflect: true },
      /** Name shown on the collapsed rail (and its accessible name). */
      label: { type: String, reflect: true },
      /** Icon on the collapsed rail. */
      icon: { type: String, reflect: true },
      /** rail (default when labeled) or hide. */
      collapse: { type: String, reflect: true },
    },
    styles: [
      hostReset,
      css`
        :host {
          display: flex;
          flex-direction: column;
          flex: 0 0 var(--_pane-size, auto);
          min-width: 0;
          min-height: 0;
          overflow: hidden;
        }
        :host([data-fill]) {
          flex: 1 1 0;
        }
        :host([collapsed]:not([collapsed-size]):not([data-rail])) {
          visibility: hidden;
        }
        :host([collapsed][collapse="hide"]) {
          display: none;
        }
        /* Card mode (set by <st-split kind="cards">). */
        :host([data-card]) {
          border-radius: var(--st-split-card-radius, var(--st-radius-5));
          background: var(--st-bg-panel);
          box-shadow: var(--st-card-edge);
        }
        .rail {
          all: unset;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: var(--st-space-2);
          width: 100%;
          height: 100%;
          padding-block: var(--st-space-3);
          color: var(--st-text-muted);
          cursor: default;
          border-radius: inherit;
        }
        .rail:hover {
          color: var(--st-text-strong);
          background: var(--st-bg-hover);
        }
        .rail:focus-visible {
          outline: var(--st-focus-ring-width) solid var(--st-border-focus);
          outline-offset: -3px;
        }
        .rail-label {
          writing-mode: vertical-rl;
          font: var(--st-weight-medium) calc(var(--st-text-1) * 0.94) / 1 var(--st-font-mono);
          letter-spacing: 0.08em;
          text-transform: uppercase;
          white-space: nowrap;
        }
        :host(:not([data-card])) .rail {
          background: var(--st-bg-panel);
        }
      `,
    ],
  },
);

/**
 * Collapses or expands a pane. Inside a pane it toggles that pane; elsewhere use for="pane-id".
 *
 * <st-panel-header><st-heading>Layers</st-heading><st-spacer></st-spacer><st-pane-toggle></st-pane-toggle></st-panel-header>
 */
export const PaneToggle = c(
  ({ label }) => {
    const host = useHost();
    const [open, setOpen] = useState(true);
    const paneOf = () => {
      const el = host.current as HTMLElement & { for?: string };
      const id = el.getAttribute("for");
      return (
        id ? (el.getRootNode() as Document | ShadowRoot).getElementById?.(id) : el.closest("st-pane")
      ) as (PaneEl & { toggle?(force?: boolean): void }) | null;
    };
    useEffect(() => {
      const pane = paneOf();
      if (!pane) return;
      const sync = () => setOpen(!pane.collapsed);
      sync();
      const mo = new MutationObserver(sync);
      mo.observe(pane, { attributes: true, attributeFilter: ["collapsed"] });
      return () => mo.disconnect();
    }, []);
    const name = paneOf()?.label;
    return (
      <host shadowDom>
        <button
          type="button"
          part="button"
          aria-expanded={open ? "true" : "false"}
          aria-label={label ?? `${open ? "Collapse" : "Expand"}${name ? ` ${name}` : " panel"}`}
          title={label ?? (open ? "Collapse" : "Expand")}
          onclick={() => paneOf()?.toggle?.()}
        >
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <rect
              x="2.5"
              y="3"
              width="11"
              height="10"
              rx="2"
              fill="none"
              stroke="currentColor"
              stroke-width="1.3"
            />
            <path d="M6.5 3v10" stroke="currentColor" stroke-width="1.3" />
          </svg>
        </button>
      </host>
    );
  },
  {
    props: {
      /** Accessible name. Defaults to "Collapse/Expand <pane label>". */
      label: String,
    },
    styles: [
      hostReset,
      css`
        :host {
          display: inline-flex;
          flex: none;
        }
        button {
          all: unset;
          display: grid;
          place-items: center;
          width: var(--st-control-height);
          height: var(--st-control-height);
          border-radius: var(--st-radius-2);
          color: var(--st-text-muted);
          cursor: default;
        }
        button:hover {
          background: var(--st-bg-hover);
          color: var(--st-text-strong);
        }
        button:focus-visible {
          outline: var(--st-focus-ring-width) solid var(--st-border-focus);
          outline-offset: var(--st-focus-ring-offset);
        }
        svg {
          width: var(--st-icon-size);
          height: var(--st-icon-size);
        }
      `,
    ],
  },
);
