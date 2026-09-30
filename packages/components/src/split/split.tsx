import { clamp } from "@station/behaviors";
import { c, css, useEffect, useHost, useRef, useState } from "atomico";
import { fire } from "../shared/events.ts";
import { hostReset } from "../shared/styles.ts";

export type PaneEl = HTMLElement & {
  size?: number;
  min?: number;
  max?: number;
  collapsible?: boolean;
  collapsed?: boolean;
  collapsedSize?: number;
};
type SplitEl = HTMLElement & { orientation?: string; autosave?: string };

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
  const size = pane.collapsed ? (pane.collapsedSize ?? 0) : pane.size;
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
  ({ orientation }) => {
    const host = useHost<SplitEl>();
    const [count, setCount] = useState(0);
    const drag = useRef<{ index: number; start: number; startSize: number } | null>(null);
    const vertical = orientation === "vertical";

    const layout = () => {
      const el = host.current;
      const panes = panesOf(el);
      if (panes.length !== count) setCount(panes.length);
      const slots = [...(el.shadowRoot?.querySelectorAll("slot") ?? [])];
      panes.forEach((p, i) => {
        applySize(p);
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
        attributeFilter: ["size", "collapsed", "collapsed-size"],
      });
      return () => observer.disconnect();
    }, []);
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
      const pane = [panes[index], panes[index + 1]].find((p) => p?.collapsible);
      if (!pane) return;
      pane.collapsed = !pane.collapsed;
      applySize(pane);
      save(host.current);
      fire(host.current, "change");
    };

    const handle = (index: number) => {
      const panes = panesOf(host.current);
      const t = target(panes, index);
      const size = t ? (t.pane.collapsed ? (t.pane.collapsedSize ?? 0) : (t.pane.size ?? 0)) : 0;
      return (
        <div
          class="handle"
          part="handle"
          role="separator"
          tabindex="0"
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
      `,
    ],
  },
);

/** One pane in <st-split>. With `size` it is fixed (px); without it fills. */
export const Pane = c(
  () => (
    <host shadowDom>
      <slot />
    </host>
  ),
  {
    props: {
      size: { type: Number, reflect: true },
      min: { type: Number, reflect: true },
      max: { type: Number, reflect: true },
      collapsible: { type: Boolean, reflect: true },
      collapsed: { type: Boolean, reflect: true },
      collapsedSize: { type: Number, reflect: true },
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
        :host([collapsed]:not([collapsed-size])) {
          visibility: hidden;
        }
      `,
    ],
  },
);
