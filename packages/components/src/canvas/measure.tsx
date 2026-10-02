import { c, css, useEffect, useHost } from "atomico";
import { hostReset } from "../shared/styles.ts";

/**
 * A distance line between two document points, for an st-viewport overlay
 * (Alt-hover spacing, red-line specs). Ends are ticked; the label shows the
 * distance in document units unless `label` overrides it.
 *
 * <st-measure slot="overlay" x1="120" y1="80" x2="320" y2="80"></st-measure>
 */
export const Measure = c(
  ({ x1, y1, x2, y2, label }) => {
    const host = useHost();
    const ax = x1 ?? 0;
    const ay = y1 ?? 0;
    const dx = (x2 ?? 0) - ax;
    const dy = (y2 ?? 0) - ay;
    const length = Math.hypot(dx, dy);
    const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
    const text = label ?? String(Math.round(length * 100) / 100);

    useEffect(() => {
      const s = host.current.style;
      s.setProperty("--_x", String(ax));
      s.setProperty("--_y", String(ay));
      s.setProperty("--_len", String(length));
      s.setProperty("--_a", `${angle}deg`);
      s.setProperty("--_mx", String(ax + dx / 2));
      s.setProperty("--_my", String(ay + dy / 2));
    }, [ax, ay, dx, dy]);

    return (
      <host shadowDom role="img" aria-label={`Distance ${text}`}>
        <div class="line" part="line" />
        <span class="label" part="label">
          {text}
        </span>
      </host>
    );
  },
  {
    props: {
      x1: { type: Number, reflect: true },
      y1: { type: Number, reflect: true },
      x2: { type: Number, reflect: true },
      y2: { type: Number, reflect: true },
      label: { type: String, reflect: true },
    },
    styles: [
      hostReset,
      css`
        :host {
          --_zoom: var(--st-view-zoom, 1);
          --_mark: var(--st-canvas-measure, var(--st-canvas-mark, var(--st-signal)));
          position: absolute;
          inset: 0 auto auto 0;
          width: 0;
          height: 0;
        }
        .line,
        .label {
          position: absolute;
          pointer-events: none;
        }
        .line {
          left: calc((var(--_x) - var(--st-view-x, 0)) * var(--_zoom) * 1px);
          top: calc((var(--_y) - var(--st-view-y, 0)) * var(--_zoom) * 1px);
          width: calc(var(--_len) * var(--_zoom) * 1px);
          height: 1px;
          margin-top: -0.5px;
          background: var(--_mark);
          transform-origin: 0 50%;
          rotate: var(--_a);
        }
        /* End ticks. */
        .line::before,
        .line::after {
          content: "";
          position: absolute;
          top: -4px;
          width: 1px;
          height: 9px;
          background: var(--_mark);
        }
        .line::before {
          left: 0;
        }
        .line::after {
          right: 0;
        }
        .label {
          left: calc((var(--_mx) - var(--st-view-x, 0)) * var(--_zoom) * 1px);
          top: calc((var(--_my) - var(--st-view-y, 0)) * var(--_zoom) * 1px);
          translate: -50% -50%;
          padding: 1px 6px;
          border-radius: 999px;
          background: var(--_mark);
          color: var(--st-text-on-signal);
          font: 10.5px/1.5 var(--st-font-numeric, var(--st-font-mono));
          white-space: nowrap;
        }
      `,
    ],
  },
);
