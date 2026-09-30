import { clamp } from "@station/behaviors";
import { c, css, useEffect, useInternals } from "atomico";
import { hostReset } from "../shared/styles.ts";

/**
 * Level meter. Units are yours (dB by default: -60 to +6). Colors change at
 * `warn` and `danger`. `peak` draws a hold line.
 *
 * <st-meter value="-12" peak="-6"></st-meter>
 * <st-meter orientation="horizontal" value="0.4" min="0" max="1" warn="0.7" danger="0.9"></st-meter>
 */
export const Meter = c(
  ({ value, peak, min, max, warn, danger, label }) => {
    const internals = useInternals();
    const lo = min ?? -60;
    const hi = max ?? 6;
    const pct = (n: number) => ((clamp(n, lo, hi) - lo) / (hi - lo)) * 100;
    const level = value == null ? 0 : pct(value);
    const w = pct(warn ?? -12);
    const d = pct(danger ?? -3);

    useEffect(() => {
      internals.role = "meter";
      internals.ariaLabel = label ?? null;
      internals.ariaValueMin = String(lo);
      internals.ariaValueMax = String(hi);
      internals.ariaValueNow = value == null ? null : String(value);
    }, [label, lo, hi, value]);

    return (
      <host shadowDom>
        <span class="track" part="track" style={`--_w:${w}%;--_d:${d}%`}>
          <span class="level" part="level" style={`--_level:${level}%`} />
          {peak != null && (
            <span
              class="peak"
              data-hot={peak >= (danger ?? -3) ? "" : null}
              style={`--_peak:${pct(peak)}%`}
            />
          )}
        </span>
      </host>
    );
  },
  {
    props: {
      value: { type: Number, reflect: false },
      peak: { type: Number, reflect: false },
      min: { type: Number, reflect: true },
      max: { type: Number, reflect: true },
      warn: { type: Number, reflect: true },
      danger: { type: Number, reflect: true },
      label: { type: String, reflect: true },
      orientation: { type: String, reflect: true, value: (): "vertical" | "horizontal" => "vertical" },
    },
    styles: [
      hostReset,
      css`
        :host {
          display: inline-block;
          width: 6px;
          height: 120px;
          flex: none;
        }
        :host([orientation="horizontal"]) {
          width: 120px;
          height: 6px;
        }
        .track {
          position: relative;
          display: block;
          width: 100%;
          height: 100%;
          overflow: hidden;
          border-radius: 1px;
          background: var(--st-gray-a3);
          --_ok: var(--st-success-9);
          --_warn: var(--st-warning-9);
          --_hot: var(--st-danger-9);
          --_dir: to top;
        }
        :host([orientation="horizontal"]) .track {
          --_dir: to right;
        }
        /* The level reveals a fixed gradient, so colors sit at fixed thresholds. */
        .level {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            var(--_dir),
            var(--_ok) 0 var(--_w),
            var(--_warn) var(--_w) var(--_d),
            var(--_hot) var(--_d) 100%
          );
          clip-path: inset(calc(100% - var(--_level)) 0 0 0);
        }
        :host([orientation="horizontal"]) .level {
          clip-path: inset(0 calc(100% - var(--_level)) 0 0);
        }
        .peak {
          position: absolute;
          left: 0;
          right: 0;
          bottom: var(--_peak);
          height: 2px;
          margin-bottom: -1px;
          background: var(--st-text-strong);
        }
        .peak[data-hot] {
          background: var(--_hot);
        }
        :host([orientation="horizontal"]) .peak {
          top: 0;
          bottom: 0;
          left: var(--_peak);
          right: auto;
          width: 2px;
          height: auto;
          margin: 0 0 0 -1px;
        }
      `,
    ],
  },
);
