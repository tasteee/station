import { boundsOf, clamp, gridLines, intersects, rectLines, snapRect } from "@station/behaviors";
import { c, css, type, useEffect, useHost, useRef, useState } from "atomico";
import type { CanvasGuide, CanvasObject, CanvasRect, CanvasView } from "../data-types.ts";
import "../define/ruler.ts";
import { fire } from "../shared/events.ts";
import { hostReset } from "../shared/styles.ts";

export type { CanvasGuide, CanvasObject, CanvasRect, CanvasView };

export type ViewportEl = HTMLElement & {
  zoom: number;
  x: number;
  y: number;
  minZoom?: number;
  maxZoom?: number;
  objects?: CanvasObject[];
  guides?: CanvasGuide[];
  gridSize?: number;
  snap?: boolean;
  snapGrid?: boolean;
  marquee?: boolean;
  tool?: string;
  autosave?: string;
  rulers?: boolean;
  fit(rect?: CanvasRect, padding?: number): void;
  zoomTo(zoom: number, clientX?: number, clientY?: number): void;
  panBy(dx: number, dy: number): void;
  toDocument(clientX: number, clientY: number): { x: number; y: number };
  toClient(x: number, y: number): { x: number; y: number };
  contentBounds(): CanvasRect | null;
  /** Objects plus st-artboard children, in document coordinates. */
  contentRects(): CanvasObject[];
  /** The visible area, in document coordinates. */
  viewRect(): CanvasRect;
  snapRect(rect: CanvasRect, exclude?: string[]): CanvasRect;
  clearSnapLines(): void;
};

type Drag =
  | { kind: "pan"; startX: number; startY: number; viewX: number; viewY: number }
  | { kind: "marquee"; ox: number; oy: number; add: boolean; moved: boolean }
  | { kind: "guide"; id: string; axis: "x" | "y"; isNew: boolean };

const RULER = 20;
const SNAP_PX = 6;
let guideSeq = 0;

const isTyping = (e: Event) => {
  const t = e.composedPath()[0] as HTMLElement | undefined;
  return !!t && (t.isContentEditable || /^(input|textarea|select)$/i.test(t.tagName));
};

/** Artboards inside the viewport, as rects. */
const artboardRects = (el: HTMLElement): CanvasObject[] =>
  [...el.querySelectorAll(":scope > st-artboard")].map((a, i) => ({
    id: a.id || `artboard-${i}`,
    x: Number(a.getAttribute("x") ?? 0),
    y: Number(a.getAttribute("y") ?? 0),
    width: Number(a.getAttribute("width") ?? 0),
    height: Number(a.getAttribute("height") ?? 0),
  }));

/**
 * Pan-and-zoom canvas surface. Children are placed in document coordinates;
 * `slot="overlay"` children (transform boxes, measurements) draw in screen space
 * and read the view from --st-view-zoom / --st-view-x / --st-view-y.
 *
 * Pan: wheel / two-finger scroll, Space-drag, middle-drag, or tool="hand".
 * Zoom: Mod/Ctrl + wheel or pinch (toward the cursor), + / −, Shift+0 (100%), Shift+1 (fit).
 * Guides: drag out of a ruler; drag back onto it to delete.
 *
 * <st-viewport rulers grid="dots" snap marquee>
 *   <st-artboard x="0" y="0" width="1440" height="900" label="Desktop">…</st-artboard>
 *   <st-transform-box slot="overlay" x="40" y="40" width="200" height="120"></st-transform-box>
 * </st-viewport>
 */
export const Viewport = c(
  ({ rulers, grid, label, tool, marquee, objects, guides: guidesProp }) => {
    const host = useHost<ViewportEl>();
    const stage = useRef<HTMLDivElement>();
    const rulerX = useRef<HTMLElement & Record<string, unknown>>();
    const rulerY = useRef<HTMLElement & Record<string, unknown>>();
    const drag = useRef<Drag | null>(null);
    const space = useRef(false);
    const hover = useRef(false);
    const [guides, setGuidesState] = useState<CanvasGuide[]>([]);
    const guidesRef = useRef<CanvasGuide[]>([]);
    const [snapLines, setSnapLines] = useState<{ axis: "x" | "y"; position: number }[]>([]);
    const [box, setBoxState] = useState<CanvasRect | null>(null);
    const boxRef = useRef<CanvasRect | null>(null);
    const setBox = (r: CanvasRect | null) => {
      boxRef.current = r;
      setBoxState(r);
    };
    const [panning, setPanning] = useState(false);

    const el = () => host.current;
    const view = (): CanvasView => ({ zoom: el().zoom || 1, x: el().x || 0, y: el().y || 0 });
    const stageRect = () => stage.current?.getBoundingClientRect() ?? new DOMRect();
    const limits = () => [el().minZoom ?? 0.01, el().maxZoom ?? 64] as const;

    /** Push the view into CSS variables and rulers. No re-render: panning stays cheap. */
    const paint = () => {
      const { zoom, x, y } = view();
      const s = el().style;
      s.setProperty("--st-view-zoom", String(zoom));
      s.setProperty("--st-view-x", String(x));
      s.setProperty("--st-view-y", String(y));
      // Grid spacing doubles until it is at least 8 screen px.
      let step = (el().gridSize || 8) * zoom;
      while (step < 8) step *= 2;
      s.setProperty("--_grid-step", `${step}px`);
      if (rulerX.current) Object.assign(rulerX.current, { zoom, offset: x });
      if (rulerY.current) Object.assign(rulerY.current, { zoom, offset: y });
    };

    const save = () => {
      const key = el().autosave;
      if (!key) return;
      try {
        localStorage.setItem(`st-viewport:${key}`, JSON.stringify({ ...view(), guides: guidesRef.current }));
      } catch {}
    };

    const setView = (next: Partial<CanvasView>) => {
      const [lo, hi] = limits();
      const cur = view();
      const zoom = clamp(next.zoom ?? cur.zoom, lo, hi);
      const x = next.x ?? cur.x;
      const y = next.y ?? cur.y;
      if (zoom === cur.zoom && x === cur.x && y === cur.y) return;
      Object.assign(el(), { zoom, x, y });
      paint();
      fire(el(), "viewchange", { zoom, x, y });
      save();
    };

    const toDocument = (cx: number, cy: number) => {
      const r = stageRect();
      const { zoom, x, y } = view();
      return { x: x + (cx - r.left) / zoom, y: y + (cy - r.top) / zoom };
    };
    const toClient = (dx: number, dy: number) => {
      const r = stageRect();
      const { zoom, x, y } = view();
      return { x: r.left + (dx - x) * zoom, y: r.top + (dy - y) * zoom };
    };
    const zoomTo = (zoom: number, cx?: number, cy?: number) => {
      const r = stageRect();
      const px = cx ?? r.left + r.width / 2;
      const py = cy ?? r.top + r.height / 2;
      const [lo, hi] = limits();
      const z = clamp(zoom, lo, hi);
      const p = toDocument(px, py);
      setView({ zoom: z, x: p.x - (px - r.left) / z, y: p.y - (py - r.top) / z });
    };
    const contentRects = () => [...(el().objects ?? []), ...artboardRects(el())];
    const contentBounds = () => boundsOf(contentRects());
    const viewRect = () => {
      const r = stageRect();
      const { zoom, x, y } = view();
      return { x, y, width: r.width / zoom, height: r.height / zoom };
    };
    const fit = (rect?: CanvasRect, padding = 48) => {
      const r = stageRect();
      const target = rect ?? contentBounds();
      if (!target || !r.width || !r.height) {
        setView({ zoom: 1, x: 0, y: 0 });
        return;
      }
      const [lo, hi] = limits();
      const zoom = clamp(
        Math.min(
          (r.width - padding * 2) / Math.max(1, target.width),
          (r.height - padding * 2) / Math.max(1, target.height),
        ),
        lo,
        hi,
      );
      setView({
        zoom,
        x: target.x - (r.width / zoom - target.width) / 2,
        y: target.y - (r.height / zoom - target.height) / 2,
      });
    };

    const setGuides = (next: CanvasGuide[]) => {
      guidesRef.current = next;
      setGuidesState(next);
      el().guides = next;
      fire(el(), "guidechange", { guides: next });
      save();
    };

    const snap = (rect: CanvasRect, exclude: string[] = []) => {
      const { zoom } = view();
      const others = contentRects().filter((o) => !exclude.includes(o.id));
      const lines = rectLines(others);
      for (const g of guidesRef.current) (g.axis === "x" ? lines.x : lines.y).push(g.position);
      if (el().snapGrid) {
        const size = el().gridSize || 8;
        lines.x.push(...gridLines(rect.x - size, rect.x + rect.width + size, size));
        lines.y.push(...gridLines(rect.y - size, rect.y + rect.height + size, size));
      }
      const hit = snapRect(rect, lines, SNAP_PX / zoom);
      const drawn: { axis: "x" | "y"; position: number }[] = [];
      if (hit.x != null) drawn.push({ axis: "x", position: hit.x });
      if (hit.y != null) drawn.push({ axis: "y", position: hit.y });
      setSnapLines(drawn);
      return { ...rect, x: rect.x + hit.dx, y: rect.y + hit.dy };
    };

    // ---- public API + restore ----
    useEffect(() => {
      const h = el();
      Object.assign(h, {
        fit,
        zoomTo,
        toDocument,
        toClient,
        contentBounds,
        contentRects,
        viewRect,
        panBy: (dx: number, dy: number) => setView({ x: view().x + dx, y: view().y + dy }),
        snapRect: (rect: CanvasRect, exclude?: string[]) => (h.snap ? snap(rect, exclude) : rect),
        clearSnapLines: () => setSnapLines([]),
      });
      if (h.autosave) {
        try {
          const saved = JSON.parse(localStorage.getItem(`st-viewport:${h.autosave}`) ?? "null");
          if (saved) {
            Object.assign(h, { zoom: saved.zoom, x: saved.x, y: saved.y });
            if (Array.isArray(saved.guides)) {
              guidesRef.current = saved.guides;
              setGuidesState(saved.guides);
              h.guides = saved.guides;
            }
          }
        } catch {}
      }
      if (!guidesRef.current.length && h.guides?.length) {
        guidesRef.current = h.guides;
        setGuidesState(h.guides);
      }
      paint();
      // Artboards/objects changed: tell minimaps.
      const mo = new MutationObserver((records) => {
        if (records.some((r) => r.target !== h)) fire(h, "contentchange");
      });
      mo.observe(h, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["x", "y", "width", "height"],
      });
      // Space-to-pan while the pointer is over the canvas (or it has focus).
      const onKey = (e: KeyboardEvent) => {
        if (e.key !== " " || isTyping(e)) return;
        if (!hover.current && !h.matches(":focus-within")) return;
        const down = e.type === "keydown";
        if (down) e.preventDefault();
        if (space.current !== down) {
          space.current = down;
          h.toggleAttribute("data-space", down);
        }
      };
      addEventListener("keydown", onKey);
      addEventListener("keyup", onKey);
      return () => {
        mo.disconnect();
        removeEventListener("keydown", onKey);
        removeEventListener("keyup", onKey);
      };
    }, []);

    // Re-apply when view attributes change from outside.
    useEffect(paint);

    // Guides set by the app.
    useEffect(() => {
      if (guidesProp && guidesProp !== guidesRef.current) {
        guidesRef.current = guidesProp;
        setGuidesState(guidesProp);
      }
    }, [guidesProp]);

    // New objects from the app also count as content changes.
    const firstObjects = useRef(true);
    useEffect(() => {
      if (firstObjects.current) firstObjects.current = false;
      else fire(el(), "contentchange");
    }, [objects]);

    const sync = (e: PointerEvent) => {
      const p = toDocument(e.clientX, e.clientY);
      if (rulerX.current) rulerX.current.marker = p.x;
      if (rulerY.current) rulerY.current.marker = p.y;
      return p;
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const { zoom, x, y } = view();
      if (e.ctrlKey || e.metaKey) {
        // Pinch arrives as ctrl+wheel with small deltas; mouse wheels are larger. Same curve for both.
        zoomTo(zoom * Math.exp(-e.deltaY * 0.0025 * (e.deltaMode === 1 ? 33 : 1)), e.clientX, e.clientY);
      } else {
        const dx = e.shiftKey && !e.deltaX ? e.deltaY : e.deltaX;
        const dy = e.shiftKey && !e.deltaX ? 0 : e.deltaY;
        setView({ x: x + dx / zoom, y: y + dy / zoom });
      }
    };

    const onPointerDown = (e: PointerEvent) => {
      const h = el();
      const own = (e.composedPath()[0] as Node | undefined)?.getRootNode() === h.shadowRoot;
      if (e.button === 1 || (e.button === 0 && (space.current || tool === "hand"))) {
        e.preventDefault();
        h.focus({ preventScroll: true, focusVisible: false } as FocusOptions);
        stage.current!.setPointerCapture(e.pointerId);
        drag.current = {
          kind: "pan",
          startX: e.clientX,
          startY: e.clientY,
          viewX: view().x,
          viewY: view().y,
        };
        setPanning(true);
        return;
      }
      if (e.button !== 0 || !own) return;
      h.focus({ preventScroll: true, focusVisible: false } as FocusOptions);
      if (!marquee) return;
      const p = toDocument(e.clientX, e.clientY);
      stage.current!.setPointerCapture(e.pointerId);
      drag.current = { kind: "marquee", ox: p.x, oy: p.y, add: e.shiftKey, moved: false };
    };

    const marqueeIds = (r: CanvasRect) =>
      (el().objects ?? []).filter((o) => intersects(o, r)).map((o) => o.id);

    const onPointerMove = (e: PointerEvent) => {
      const p = sync(e);
      const d = drag.current;
      if (!d) return;
      if (d.kind === "pan") {
        const { zoom } = view();
        setView({ x: d.viewX - (e.clientX - d.startX) / zoom, y: d.viewY - (e.clientY - d.startY) / zoom });
      } else if (d.kind === "marquee") {
        const r = {
          x: Math.min(d.ox, p.x),
          y: Math.min(d.oy, p.y),
          width: Math.abs(p.x - d.ox),
          height: Math.abs(p.y - d.oy),
        };
        if (!d.moved && r.width * view().zoom < 3 && r.height * view().zoom < 3) return;
        d.moved = true;
        setBox(r);
        fire(el(), "marquee", { ...r, ids: marqueeIds(r) });
      } else if (d.kind === "guide") {
        const pos = Math.round(d.axis === "x" ? p.x : p.y);
        setGuides(guidesRef.current.map((g) => (g.id === d.id ? { ...g, position: pos } : g)));
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      const d = drag.current;
      drag.current = null;
      if (!d) return;
      if (d.kind === "pan") setPanning(false);
      if (d.kind === "marquee") {
        const r = boxRef.current;
        setBox(null);
        fire(el(), "select", { ids: d.moved && r ? marqueeIds(r) : [], add: d.add });
      }
      if (d.kind === "guide") {
        // Dropped back on its ruler: delete it.
        const r = stageRect();
        const onRuler = d.axis === "y" ? e.clientY < r.top : e.clientX < r.left;
        if (onRuler) setGuides(guidesRef.current.filter((g) => g.id !== d.id));
      }
    };

    const startGuide = (axis: "x" | "y", e: PointerEvent, existing?: CanvasGuide) => {
      if (e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      stage.current!.setPointerCapture(e.pointerId);
      const p = toDocument(e.clientX, e.clientY);
      let id = existing?.id;
      if (!id) {
        id = `guide-${++guideSeq}-${Date.now().toString(36)}`;
        setGuides([...guidesRef.current, { id, axis, position: Math.round(axis === "x" ? p.x : p.y) }]);
      }
      drag.current = { kind: "guide", id, axis, isNew: !existing };
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (isTyping(e)) return;
      const { zoom, x, y } = view();
      const step = 40 / zoom;
      if (e.key === "+" || e.key === "=") zoomTo(zoom * 1.25);
      else if (e.key === "-" || e.key === "_") zoomTo(zoom / 1.25);
      else if (e.shiftKey && (e.key === ")" || e.code === "Digit0")) zoomTo(1);
      else if (e.shiftKey && (e.key === "!" || e.code === "Digit1")) fit();
      else if (e.key === "ArrowLeft") setView({ x: x - step });
      else if (e.key === "ArrowRight") setView({ x: x + step });
      else if (e.key === "ArrowUp") setView({ y: y - step });
      else if (e.key === "ArrowDown") setView({ y: y + step });
      else return;
      e.preventDefault();
    };

    return (
      <host
        shadowDom
        tabindex="0"
        role="region"
        aria-label={label ?? "Canvas"}
        aria-roledescription="canvas"
        data-rulers={rulers ? "" : null}
        data-panning={panning ? "" : null}
        onkeydown={onKeyDown}
        onpointerenter={() => (hover.current = true)}
        onpointerleave={() => (hover.current = false)}
      >
        {rulers && [
          <div class="corner" part="corner" />,
          <st-ruler
            ref={rulerX}
            class="ruler-x"
            part="ruler"
            onpointerdown={(e: PointerEvent) => startGuide("y", e)}
          />,
          <st-ruler
            ref={rulerY}
            class="ruler-y"
            part="ruler"
            orientation="vertical"
            onpointerdown={(e: PointerEvent) => startGuide("x", e)}
          />,
        ]}
        <div
          ref={stage}
          class="stage"
          data-grid={grid && grid !== "none" ? grid : null}
          onwheel={onWheel}
          onpointerdown={onPointerDown}
          onpointermove={onPointerMove}
          onpointerup={onPointerUp}
          onpointercancel={onPointerUp}
        >
          <div class="grid" part="grid" />
          <div class="world" part="world">
            <slot />
          </div>
          <div class="marks">
            {guides.map((g) => (
              <div
                class={`guide guide-${g.axis}`}
                style={`--_p:${g.position}`}
                data-id={g.id}
                onpointerdown={(e: PointerEvent) => startGuide(g.axis, e, g)}
              />
            ))}
            {snapLines.map((s) => (
              <div class={`snap snap-${s.axis}`} style={`--_p:${s.position}`} />
            ))}
            {box && (
              <div
                class="marquee"
                part="marquee"
                style={`--_x:${box.x};--_y:${box.y};--_w:${box.width};--_h:${box.height}`}
              />
            )}
          </div>
          <div class="overlay">
            <slot name="overlay" />
          </div>
        </div>
      </host>
    );
  },
  {
    props: {
      // Not reflected: they change on every pan frame.
      zoom: { type: Number, value: () => 1 },
      x: { type: Number, value: () => 0 },
      y: { type: Number, value: () => 0 },
      minZoom: { type: Number, reflect: true },
      maxZoom: { type: Number, reflect: true },
      rulers: { type: Boolean, reflect: true },
      grid: { type: String, reflect: true },
      gridSize: { type: Number, reflect: true },
      snap: { type: Boolean, reflect: true },
      snapGrid: { type: Boolean, reflect: true },
      marquee: { type: Boolean, reflect: true },
      tool: { type: String, reflect: true },
      autosave: { type: String, reflect: true },
      label: { type: String, reflect: true },
      objects: type<CanvasObject[]>(Array),
      guides: type<CanvasGuide[]>(Array),
    },
    styles: [
      hostReset,
      css`
        :host {
          --st-canvas-mark: var(--st-signal);
          --_ruler: ${RULER}px;
          position: relative;
          display: grid;
          grid-template: 1fr / 1fr;
          min-width: 0;
          min-height: 0;
          overflow: hidden;
          background: var(--st-bg-canvas);
          outline: none;
          contain: strict;
        }
        :host([data-rulers]) {
          grid-template: var(--_ruler) 1fr / var(--_ruler) 1fr;
        }
        :host(:focus-visible) {
          box-shadow: inset 0 0 0 var(--st-focus-ring-width) var(--st-border-focus);
        }
        .corner {
          grid-area: 1 / 1;
          background: var(--st-bg-panel);
          border-right: 1px solid var(--st-border-subtle);
          border-bottom: 1px solid var(--st-border-subtle);
          z-index: 2;
        }
        .ruler-x {
          grid-area: 1 / 2;
          height: var(--_ruler);
          z-index: 2;
          cursor: s-resize;
        }
        .ruler-y {
          grid-area: 2 / 1;
          width: var(--_ruler);
          z-index: 2;
          cursor: e-resize;
        }
        .stage {
          position: relative;
          grid-area: 1 / 1;
          overflow: hidden;
          touch-action: none;
        }
        :host([data-rulers]) .stage {
          grid-area: 2 / 2;
        }
        :host([tool="hand"]) .stage,
        :host([data-space]) .stage {
          cursor: grab;
        }
        :host([data-panning]) .stage {
          cursor: grabbing;
        }
        .grid {
          position: absolute;
          inset: 0;
          pointer-events: none;
          --_off-x: calc(var(--st-view-x, 0) * var(--st-view-zoom, 1) * -1px);
          --_off-y: calc(var(--st-view-y, 0) * var(--st-view-zoom, 1) * -1px);
          --_dot: light-dark(oklch(0% 0 0 / 0.14), oklch(100% 0 0 / 0.1));
          background-size: var(--_grid-step, 8px) var(--_grid-step, 8px);
          background-position: var(--_off-x) var(--_off-y);
        }
        .stage[data-grid="dots"] .grid {
          background-image: radial-gradient(circle at 0.75px 0.75px, var(--_dot) 0.75px, transparent 1px);
        }
        .stage[data-grid="lines"] .grid {
          background-image:
            linear-gradient(to right, var(--_dot) 1px, transparent 1px),
            linear-gradient(to bottom, var(--_dot) 1px, transparent 1px);
        }
        .world {
          position: absolute;
          top: 0;
          left: 0;
          width: 0;
          height: 0;
          transform-origin: 0 0;
          transform: scale(var(--st-view-zoom, 1))
            translate(calc(var(--st-view-x, 0) * -1px), calc(var(--st-view-y, 0) * -1px));
        }
        .marks,
        .overlay {
          position: absolute;
          inset: 0;
          pointer-events: none;
        }
        .overlay ::slotted(*) {
          pointer-events: auto;
        }
        /* Guides and snap lines: 1px marks with a halo so they read on any artwork. */
        .guide,
        .snap {
          position: absolute;
          background: var(--st-canvas-mark);
          box-shadow: 0 0 0 0.5px light-dark(oklch(100% 0 0 / 0.6), oklch(0% 0 0 / 0.6));
        }
        .guide-x,
        .snap-x {
          top: 0;
          bottom: 0;
          width: 1px;
          left: calc((var(--_p) - var(--st-view-x, 0)) * var(--st-view-zoom, 1) * 1px);
        }
        .guide-y,
        .snap-y {
          left: 0;
          right: 0;
          height: 1px;
          top: calc((var(--_p) - var(--st-view-y, 0)) * var(--st-view-zoom, 1) * 1px);
        }
        .guide {
          pointer-events: auto;
        }
        .guide-x {
          cursor: ew-resize;
        }
        .guide-y {
          cursor: ns-resize;
        }
        /* Wider grab area than the 1px line. */
        .guide::before {
          content: "";
          position: absolute;
          inset: -3px;
        }
        .snap {
          opacity: 0.9;
        }
        .snap-x {
          background: repeating-linear-gradient(to bottom, var(--st-canvas-mark) 0 4px, transparent 4px 7px);
        }
        .snap-y {
          background: repeating-linear-gradient(to right, var(--st-canvas-mark) 0 4px, transparent 4px 7px);
        }
        .marquee {
          position: absolute;
          left: calc((var(--_x) - var(--st-view-x, 0)) * var(--st-view-zoom, 1) * 1px);
          top: calc((var(--_y) - var(--st-view-y, 0)) * var(--st-view-zoom, 1) * 1px);
          width: calc(var(--_w) * var(--st-view-zoom, 1) * 1px);
          height: calc(var(--_h) * var(--st-view-zoom, 1) * 1px);
          border: 1px solid var(--st-canvas-mark);
          background: color-mix(in oklch, var(--st-canvas-mark) 8%, transparent);
        }
      `,
    ],
  },
);
