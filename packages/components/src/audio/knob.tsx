import { clamp, normalize, stepPrecision } from "@station/behaviors";
import { c, css, useEffect, useHost, useInternals, useProp, useRef } from "atomico";
import { fire } from "../shared/events.ts";
import { useFocusable } from "../shared/focusable.ts";
import { hostReset } from "../shared/styles.ts";

const SWEEP = 270;
const START = -135;

function arc(cx: number, cy: number, r: number, from: number, to: number) {
  const p = (deg: number) => {
    const rad = ((deg - 90) * Math.PI) / 180;
    return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)] as const;
  };
  const [x1, y1] = p(from);
  const [x2, y2] = p(to);
  const large = Math.abs(to - from) > 180 ? 1 : 0;
  const sweep = to > from ? 1 : 0;
  return `M${x1} ${y1}A${r} ${r} 0 ${large} ${sweep} ${x2} ${y2}`;
}

/**
 * Rotary control (DAWs, plugin UIs). Drag up/down, scroll, or use the keys.
 * Shift = fine. Double-click resets to `default`. `bipolar` fills from the center (pan, EQ gain).
 *
 * <st-knob label="Cutoff" value="440" min="20" max="20000" unit="Hz"></st-knob>
 * <st-knob label="Pan" value="0" min="-50" max="50" bipolar></st-knob>
 */
export const Knob = c(
  ({ min, max, step, label, unit, bipolar, disabled, showValue }) => {
    const host = useHost<HTMLElement & { value?: number; default?: number }>();
    const internals = useInternals();
    const [value, setValue] = useProp<number>("value");
    const drag = useRef<{ y: number; start: number } | null>(null);
    useFocusable(disabled);

    const lo = min ?? 0;
    const hi = max ?? 100;
    const s = step ?? (hi - lo) / 100;
    const v = clamp(value ?? (bipolar ? (lo + hi) / 2 : lo), lo, hi);
    const t = (v - lo) / (hi - lo || 1);
    const angle = START + t * SWEEP;
    const center = bipolar ? START + SWEEP / 2 : START;
    const digits = Math.min(2, stepPrecision(s));
    const text = `${Number(v.toFixed(digits))}${unit ?? ""}`;

    const set = (n: number, commit: boolean) => {
      const next = normalize(clamp(n, lo, hi), { step: 10 ** -Math.max(digits, 0) });
      if (next !== host.current.value) {
        setValue(next);
        fire(host.current, "input");
      }
      if (commit) fire(host.current, "change");
    };

    useEffect(() => {
      internals.role = "slider";
      internals.ariaLabel = label ?? null;
      internals.ariaValueMin = String(lo);
      internals.ariaValueMax = String(hi);
      internals.ariaValueNow = String(v);
      internals.ariaValueText = text;
      internals.ariaDisabled = disabled ? "true" : null;
    }, [label, lo, hi, v, text, disabled]);

    return (
      <host
        shadowDom
        onpointerdown={(e: PointerEvent) => {
          if (disabled || e.button !== 0) return;
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
          (host.current as HTMLElement).focus();
          drag.current = { y: e.clientY, start: v };
          e.preventDefault();
        }}
        onpointermove={(e: PointerEvent) => {
          const d = drag.current;
          if (!d) return;
          // 200px of travel covers the full range; Shift is 10× finer.
          const range = hi - lo;
          set(d.start + ((d.y - e.clientY) / 200) * range * (e.shiftKey ? 0.1 : 1), false);
        }}
        onpointerup={() => {
          if (!drag.current) return;
          drag.current = null;
          fire(host.current, "change");
        }}
        ondblclick={() => host.current.default != null && set(host.current.default, true)}
        onwheel={(e: WheelEvent) => {
          if (disabled || document.activeElement !== host.current) return;
          e.preventDefault();
          set(v - Math.sign(e.deltaY) * s * (e.shiftKey ? 1 : 5), true);
        }}
        onkeydown={(e: KeyboardEvent) => {
          const big = (hi - lo) / 10;
          const map: Record<string, number> = {
            ArrowUp: s,
            ArrowRight: s,
            ArrowDown: -s,
            ArrowLeft: -s,
            PageUp: big,
            PageDown: -big,
          };
          if (e.key in map) {
            e.preventDefault();
            set(v + map[e.key]! * (e.shiftKey ? 10 : 1), true);
          } else if (e.key === "Home") set(lo, true);
          else if (e.key === "End") set(hi, true);
        }}
      >
        <svg viewBox="0 0 40 40" part="dial" aria-hidden="true">
          <path class="track" d={arc(20, 20, 16, START, START + SWEEP)} />
          {Math.abs(angle - center) > 0.5 && (
            <path class="fill" d={arc(20, 20, 16, Math.min(center, angle), Math.max(center, angle))} />
          )}
          <circle class="body" cx="20" cy="20" r="11" />
          <line class="pointer" x1="20" y1="20" x2="20" y2="11" transform={`rotate(${angle} 20 20)`} />
        </svg>
        {showValue && <span class="value">{text}</span>}
        <span class="caption">
          <slot />
        </span>
      </host>
    );
  },
  {
    props: {
      value: { type: Number, reflect: false },
      min: { type: Number, reflect: true },
      max: { type: Number, reflect: true },
      step: { type: Number, reflect: true },
      default: { type: Number, reflect: true },
      label: { type: String, reflect: true },
      unit: { type: String, reflect: true },
      bipolar: { type: Boolean, reflect: true },
      showValue: { type: Boolean, reflect: true },
      size: { type: String, reflect: true },
      disabled: { type: Boolean, reflect: true },
    },
    styles: [
      hostReset,
      css`
        :host {
          --_size: 32px;
          display: inline-flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
          outline: none;
          touch-action: none;
          cursor: ns-resize;
          user-select: none;
          font-family: var(--st-font-sans);
        }
        :host([size="small"]) {
          --_size: 24px;
        }
        :host([size="large"]) {
          --_size: 44px;
        }
        svg {
          width: var(--_size);
          height: var(--_size);
          overflow: visible;
        }
        .track,
        .fill {
          fill: none;
          stroke-width: 3;
          stroke-linecap: round;
        }
        .track {
          stroke: var(--st-gray-a5);
        }
        .fill {
          stroke: var(--st-accent-solid);
        }
        .body {
          fill: var(--st-bg-section);
          stroke: var(--st-border);
          stroke-width: 1;
        }
        .pointer {
          stroke: var(--st-text-strong);
          stroke-width: 2;
          stroke-linecap: round;
        }
        :host(:focus-visible) .body {
          stroke: var(--st-border-focus);
          stroke-width: 1.5;
        }
        :host([disabled]) {
          opacity: 0.45;
          pointer-events: none;
        }
        .value {
          font-family: var(--st-font-numeric);
          font-size: calc(var(--st-text-1) - 1px);
          color: var(--st-text-strong);
          letter-spacing: -0.02em;
        }
        .caption {
          font-size: calc(var(--st-text-1) - 1px);
          color: var(--st-text-muted);
        }
        .caption:empty {
          display: none;
        }
      `,
    ],
  },
);
