import { c, css, type, useEffect, useHost, useRef } from "atomico";
import type { HistogramChannels } from "../data-types.ts";
import { hostReset } from "../shared/styles.ts";

export type { HistogramChannels };

/**
 * Canvas histogram. `bins` draws one channel; `channels` overlays red/green/blue.
 * `scale="log"` lifts small counts.
 *
 * hist.bins = luminanceCounts // e.g. 256 numbers
 */
export const Histogram = c(
  ({ bins, channels, scale, label }) => {
    const host = useHost();
    const canvas = useRef<HTMLCanvasElement>();
    // The ResizeObserver keeps the first draw(); read the latest props through a ref.
    const latest = useRef({ bins, channels, scale });
    latest.current = { bins, channels, scale };

    const draw = () => {
      const { bins, channels, scale } = latest.current;
      const cv = canvas.current;
      if (!cv) return;
      const el = host.current as HTMLElement;
      const rect = el.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      cv.width = Math.max(1, Math.round(rect.width * dpr));
      cv.height = Math.max(1, Math.round(rect.height * dpr));
      const ctx = cv.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, rect.width, rect.height);
      const style = getComputedStyle(el);
      const map = (v: number) => (scale === "log" ? Math.log1p(v) : v);

      const series: [number[], string][] = channels
        ? ([
            [channels.red ?? [], "rgb(239 68 68 / 0.55)"],
            [channels.green ?? [], "rgb(34 197 94 / 0.55)"],
            [channels.blue ?? [], "rgb(59 130 246 / 0.55)"],
          ] as [number[], string][])
        : [[bins ?? [], style.color]];
      const peak = Math.max(1e-9, ...series.flatMap(([d]) => d.map(map)));
      for (const [data, color] of series) {
        if (!data.length) continue;
        ctx.beginPath();
        ctx.moveTo(0, rect.height);
        data.forEach((v, i) => {
          ctx.lineTo((i / (data.length - 1)) * rect.width, rect.height - (map(v) / peak) * (rect.height - 2));
        });
        ctx.lineTo(rect.width, rect.height);
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();
      }
    };

    useEffect(() => {
      const el = host.current as HTMLElement;
      el.setAttribute("role", "img");
      const ro = new ResizeObserver(draw);
      ro.observe(el);
      el.addEventListener("transitionrun", draw);
      return () => {
        ro.disconnect();
        el.removeEventListener("transitionrun", draw);
      };
    }, []);
    useEffect(() => {
      (host.current as HTMLElement).setAttribute("aria-label", label ?? "Histogram");
      draw();
    });

    return (
      <host shadowDom>
        <canvas ref={canvas} part="canvas" />
      </host>
    );
  },
  {
    props: {
      bins: type<number[]>(Array),
      channels: type<HistogramChannels>(Object),
      scale: { type: String, reflect: true, value: (): "linear" | "log" => "linear" },
      label: { type: String, reflect: true },
    },
    styles: [
      hostReset,
      css`
        :host {
          display: block;
          position: relative;
          width: 232px;
          height: 80px;
          border-radius: var(--st-radius-2);
          background: var(--st-bg-well);
          box-shadow: inset 0 0 0 1px var(--st-border-subtle);
          color: var(--st-gray-a8);
          overflow: hidden;
          transition: color 1ms;
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
