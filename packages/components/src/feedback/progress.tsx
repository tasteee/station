import { c, css, useEffect, useInternals } from "atomico";
import { Spinner as SpinnerGlyph } from "../shared/glyphs.tsx";
import { hostReset } from "../shared/styles.ts";

/**
 * Linear progress. Omit `value` for an indeterminate bar.
 * <st-progress label="Exporting" value="40"></st-progress>
 */
export const Progress = c(
  ({ value, max, label }) => {
    const internals = useInternals();
    const total = max ?? 100;
    const known = value != null && !Number.isNaN(value);
    const pct = known ? Math.min(100, Math.max(0, (value! / total) * 100)) : 0;
    useEffect(() => {
      internals.role = "progressbar";
      internals.ariaLabel = label ?? null;
      internals.ariaValueMin = "0";
      internals.ariaValueMax = String(total);
      internals.ariaValueNow = known ? String(value) : null;
    }, [value, total, label]);
    return (
      <host shadowDom data-indeterminate={known ? null : ""}>
        <span class="fill" part="fill" style={known ? `width:${pct}%` : ""} />
      </host>
    );
  },
  {
    props: {
      value: { type: Number, reflect: true },
      max: { type: Number, reflect: true },
      label: { type: String, reflect: true },
      tone: { type: String, reflect: true },
    },
    styles: [
      hostReset,
      css`
        :host {
          --_fill: var(--st-accent-solid);
          display: block;
          position: relative;
          width: 100%;
          height: 4px;
          overflow: hidden;
          border-radius: var(--st-radius-full);
          background: var(--st-gray-a4);
        }
        :host([tone="success"]) {
          --_fill: var(--st-success-solid);
        }
        :host([tone="danger"]) {
          --_fill: var(--st-danger-solid);
        }
        .fill {
          position: absolute;
          inset-block: 0;
          inset-inline-start: 0;
          border-radius: inherit;
          background: var(--_fill);
          transition: width var(--st-duration) var(--st-ease);
        }
        :host([data-indeterminate]) .fill {
          width: 35%;
          animation: slide 1.2s var(--st-ease) infinite;
        }
        @keyframes slide {
          from {
            translate: -100% 0;
          }
          to {
            translate: 300% 0;
          }
        }
      `,
    ],
  },
);

/** Loading spinner, sized by --st-icon-size. <st-spinner label="Loading layers"></st-spinner> */
export const Spinner = c(
  ({ label }) => {
    const internals = useInternals();
    useEffect(() => {
      internals.role = "status";
      internals.ariaLabel = label ?? "Loading";
    }, [label]);
    return (
      <host shadowDom>
        <SpinnerGlyph />
      </host>
    );
  },
  {
    props: { label: { type: String, reflect: true } },
    styles: [
      hostReset,
      css`
        :host {
          display: inline-grid;
          flex: none;
          width: var(--st-icon-size, 16px);
          height: var(--st-icon-size, 16px);
          color: var(--st-text-muted);
        }
        svg {
          width: 100%;
          height: 100%;
          animation: spin 0.7s linear infinite;
        }
        @keyframes spin {
          to {
            rotate: 1turn;
          }
        }
      `,
    ],
  },
);
