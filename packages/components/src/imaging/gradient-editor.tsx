import { clamp, formatHex, parseColor, type Rgba } from "@station/behaviors";
import { c, css, type, useEffect, useHost, useProp, useRef, useState } from "atomico";
import type { GradientStop } from "../data-types.ts";
import { fire } from "../shared/events.ts";
import { hostReset } from "../shared/styles.ts";

export type { GradientStop };

type GradientEl = HTMLElement & { stops?: GradientStop[]; css: string; toCSS(angle?: number): string };

const DEFAULT: GradientStop[] = [
  { offset: 0, color: "#000000" },
  { offset: 1, color: "#ffffff" },
];
const sortStops = (s: GradientStop[]) => [...s].sort((a, b) => a.offset - b.offset);
const cssStops = (s: GradientStop[]) =>
  sortStops(s)
    .map((x) => `${x.color} ${+(x.offset * 100).toFixed(2)}%`)
    .join(", ");

/** Color at an offset, interpolated in sRGB (with alpha) between neighbouring stops. */
export function colorAt(stops: GradientStop[], t: number): string {
  const s = sortStops(stops);
  if (t <= s[0]!.offset) return s[0]!.color;
  for (let i = 0; i < s.length - 1; i++) {
    const a = s[i]!;
    const b = s[i + 1]!;
    if (t <= b.offset) {
      const k = (t - a.offset) / (b.offset - a.offset || 1);
      const ca = parseColor(a.color) ?? { r: 0, g: 0, b: 0, a: 1 };
      const cb = parseColor(b.color) ?? { r: 0, g: 0, b: 0, a: 1 };
      const mix = (x: number, y: number) => x + (y - x) * k;
      const out: Rgba = {
        r: mix(ca.r, cb.r),
        g: mix(ca.g, cb.g),
        b: mix(ca.b, cb.b),
        a: Math.round(mix(ca.a, cb.a) * 1000) / 1000,
      };
      return formatHex(out);
    }
  }
  return s[s.length - 1]!.color;
}

/**
 * Gradient stops editor. Click the bar to add a stop, drag stops to move,
 * drag a stop down (or press Delete) to remove it. The selected stop's color
 * and location are editable below.
 *
 * grad.stops = [{ offset: 0, color: "#ff0000" }, { offset: 1, color: "#0000ff" }]
 * grad.toCSS(90) → "linear-gradient(90deg, #ff0000 0%, #0000ff 100%)"
 */
export const GradientEditor = c(
  ({ label }) => {
    const host = useHost<GradientEl>();
    const [stops, setStops] = useProp<GradientStop[]>("stops");
    const [selected, setSelected] = useState(0);
    const bar = useRef<HTMLElement>();
    const drag = useRef<{ index: number; removing: boolean; startY: number } | null>(null);
    const list = stops?.length ? stops : DEFAULT;
    const sel = list[Math.min(selected, list.length - 1)]!;

    useEffect(() => {
      host.current.toCSS = (angle = 90) =>
        `linear-gradient(${angle}deg, ${cssStops(host.current.stops ?? DEFAULT)})`;
    }, []);
    useEffect(() =>
      host.current.style.setProperty("--_gradient", `linear-gradient(90deg, ${cssStops(list)})`),
    );

    const commit = (next: GradientStop[], done: boolean) => {
      setStops(next);
      fire(host.current, "input");
      if (done) fire(host.current, "change");
    };
    const offsetAt = (clientX: number) => {
      const r = bar.current!.getBoundingClientRect();
      return clamp((clientX - r.left) / r.width, 0, 1);
    };

    const handleKeys = (i: number) => (e: KeyboardEvent) => {
      const step = e.shiftKey ? 0.1 : 0.01;
      const s = list[i]!;
      const move = (to: number) => {
        e.preventDefault();
        const next = [...list];
        next[i] = { ...s, offset: Math.round(clamp(to, 0, 1) * 1000) / 1000 };
        commit(next, true);
      };
      if (e.key === "ArrowLeft" || e.key === "ArrowDown") move(s.offset - step);
      else if (e.key === "ArrowRight" || e.key === "ArrowUp") move(s.offset + step);
      else if (e.key === "Home") move(0);
      else if (e.key === "End") move(1);
      else if ((e.key === "Delete" || e.key === "Backspace") && list.length > 2) {
        e.preventDefault();
        commit(
          list.filter((_, j) => j !== i),
          true,
        );
        setSelected(Math.max(0, i - 1));
      }
    };

    return (
      <host shadowDom role="group" aria-label={label ?? "Gradient"}>
        <div class="track">
          <div
            ref={bar}
            class="bar checker"
            part="bar"
            onpointerdown={(e: PointerEvent) => {
              const t = offsetAt(e.clientX);
              const next = [...list, { offset: Math.round(t * 1000) / 1000, color: colorAt(list, t) }];
              commit(next, true);
              setSelected(next.length - 1);
            }}
          />
          <div class="stops">
            {list.map((s, i) => (
              <button
                type="button"
                class="stop"
                part="stop"
                role="slider"
                aria-label={`Stop ${i + 1}, ${s.color}`}
                aria-valuemin="0"
                aria-valuemax="100"
                aria-valuenow={String(Math.round(s.offset * 100))}
                data-selected={i === Math.min(selected, list.length - 1) ? "" : null}
                style={`left:${s.offset * 100}%;--_c:${s.color}`}
                onfocus={() => setSelected(i)}
                onkeydown={handleKeys(i)}
                onpointerdown={(e: PointerEvent) => {
                  setSelected(i);
                  (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
                  drag.current = { index: i, removing: false, startY: e.clientY };
                }}
                onpointermove={(e: PointerEvent) => {
                  const d = drag.current;
                  if (!d || d.index !== i) return;
                  d.removing = list.length > 2 && e.clientY - d.startY > 32;
                  host.current.toggleAttribute("data-removing", d.removing);
                  const next = [...list];
                  next[i] = { ...list[i]!, offset: Math.round(offsetAt(e.clientX) * 1000) / 1000 };
                  commit(next, false);
                }}
                onpointerup={() => {
                  const d = drag.current;
                  drag.current = null;
                  host.current.removeAttribute("data-removing");
                  if (!d) return;
                  if (d.removing) {
                    commit(
                      list.filter((_, j) => j !== d.index),
                      true,
                    );
                    setSelected(Math.max(0, d.index - 1));
                  } else fire(host.current, "change");
                }}
              >
                <span class="swatch" />
              </button>
            ))}
          </div>
        </div>
        <div class="fields">
          <st-color-field
            size="small"
            label="Stop color"
            value={sel.color}
            alpha
            oninput={(e: Event) => {
              e.stopPropagation();
              const next = [...list];
              next[Math.min(selected, list.length - 1)] = {
                ...sel,
                color: (e.target as HTMLElement & { value: string }).value,
              };
              commit(next, false);
            }}
            onchange={(e: Event) => {
              e.stopPropagation();
              fire(host.current, "change");
            }}
          />
          <st-number-field
            size="small"
            label="Stop location"
            abbr="Loc"
            unit="%"
            min={0}
            max={100}
            precision={1}
            value={Math.round(sel.offset * 1000) / 10}
            onchange={(e: Event) => {
              e.stopPropagation();
              const next = [...list];
              next[Math.min(selected, list.length - 1)] = {
                ...sel,
                offset: clamp((e.target as HTMLElement & { value: number }).value / 100, 0, 1),
              };
              commit(next, true);
            }}
            oninput={(e: Event) => e.stopPropagation()}
          />
        </div>
      </host>
    );
  },
  {
    props: {
      stops: type<GradientStop[]>(Array),
      label: { type: String, reflect: true },
    },
    styles: [
      hostReset,
      css`
        :host {
          display: flex;
          flex-direction: column;
          gap: var(--st-space-2);
          width: 240px;
          font-family: var(--st-font-sans);
        }
        .track {
          padding-inline: 6px;
        }
        .checker {
          background:
            var(--_gradient),
            repeating-conic-gradient(#ccc 0 25%, #fff 0 50%) 0 0 / 8px 8px;
        }
        .bar {
          height: 20px;
          border-radius: var(--st-radius-1);
          box-shadow: inset 0 0 0 1px var(--st-gray-a5);
          cursor: copy;
        }
        .stops {
          position: relative;
          height: 16px;
        }
        .stop {
          all: unset;
          position: absolute;
          top: 2px;
          width: 12px;
          height: 12px;
          margin-left: -6px;
          touch-action: none;
          cursor: ew-resize;
        }
        .stop::before {
          content: "";
          position: absolute;
          left: 3px;
          top: -5px;
          border: 3px solid transparent;
          border-bottom-color: var(--st-border-strong);
        }
        .swatch {
          display: block;
          width: 100%;
          height: 100%;
          border-radius: 2px;
          background: var(--_c);
          box-shadow:
            0 0 0 1px var(--st-bg-panel),
            0 0 0 2px var(--st-border-strong);
        }
        .stop[data-selected] .swatch {
          box-shadow:
            0 0 0 1px var(--st-bg-panel),
            0 0 0 2.5px var(--st-border-focus);
        }
        .stop[data-selected]::before {
          border-bottom-color: var(--st-border-focus);
        }
        .stop:focus-visible .swatch {
          box-shadow:
            0 0 0 1px var(--st-bg-panel),
            0 0 0 3px var(--st-border-focus);
        }
        :host([data-removing]) .stop[data-selected] {
          opacity: 0.3;
        }
        .fields {
          display: flex;
          gap: var(--st-space-1-5);
        }
        .fields st-color-field {
          flex: 1 1 0;
          width: auto;
          min-width: 0;
        }
        .fields st-number-field {
          flex: 0 0 84px;
          width: 84px;
        }
      `,
    ],
  },
);

Object.defineProperty(GradientEditor.prototype, "css", {
  get(this: GradientEl) {
    return this.toCSS?.(90) ?? "";
  },
});
