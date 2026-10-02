import { c, css, useEffect, useHost, useRef } from "atomico";
import type { CanvasRect, TransformDetail } from "../data-types.ts";

export type { TransformDetail };

import { fire } from "../shared/events.ts";
import { hostReset } from "../shared/styles.ts";
import type { ViewportEl } from "./viewport.tsx";

type TransformBoxEl = HTMLElement & {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  targets?: string;
  rotatable?: boolean;
};

/** Handle → which edges it moves (-1 = left/top, 1 = right/bottom, 0 = none). */
const HANDLES: Record<string, [number, number]> = {
  nw: [-1, -1],
  n: [0, -1],
  ne: [1, -1],
  e: [1, 0],
  se: [1, 1],
  s: [0, 1],
  sw: [-1, 1],
  w: [-1, 0],
};

const RAD = Math.PI / 180;
const round = (n: number) => Math.round(n * 100) / 100;
const normAngle = (a: number) => {
  const r = ((((a + 180) % 360) + 360) % 360) - 180;
  return r === -180 ? 180 : r;
};

type Start = {
  handle: string;
  px: number;
  py: number;
  box: { x: number; y: number; width: number; height: number; rotation: number };
};

/**
 * Selection handles for canvas objects. Put it in an st-viewport overlay; it is
 * placed in document coordinates and keeps constant-size handles at any zoom.
 * `x`/`y`/`width`/`height` are the unrotated box; `rotation` turns it about its center.
 *
 * Drag inside to move, drag a handle to resize, drag the top knob to rotate.
 * Shift keeps proportions (and rotates in 15° steps); Alt resizes from the center.
 * Arrows nudge 1 (Shift: 10); Alt+arrows resize. With a snapping viewport,
 * moves and resizes snap to other objects, artboards, guides and the grid.
 *
 * It moves itself and reports: `transform` while dragging, `change` on release.
 * The app updates its objects from those events.
 *
 * <st-transform-box slot="overlay" x="40" y="40" width="200" height="120" rotatable></st-transform-box>
 */
export const TransformBox = c(
  ({ x, y, width, height, rotation, label, rotatable }) => {
    const host = useHost<TransformBoxEl>();
    const start = useRef<Start | null>(null);

    const el = () => host.current;
    const viewport = () => el().closest("st-viewport") as ViewportEl | null;
    const toDoc = (cx: number, cy: number) => viewport()?.toDocument?.(cx, cy) ?? { x: cx, y: cy };
    const exclude = () => (el().targets ?? "").split(/[\s,]+/).filter(Boolean);
    const snapTo = (r: CanvasRect) => {
      const vp = viewport();
      return vp?.snap && vp.snapRect ? vp.snapRect(r, exclude()) : r;
    };

    // Place it with CSS variables so view changes (pan/zoom) need no re-render.
    useEffect(() => {
      const s = el().style;
      s.setProperty("--_x", String(x ?? 0));
      s.setProperty("--_y", String(y ?? 0));
      s.setProperty("--_w", String(width ?? 0));
      s.setProperty("--_h", String(height ?? 0));
      s.setProperty("--_r", String(rotation ?? 0));
    }, [x, y, width, height, rotation]);

    const current = () => {
      const h = el();
      return {
        x: h.x ?? 0,
        y: h.y ?? 0,
        width: h.width ?? 0,
        height: h.height ?? 0,
        rotation: h.rotation ?? 0,
      };
    };

    const apply = (next: Omit<TransformDetail, "handle">, handle: string, type: "transform" | "change") => {
      const box = {
        x: round(next.x),
        y: round(next.y),
        width: round(next.width),
        height: round(next.height),
        rotation: round(next.rotation),
      };
      Object.assign(el(), box);
      fire(el(), type, { ...box, handle });
    };

    const resize = (s: Start, px: number, py: number, shift: boolean, alt: boolean) => {
      const { box } = s;
      const [sx, sy] = HANDLES[s.handle] ?? [0, 0];
      const t = box.rotation * RAD;
      const cos = Math.cos(t);
      const sin = Math.sin(t);
      // Pointer delta in the box's own (unrotated) frame.
      const dx = px - s.px;
      const dy = py - s.py;
      const lx = dx * cos + dy * sin;
      const ly = -dx * sin + dy * cos;
      const k = alt ? 2 : 1;
      let w = box.width + sx * lx * k;
      let h = box.height + sy * ly * k;

      // Snap the moving edges (unrotated, edge-anchored, free aspect). NaN = axis not moving.
      if (!box.rotation && !shift && !alt) {
        const probe = {
          x: sx ? (sx > 0 ? box.x + w : box.x + box.width - w) : Number.NaN,
          y: sy ? (sy > 0 ? box.y + h : box.y + box.height - h) : Number.NaN,
          width: 0,
          height: 0,
        };
        const hit = snapTo(probe);
        if (sx) w += sx * (hit.x - probe.x);
        if (sy) h += sy * (hit.y - probe.y);
      }

      if (shift && box.width && box.height) {
        const ratio = box.width / box.height;
        if (sx && sy) {
          // Corner: follow whichever side moved more.
          const f = Math.max(w / box.width, h / box.height);
          w = box.width * f;
          h = box.height * f;
        } else if (sx) h = w / ratio;
        else w = h * ratio;
      }
      w = Math.max(1, w);
      h = Math.max(1, h);

      // Keep the anchor (opposite edge, or the center with Alt) fixed in the world.
      const ax = alt ? 0 : (-sx * box.width) / 2;
      const ay = alt ? 0 : (-sy * box.height) / 2;
      const ncx = alt ? 0 : ax + (sx * w) / 2;
      const ncy = alt ? 0 : ay + (sy * h) / 2;
      const cx0 = box.x + box.width / 2;
      const cy0 = box.y + box.height / 2;
      const cx = cx0 + ncx * cos - ncy * sin;
      const cy = cy0 + ncx * sin + ncy * cos;
      return { x: cx - w / 2, y: cy - h / 2, width: w, height: h, rotation: box.rotation };
    };

    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      const target = e.composedPath()[0] as HTMLElement;
      const handle = target.dataset?.handle ?? "move";
      e.stopPropagation();
      e.preventDefault();
      el().focus({ preventScroll: true, focusVisible: false } as FocusOptions);
      el().setPointerCapture(e.pointerId);
      const p = toDoc(e.clientX, e.clientY);
      start.current = { handle, px: p.x, py: p.y, box: current() };
      el().toggleAttribute("data-active", true);
    };

    const onPointerMove = (e: PointerEvent) => {
      const s = start.current;
      if (!s) return;
      const p = toDoc(e.clientX, e.clientY);
      const { box } = s;
      if (s.handle === "move") {
        let dx = p.x - s.px;
        let dy = p.y - s.py;
        if (e.shiftKey) {
          if (Math.abs(dx) > Math.abs(dy)) dy = 0;
          else dx = 0;
        }
        let next = { ...box, x: box.x + dx, y: box.y + dy };
        if (!box.rotation) next = { ...next, ...snapTo(next) };
        apply(next, "move", "transform");
      } else if (s.handle === "rotate") {
        const cx = box.x + box.width / 2;
        const cy = box.y + box.height / 2;
        const a0 = Math.atan2(s.py - cy, s.px - cx);
        const a1 = Math.atan2(p.y - cy, p.x - cx);
        let r = box.rotation + (a1 - a0) / RAD;
        if (e.shiftKey) r = Math.round(r / 15) * 15;
        apply({ ...box, rotation: normAngle(r) }, "rotate", "transform");
      } else {
        apply(resize(s, p.x, p.y, e.shiftKey, e.altKey), s.handle, "transform");
      }
    };

    const onPointerUp = () => {
      const s = start.current;
      start.current = null;
      el().removeAttribute("data-active");
      viewport()?.clearSnapLines?.();
      if (!s) return;
      const now = current();
      const changed = (Object.keys(now) as (keyof typeof now)[]).some((k) => now[k] !== s.box[k]);
      if (changed) fire(el(), "change", { ...now, handle: s.handle });
    };

    const onKeyDown = (e: KeyboardEvent) => {
      const dir: Record<string, [number, number]> = {
        ArrowLeft: [-1, 0],
        ArrowRight: [1, 0],
        ArrowUp: [0, -1],
        ArrowDown: [0, 1],
      };
      const d = dir[e.key];
      if (!d) return;
      e.preventDefault();
      e.stopPropagation();
      const step = e.shiftKey ? 10 : 1;
      const box = current();
      const next = e.altKey
        ? {
            ...box,
            width: Math.max(1, box.width + d[0] * step),
            height: Math.max(1, box.height + d[1] * step),
          }
        : { ...box, x: box.x + d[0] * step, y: box.y + d[1] * step };
      apply(next, "keyboard", "transform");
      fire(el(), "change", { ...current(), handle: "keyboard" });
    };

    const w = Math.round(width ?? 0);
    const h = Math.round(height ?? 0);
    const r = Math.round(rotation ?? 0);

    return (
      <host
        shadowDom
        tabindex="0"
        role="group"
        aria-label={`${label ?? "Selection"}: ${w} × ${h}${r ? `, ${r}°` : ""}`}
        aria-roledescription="transform box"
        onpointerdown={onPointerDown}
        onpointermove={onPointerMove}
        onpointerup={onPointerUp}
        onpointercancel={onPointerUp}
        onkeydown={onKeyDown}
      >
        <div class="frame" part="frame" />
        {Object.keys(HANDLES).map((k) => (
          <div class={`handle h-${k}`} part="handle" data-handle={k} />
        ))}
        {rotatable && [
          <div class="stem" />,
          <div class="handle rotate" part="handle rotate" data-handle="rotate" />,
        ]}
        <span class="size" part="size" aria-hidden="true">
          {`${w} × ${h}`}
          {r ? ` · ${r}°` : ""}
        </span>
      </host>
    );
  },
  {
    props: {
      x: { type: Number, reflect: true, value: () => 0 },
      y: { type: Number, reflect: true, value: () => 0 },
      width: { type: Number, reflect: true, value: () => 0 },
      height: { type: Number, reflect: true, value: () => 0 },
      rotation: { type: Number, reflect: true, value: () => 0 },
      label: { type: String, reflect: true },
      targets: { type: String, reflect: true },
      rotatable: { type: Boolean, reflect: true },
    },
    styles: [
      hostReset,
      css`
        :host {
          --_zoom: var(--st-view-zoom, 1);
          --_mark: var(--st-canvas-mark, var(--st-signal));
          position: absolute;
          left: calc((var(--_x, 0) - var(--st-view-x, 0)) * var(--_zoom) * 1px);
          top: calc((var(--_y, 0) - var(--st-view-y, 0)) * var(--_zoom) * 1px);
          width: calc(var(--_w, 0) * var(--_zoom) * 1px);
          height: calc(var(--_h, 0) * var(--_zoom) * 1px);
          rotate: calc(var(--_r, 0) * 1deg);
          cursor: move;
          outline: none;
          touch-action: none;
        }
        .frame {
          position: absolute;
          inset: 0;
          outline: 1px solid var(--_mark);
          box-shadow: 0 0 0 1.5px light-dark(oklch(100% 0 0 / 0.5), oklch(0% 0 0 / 0.5));
        }
        :host(:focus-visible) .frame {
          outline-width: 2px;
        }
        .handle {
          position: absolute;
          width: 8px;
          height: 8px;
          margin: -4px 0 0 -4px;
          border-radius: 2px;
          background: var(--st-bg-panel);
          box-shadow:
            0 0 0 1.5px var(--_mark),
            0 1px 2px oklch(0% 0 0 / 0.25);
        }
        /* A bigger hit area than the visible square. */
        .handle::before {
          content: "";
          position: absolute;
          inset: -4px;
        }
        .h-nw { left: 0; top: 0; cursor: nwse-resize; }
        .h-n { left: 50%; top: 0; cursor: ns-resize; }
        .h-ne { left: 100%; top: 0; cursor: nesw-resize; }
        .h-e { left: 100%; top: 50%; cursor: ew-resize; }
        .h-se { left: 100%; top: 100%; cursor: nwse-resize; }
        .h-s { left: 50%; top: 100%; cursor: ns-resize; }
        .h-sw { left: 0; top: 100%; cursor: nesw-resize; }
        .h-w { left: 0; top: 50%; cursor: ew-resize; }
        .rotate {
          left: 50%;
          top: -22px;
          border-radius: 50%;
          cursor: grab;
        }
        .stem {
          position: absolute;
          left: 50%;
          top: -18px;
          width: 1px;
          height: 18px;
          background: var(--_mark);
        }
        .size {
          position: absolute;
          left: 50%;
          top: calc(100% + 10px);
          translate: -50% 0;
          padding: 2px 8px;
          border-radius: 999px;
          background: var(--st-signal-fill);
          color: var(--st-text-on-signal);
          font: 10.5px/1.5 var(--st-font-numeric, var(--st-font-mono));
          white-space: nowrap;
          pointer-events: none;
        }
        :host([width="0"]) .size {
          display: none;
        }
      `,
    ],
  },
);
