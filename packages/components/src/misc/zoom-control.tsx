import { c, css, useHost, useProp, useRef } from "atomico";
import { fire } from "../shared/events.ts";
import { hostReset } from "../shared/styles.ts";

const PRESETS = [6.25, 12.5, 25, 33.33, 50, 66.67, 100, 150, 200, 300, 400, 800, 1600, 3200];
const fmt = (n: number) => `${Number(n.toFixed(n < 10 ? 2 : 1))}%`;

/**
 * Zoom for canvases and timelines: − / + step through presets, type a percentage,
 * or pick from the menu. "Fit" fires a `fit` event for the app to handle.
 *
 * <st-zoom-control value="66.67"></st-zoom-control>
 */
export const ZoomControl = c(
  ({ min, max, noFit }) => {
    const host = useHost<HTMLElement & { value?: number }>();
    const [value, setValue] = useProp<number>("value");
    const input = useRef<HTMLInputElement>();
    const lo = min ?? 1;
    const hi = max ?? 6400;
    const v = value ?? 100;

    const set = (n: number) => {
      const next = Math.min(hi, Math.max(lo, Math.round(n * 100) / 100));
      if (next !== host.current.value) {
        setValue(next);
        fire(host.current, "change", { value: next });
      }
      if (input.current) input.current.value = fmt(next);
    };
    const step = (dir: 1 | -1) => {
      const next =
        dir > 0 ? PRESETS.find((p) => p > v + 0.01) : [...PRESETS].reverse().find((p) => p < v - 0.01);
      set(next ?? (dir > 0 ? hi : lo));
    };

    return (
      <host shadowDom role="group" aria-label="Zoom">
        <button
          type="button"
          class="step"
          aria-label="Zoom out"
          title="Zoom out"
          disabled={v <= lo}
          onclick={() => step(-1)}
        >
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="M4 8h8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
          </svg>
        </button>
        <input
          ref={input}
          part="input"
          aria-label="Zoom level"
          value={fmt(v)}
          spellcheck={false}
          onfocus={(e: FocusEvent) => (e.target as HTMLInputElement).select()}
          onkeydown={(e: KeyboardEvent) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            if (e.key === "ArrowUp" || e.key === "ArrowDown") {
              e.preventDefault();
              step(e.key === "ArrowUp" ? 1 : -1);
            }
          }}
          onchange={(e: Event) => {
            e.stopPropagation();
            const n = Number.parseFloat((e.target as HTMLInputElement).value);
            if (Number.isFinite(n)) set(n);
            else (e.target as HTMLInputElement).value = fmt(v);
          }}
        />
        <button type="button" class="step" id="presets" aria-label="Zoom presets">
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path
              d="M5 7l3 3 3-3"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </button>
        <button
          type="button"
          class="step"
          aria-label="Zoom in"
          title="Zoom in"
          disabled={v >= hi}
          onclick={() => step(1)}
        >
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="M4 8h8M8 4v8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
          </svg>
        </button>
        <st-menu
          for="presets"
          placement="top-start"
          onselect={(e: CustomEvent<{ value: string }>) => {
            e.stopPropagation();
            const val = e.detail.value;
            if (val === "fit") fire(host.current, "fit");
            else if (val === "in") step(1);
            else if (val === "out") step(-1);
            else set(Number(val));
          }}
        >
          <st-menu-item value="in" shortcut="Mod+=">
            Zoom in
          </st-menu-item>
          <st-menu-item value="out" shortcut="Mod+-">
            Zoom out
          </st-menu-item>
          {!noFit && (
            <st-menu-item value="fit" shortcut="Mod+0">
              Fit
            </st-menu-item>
          )}
          <st-divider />
          {[25, 50, 100, 200, 400].map((p) => (
            <st-menu-item value={String(p)} type="radio" checked={Math.abs(v - p) < 0.01}>
              {`${p}%`}
            </st-menu-item>
          ))}
        </st-menu>
      </host>
    );
  },
  {
    props: {
      value: { type: Number, reflect: true },
      min: { type: Number, reflect: true },
      max: { type: Number, reflect: true },
      noFit: { type: Boolean, reflect: true },
      size: { type: String, reflect: true },
    },
    styles: [
      hostReset,
      css`
        :host {
          display: inline-flex;
          align-items: center;
          height: var(--st-control-height);
          border-radius: var(--st-radius-2);
          background: var(--st-bg-field);
          box-shadow: var(--st-field-edge);
          font-family: var(--st-font-sans);
          font-size: var(--st-control-font-size);
        }
        .step {
          all: unset;
          display: grid;
          place-items: center;
          width: calc(var(--st-control-height) - 4px);
          height: 100%;
          color: var(--st-text-muted);
          border-radius: var(--st-radius-2);
        }
        .step:hover:not([disabled]) {
          color: var(--st-text-strong);
          background: var(--st-bg-hover);
        }
        .step[disabled] {
          opacity: 0.4;
        }
        .step:focus-visible,
        input:focus-visible {
          outline: var(--st-focus-ring-width) solid var(--st-border-focus);
        }
        .step svg {
          width: 14px;
          height: 14px;
        }
        input {
          all: unset;
          width: 6ch;
          text-align: center;
          font-family: var(--st-font-numeric);
          letter-spacing: -0.02em;
          color: var(--st-text-strong);
          border-radius: var(--st-radius-1);
        }
      `,
    ],
  },
);
