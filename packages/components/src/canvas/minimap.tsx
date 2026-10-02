import { boundsOf } from "@station/behaviors";
import { c, css, useEffect, useHost, useRef } from "atomico";
import type { CanvasRect } from "../data-types.ts";
import { hostReset } from "../shared/styles.ts";
import type { ViewportEl } from "./viewport.tsx";

type Frame = { scale: number; ox: number; oy: number };

/**
 * Overview of an st-viewport: its objects and artboards, with the visible area
 * as a frame. Click or drag to move the view; arrow keys pan.
 *
 * <st-minimap for="canvas"></st-minimap>
 */
export const Minimap = c(
  ({ for: target, label }) => {
    const host = useHost<HTMLElement & { for?: string }>();
    const canvas = useRef<HTMLCanvasElement>();
    const frame = useRef<Frame>({ scale: 1, ox: 0, oy: 0 });
    const dragging = useRef(false);

    const vp = () => {
      const id = host.current.for;
      if (!id) return null;
      return (host.current.getRootNode() as Document | ShadowRoot).getElementById?.(id) as ViewportEl | null;
    };

    const draw = () => {
      const v = vp();
      const cv = canvas.current;
      if (!cv) return;
      const rect = host.current.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      cv.width = Math.max(1, Math.round(rect.width * dpr));
      cv.height = Math.max(1, Math.round(rect.height * dpr));
      const ctx = cv.getContext("2d");
      if (!ctx || !v?.viewRect) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const items = v.contentRects();
      const view = v.viewRect();
      const world = boundsOf([...items, view]) as CanvasRect;
      const pad = 6;
      const scale = Math.min(
        (rect.width - pad * 2) / Math.max(1, world.width),
        (rect.height - pad * 2) / Math.max(1, world.height),
      );
      const ox = pad + (rect.width - pad * 2 - world.width * scale) / 2 - world.x * scale;
      const oy = pad + (rect.height - pad * 2 - world.height * scale) / 2 - world.y * scale;
      frame.current = { scale, ox, oy };

      // Canvas can't parse light-dark() or var(); read resolved colors from swatch elements.
      const sw = host.current.shadowRoot!;
      const item = getComputedStyle(sw.querySelector(".c-item")!).color;
      const mark = getComputedStyle(sw.querySelector(".c-mark")!).color;
      ctx.fillStyle = item;
      for (const r of items) {
        ctx.fillRect(
          ox + r.x * scale,
          oy + r.y * scale,
          Math.max(1, r.width * scale),
          Math.max(1, r.height * scale),
        );
      }
      ctx.strokeStyle = mark;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(
        Math.round(ox + view.x * scale) + 0.75,
        Math.round(oy + view.y * scale) + 0.75,
        Math.max(2, view.width * scale - 1.5),
        Math.max(2, view.height * scale - 1.5),
      );
    };

    useEffect(() => {
      const h = host.current;
      const root = h.getRootNode();
      const onChange = (e: Event) => {
        if (e.target === vp()) draw();
      };
      root.addEventListener("viewchange", onChange);
      root.addEventListener("contentchange", onChange);
      const ro = new ResizeObserver(draw);
      ro.observe(h);
      const v = vp();
      if (v) ro.observe(v);
      // The viewport's methods appear after its first render.
      queueMicrotask(draw);
      requestAnimationFrame(draw);
      return () => {
        root.removeEventListener("viewchange", onChange);
        root.removeEventListener("contentchange", onChange);
        ro.disconnect();
      };
    }, [target]);

    /** Center the view on a minimap point. */
    const centerAt = (e: PointerEvent) => {
      const v = vp();
      if (!v?.viewRect) return;
      const r = host.current.getBoundingClientRect();
      const { scale, ox, oy } = frame.current;
      const view = v.viewRect();
      const dx = (e.clientX - r.left - ox) / scale;
      const dy = (e.clientY - r.top - oy) / scale;
      v.panBy(dx - view.width / 2 - view.x, dy - view.height / 2 - view.y);
    };

    return (
      <host
        shadowDom
        tabindex="0"
        role="group"
        aria-label={label ?? "Minimap"}
        aria-roledescription="minimap"
        onpointerdown={(e: PointerEvent) => {
          if (e.button !== 0) return;
          dragging.current = true;
          host.current.setPointerCapture(e.pointerId);
          centerAt(e);
        }}
        onpointermove={(e: PointerEvent) => dragging.current && centerAt(e)}
        onpointerup={() => (dragging.current = false)}
        onpointercancel={() => (dragging.current = false)}
        onkeydown={(e: KeyboardEvent) => {
          const v = vp();
          if (!v?.viewRect) return;
          const view = v.viewRect();
          const step = (e.shiftKey ? 0.5 : 0.1) * Math.max(view.width, view.height);
          const d: Record<string, [number, number]> = {
            ArrowLeft: [-step, 0],
            ArrowRight: [step, 0],
            ArrowUp: [0, -step],
            ArrowDown: [0, step],
          };
          const move = d[e.key];
          if (!move) return;
          e.preventDefault();
          v.panBy(move[0], move[1]);
        }}
      >
        <canvas ref={canvas} aria-hidden="true" />
        <i class="c-item" />
        <i class="c-mark" />
      </host>
    );
  },
  {
    props: {
      for: { type: String, reflect: true },
      label: { type: String, reflect: true },
    },
    styles: [
      hostReset,
      css`
        :host {
          --_item: light-dark(oklch(0% 0 0 / 0.16), oklch(100% 0 0 / 0.16));
          --_mark: var(--st-canvas-mark, var(--st-signal));
          position: relative;
          display: block;
          width: 180px;
          height: 120px;
          border-radius: var(--st-radius-3);
          background: var(--st-bg-panel);
          box-shadow: var(--st-card-edge, none), var(--st-shadow-floating);
          overflow: hidden;
          outline: none;
          cursor: pointer;
          touch-action: none;
        }
        :host(:focus-visible) {
          outline: var(--st-focus-ring-width) solid var(--st-border-focus);
          outline-offset: 1px;
        }
        .c-item,
        .c-mark {
          display: none;
        }
        .c-item {
          color: var(--_item);
        }
        .c-mark {
          color: var(--_mark);
        }
        canvas {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
        }
      `,
    ],
  },
);
