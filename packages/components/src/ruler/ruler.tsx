import { c, css, useEffect, useHost, useRef } from "atomico";
import { hostReset } from "../shared/styles.ts";

type RulerEl = HTMLElement & {
  orientation?: string;
  zoom?: number;
  offset?: number;
  marker?: number | null;
  rangeStart?: number | null;
  rangeEnd?: number | null;
  format?: string;
  fps?: number;
  valueAt(client: number): number;
};

/** Pick a label step (in units) so labels sit at least `minPx` apart. */
export function niceStep(zoom: number, minPx: number, format: string): number {
  const raw = minPx / zoom;
  const bases = format === "time" ? [1, 2, 5, 10, 15, 30, 60, 120, 300, 600, 900, 1800, 3600] : [1, 2, 5];
  if (format === "time" && raw <= 3600) {
    if (raw < 1) {
      const p = 10 ** Math.floor(Math.log10(raw));
      for (const m of [1, 2, 5, 10]) if (m * p >= raw) return m * p;
    }
    return bases.find((b) => b >= raw) ?? 3600;
  }
  const p = 10 ** Math.floor(Math.log10(raw));
  for (const m of [1, 2, 5, 10]) if (m * p >= raw) return m * p;
  return 10 * p;
}

function label(value: number, format: string, fps: number) {
  if (format === "time") {
    const sign = value < 0 ? "-" : "";
    const v = Math.abs(value);
    const m = Math.floor(v / 60);
    const s = v - m * 60;
    if (fps && v % 1)
      return `${sign}${m}:${String(Math.floor(s)).padStart(2, "0")}:${String(Math.round((s % 1) * fps)).padStart(2, "0")}`;
    return `${sign}${m}:${(s % 1 ? s.toFixed(1) : String(s)).padStart(2, "0")}`;
  }
  return String(Math.round(value * 1000) / 1000);
}

/**
 * Canvas ruler for image editors and timelines.
 * `zoom` = screen pixels per unit, `offset` = unit value at the ruler's start.
 * `format="time"` labels seconds as m:ss. `marker` draws the cursor position.
 *
 * <st-ruler zoom="1" offset="-40"></st-ruler>
 * <st-ruler orientation="vertical" zoom="2"></st-ruler>
 */
export const Ruler = c(
  ({ orientation, zoom, offset, marker, rangeStart, rangeEnd, format, fps }) => {
    const host = useHost<RulerEl>();
    const canvas = useRef<HTMLCanvasElement>();
    // The ResizeObserver keeps the first draw(); read the latest props through a ref.
    const latest = useRef({ orientation, zoom, offset, marker, rangeStart, rangeEnd, format, fps });
    latest.current = { orientation, zoom, offset, marker, rangeStart, rangeEnd, format, fps };

    const draw = () => {
      const { orientation, zoom, offset, marker, rangeStart, rangeEnd, format, fps } = latest.current;
      const vertical = orientation === "vertical";
      const cv = canvas.current;
      if (!cv) return;
      const el = host.current;
      const rect = el.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const length = vertical ? rect.height : rect.width;
      const thickness = vertical ? rect.width : rect.height;
      cv.width = Math.max(1, Math.round(rect.width * dpr));
      cv.height = Math.max(1, Math.round(rect.height * dpr));
      const ctx = cv.getContext("2d");
      if (!ctx) return;
      const style = getComputedStyle(el);
      const text = style.color;
      const line = style.borderBlockEndColor || text;
      const accent = style.getPropertyValue("--_marker").trim() || text;
      const range = style.getPropertyValue("--_range").trim() || "transparent";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (vertical) {
        // Draw as if horizontal, rotated: long axis = y.
        ctx.translate(thickness, 0);
        ctx.rotate(Math.PI / 2);
      }
      ctx.clearRect(0, 0, length, thickness);

      const z = zoom || 1;
      const start = offset ?? 0;
      const f = format ?? "number";
      const step = niceStep(z, 56, f);
      const minor =
        step / (f === "time" && step >= 60 ? 6 : step % 5 === 0 || String(step).endsWith("5") ? 5 : 10);
      const toPx = (v: number) => (v - start) * z;

      if (rangeStart != null && rangeEnd != null) {
        ctx.fillStyle = range;
        ctx.fillRect(toPx(Math.min(rangeStart, rangeEnd)), 0, Math.abs(rangeEnd - rangeStart) * z, thickness);
      }

      ctx.strokeStyle = line;
      ctx.fillStyle = text;
      ctx.lineWidth = 1;
      ctx.font = `${style.getPropertyValue("--_font-size").trim() || "10px"} ${style.fontFamily}`;
      ctx.textBaseline = "top";
      ctx.beginPath();
      const first = Math.floor(start / minor) * minor;
      const end = start + length / z;
      for (let v = first; v <= end; v += minor) {
        const x = Math.round(toPx(v)) + 0.5;
        const major = Math.abs(v / step - Math.round(v / step)) < 1e-6;
        const half = !major && Math.abs((v / step) * 2 - Math.round((v / step) * 2)) < 1e-6;
        const h = major ? thickness : half ? thickness * 0.4 : thickness * 0.22;
        ctx.moveTo(x, thickness);
        ctx.lineTo(x, thickness - h);
        if (major) ctx.fillText(label(Math.round(v / minor) * minor, f, fps ?? 0), x + 3, 2);
      }
      ctx.moveTo(0, thickness - 0.5);
      ctx.lineTo(length, thickness - 0.5);
      ctx.stroke();

      if (marker != null) {
        const x = Math.round(toPx(marker)) + 0.5;
        ctx.strokeStyle = accent;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, thickness);
        ctx.stroke();
      }
    };

    useEffect(() => {
      const el = host.current;
      el.valueAt = (client: number) => {
        const r = el.getBoundingClientRect();
        return (
          (el.offset ?? 0) + (client - (el.orientation === "vertical" ? r.top : r.left)) / (el.zoom || 1)
        );
      };
      const observer = new ResizeObserver(draw);
      observer.observe(el);
      // Colors come from tokens; a theme switch changes `color` and triggers this transition.
      el.addEventListener("transitionrun", draw);
      return () => {
        observer.disconnect();
        el.removeEventListener("transitionrun", draw);
      };
    }, []);

    useEffect(draw);

    return (
      <host shadowDom aria-hidden="true">
        <canvas ref={canvas} part="canvas" />
      </host>
    );
  },
  {
    props: {
      orientation: { type: String, reflect: true, value: (): "horizontal" | "vertical" => "horizontal" },
      zoom: { type: Number, reflect: true, value: () => 1 },
      offset: { type: Number, reflect: true, value: () => 0 },
      marker: { type: Number, reflect: true },
      rangeStart: { type: Number, reflect: true },
      rangeEnd: { type: Number, reflect: true },
      format: { type: String, reflect: true, value: (): "number" | "time" => "number" },
      fps: { type: Number, reflect: true },
    },
    styles: [
      hostReset,
      css`
        :host {
          --_font-size: 9px;
          --_marker: var(--st-border-focus);
          --_range: var(--st-gray-a4);
          display: block;
          position: relative;
          height: 20px;
          min-width: 0;
          overflow: hidden;
          background: var(--st-bg-panel);
          color: var(--st-text-muted);
          border-block-end-color: var(--st-border);
          font-family: var(--st-font-sans);
          user-select: none;
          transition: color 1ms;
        }
        :host([orientation="vertical"]) {
          width: 20px;
          height: auto;
          min-height: 0;
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
