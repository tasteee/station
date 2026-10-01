import { type CurvePoint, clamp, linearCurve, monotoneSpline } from "@station/behaviors";
import { c, css, type, useEffect, useHost, useProp, useRef, useState } from "atomico";
import { fire } from "../shared/events.ts";
import { hostReset } from "../shared/styles.ts";

type CurveEl = HTMLElement & { points?: CurvePoint[]; interpolation?: string; evaluate(x: number): number };

const DEFAULT: CurvePoint[] = [
  { x: 0, y: 0 },
  { x: 1, y: 1 },
];
const SIZE = 256;
const REMOVE_DISTANCE = 0.12;
const sortPts = (pts: CurvePoint[]) => [...pts].sort((a, b) => a.x - b.x);
const fnFor = (pts: CurvePoint[], mode?: string) =>
  mode === "linear" ? linearCurve(pts) : monotoneSpline(pts);

/**
 * Curves editor (Photoshop Curves, animation easing, automation).
 * `points` are 0–1 on both axes. Click to add, drag to move, drag a middle
 * point off the graph (or press Delete) to remove it. PageUp/PageDown pick a
 * point, arrows nudge it.
 *
 * curves.points = [{ x: 0, y: 0 }, { x: 0.5, y: 0.6 }, { x: 1, y: 1 }]
 */
export const CurveEditor = c(
  ({ interpolation, histogram, color, label }) => {
    const host = useHost<CurveEl>();
    const [points, setPoints] = useProp<CurvePoint[]>("points");
    const [selected, setSelected] = useState(0);
    const svg = useRef<SVGSVGElement>();
    const drag = useRef<{ index: number; removing: boolean } | null>(null);

    const pts = sortPts(points?.length ? points : DEFAULT);
    // Handlers read live points: a fast click-then-drag can arrive before the next render.
    const live = () => sortPts(host.current.points?.length ? host.current.points : DEFAULT);
    const f = fnFor(pts, interpolation);

    useEffect(() => {
      host.current.evaluate = (x: number) =>
        clamp(fnFor(sortPts(host.current.points ?? DEFAULT), host.current.interpolation)(x), 0, 1);
    }, []);

    const commit = (next: CurvePoint[], done: boolean) => {
      setPoints(next);
      fire(host.current, "input");
      if (done) fire(host.current, "change");
    };

    const toUnit = (e: PointerEvent) => {
      const r = svg.current!.getBoundingClientRect();
      return { x: (e.clientX - r.left) / r.width, y: 1 - (e.clientY - r.top) / r.height };
    };

    const onpointerdown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      const u = toUnit(e);
      const hitRadius = 10 / svg.current!.getBoundingClientRect().width;
      let index = pts.findIndex((p) => Math.hypot(p.x - u.x, p.y - u.y) < hitRadius * 1.5);
      let next = pts;
      if (index < 0) {
        // Add on click; snap to the curve when the click is close to it.
        const onCurve = Math.abs(f(u.x) - u.y) < hitRadius * 2;
        const point = { x: clamp(u.x, 0, 1), y: clamp(onCurve ? f(u.x) : u.y, 0, 1) };
        next = sortPts([...pts, point]);
        index = next.indexOf(point);
        commit(next, false);
      }
      setSelected(index);
      drag.current = { index, removing: false };
      (e.currentTarget as Element).setPointerCapture(e.pointerId);
      (host.current as HTMLElement).focus({ preventScroll: true });
      e.preventDefault();
    };

    const onpointermove = (e: PointerEvent) => {
      const d = drag.current;
      if (!d) return;
      const u = toUnit(e);
      const list = [...live()];
      const isEnd = d.index === 0 || d.index === list.length - 1;
      const outside =
        u.x < -REMOVE_DISTANCE ||
        u.x > 1 + REMOVE_DISTANCE ||
        u.y < -REMOVE_DISTANCE ||
        u.y > 1 + REMOVE_DISTANCE;
      d.removing = !isEnd && outside;
      const lo = d.index > 0 ? list[d.index - 1]!.x + 0.005 : 0;
      const hi = d.index < list.length - 1 ? list[d.index + 1]!.x - 0.005 : 1;
      list[d.index] = { x: clamp(u.x, lo, hi), y: clamp(u.y, 0, 1) };
      host.current.toggleAttribute("data-removing", d.removing);
      commit(list, false);
    };

    const onpointerup = () => {
      const d = drag.current;
      if (!d) return;
      drag.current = null;
      host.current.removeAttribute("data-removing");
      if (d.removing) {
        commit(
          live().filter((_, i) => i !== d.index),
          true,
        );
        setSelected(Math.max(0, d.index - 1));
      } else fire(host.current, "change");
    };

    const onkeydown = (e: KeyboardEvent) => {
      const pts = live();
      const step = (e.shiftKey ? 10 : 1) / 255;
      const i = Math.min(selected, pts.length - 1);
      const p = pts[i]!;
      const lo = i > 0 ? pts[i - 1]!.x + 0.005 : 0;
      const hi = i < pts.length - 1 ? pts[i + 1]!.x - 0.005 : 1;
      const move = (dx: number, dy: number) => {
        e.preventDefault();
        const list = [...pts];
        list[i] = { x: clamp(p.x + dx, lo, hi), y: clamp(p.y + dy, 0, 1) };
        commit(list, true);
      };
      if (e.key === "ArrowLeft") move(-step, 0);
      else if (e.key === "ArrowRight") move(step, 0);
      else if (e.key === "ArrowUp") move(0, step);
      else if (e.key === "ArrowDown") move(0, -step);
      else if (e.key === "PageDown" || e.key === "PageUp") {
        e.preventDefault();
        setSelected((i + (e.key === "PageDown" ? 1 : -1) + pts.length) % pts.length);
      } else if ((e.key === "Delete" || e.key === "Backspace") && i > 0 && i < pts.length - 1) {
        e.preventDefault();
        commit(
          pts.filter((_, j) => j !== i),
          true,
        );
        setSelected(i - 1);
      }
    };

    // Curve path sampled across the width.
    let d = "";
    for (let s = 0; s <= 128; s++) {
      const x = s / 128;
      d += `${s ? "L" : "M"}${x * SIZE} ${(1 - clamp(f(x), 0, 1)) * SIZE}`;
    }
    const bins = histogram ?? [];
    const peak = Math.max(1, ...bins);
    let hist = "";
    if (bins.length) {
      hist = `M0 ${SIZE}`;
      bins.forEach((v, i) => {
        hist += `L${(i / (bins.length - 1)) * SIZE} ${SIZE - (v / peak) * SIZE * 0.9}`;
      });
      hist += `L${SIZE} ${SIZE}Z`;
    }
    const sel = pts[Math.min(selected, pts.length - 1)]!;

    return (
      <host
        shadowDom
        tabindex="0"
        role="application"
        aria-label={label ?? "Curve"}
        aria-roledescription="curve editor"
        aria-description={`Point ${Math.min(selected, pts.length - 1) + 1} of ${pts.length}: input ${Math.round(sel.x * 255)}, output ${Math.round(sel.y * 255)}`}
        onkeydown={onkeydown}
      >
        <svg
          aria-hidden="true"
          ref={svg}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          part="graph"
          onpointerdown={onpointerdown}
          onpointermove={onpointermove}
          onpointerup={onpointerup}
          onpointercancel={onpointerup}
        >
          {hist && <path class="histogram" d={hist} />}
          {[1, 2, 3].map((i) => (
            <>
              <line class="grid" x1={(SIZE / 4) * i} y1="0" x2={(SIZE / 4) * i} y2={SIZE} />
              <line class="grid" y1={(SIZE / 4) * i} x1="0" y2={(SIZE / 4) * i} x2={SIZE} />
            </>
          ))}
          <line class="baseline" x1="0" y1={SIZE} x2={SIZE} y2="0" />
          <path class="curve" d={d} style={color ? `stroke:${color}` : ""} />
          {pts.map((p, i) => (
            <rect
              class="point"
              data-selected={i === Math.min(selected, pts.length - 1) ? "" : null}
              x={p.x * SIZE - 4}
              y={(1 - p.y) * SIZE - 4}
              width="8"
              height="8"
            />
          ))}
        </svg>
        <div class="readout" part="readout">
          <span>
            Input <b>{Math.round(sel.x * 255)}</b>
          </span>
          <span>
            Output <b>{Math.round(sel.y * 255)}</b>
          </span>
        </div>
      </host>
    );
  },
  {
    props: {
      points: type<CurvePoint[]>(Array),
      histogram: type<number[]>(Array),
      interpolation: { type: String, reflect: true, value: (): "smooth" | "linear" => "smooth" },
      color: { type: String, reflect: true },
      label: { type: String, reflect: true },
    },
    styles: [
      hostReset,
      css`
        :host {
          display: flex;
          flex-direction: column;
          gap: var(--st-space-1-5);
          width: 232px;
          outline: none;
          font-family: var(--st-font-sans);
          font-size: var(--st-text-1);
          color: var(--st-text-muted);
        }
        svg {
          display: block;
          width: 100%;
          aspect-ratio: 1;
          border-radius: var(--st-radius-2);
          background: var(--st-bg-well);
          box-shadow: inset 0 0 0 1px var(--st-border-subtle);
          cursor: crosshair;
          touch-action: none;
          overflow: visible;
        }
        :host(:focus-visible) svg {
          box-shadow: inset 0 0 0 1px var(--st-border-subtle), 0 0 0 var(--st-focus-ring-width) var(--st-border-focus);
        }
        .histogram {
          fill: var(--st-gray-a5);
        }
        .grid {
          stroke: var(--st-border-subtle);
          stroke-width: 1;
          vector-effect: non-scaling-stroke;
        }
        .baseline {
          stroke: var(--st-border);
          stroke-dasharray: 3 3;
          vector-effect: non-scaling-stroke;
        }
        .curve {
          fill: none;
          stroke: var(--st-text-strong);
          stroke-width: 1.5;
          vector-effect: non-scaling-stroke;
        }
        .point {
          fill: var(--st-bg-panel);
          stroke: var(--st-text-strong);
          stroke-width: 1.25;
          vector-effect: non-scaling-stroke;
        }
        .point[data-selected] {
          fill: var(--st-text-strong);
        }
        :host([data-removing]) .point[data-selected] {
          opacity: 0.3;
        }
        .readout {
          display: flex;
          gap: var(--st-space-3);
        }
        .readout b {
          font-family: var(--st-font-numeric);
          font-weight: var(--st-weight-normal);
          color: var(--st-text-strong);
        }
      `,
    ],
  },
);
