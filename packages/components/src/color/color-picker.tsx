import { formatHex, type Hsva, hsvToRgb, isLight, parseColor, rgbToHsv } from "@station/behaviors";
import { c, css, useEffect, useHost, useRef, useState } from "atomico";
import { fire } from "../shared/events.ts";
import { hostReset } from "../shared/styles.ts";

type PickerEl = HTMLElement & { value?: string; alpha?: boolean };
type Mode = "hex" | "rgb" | "hsb";

const round = (n: number) => Math.round(n);

/** Pointer drag reporting fractions (0–1) of the element's box. */
function drag(e: PointerEvent, onMove: (x: number, y: number) => void, onEnd: () => void) {
  const el = e.currentTarget as HTMLElement;
  if (e.button !== 0) return;
  el.setPointerCapture(e.pointerId);
  el.focus({ preventScroll: true });
  const report = (ev: PointerEvent) => {
    const r = el.getBoundingClientRect();
    onMove(
      Math.min(1, Math.max(0, (ev.clientX - r.left) / r.width)),
      Math.min(1, Math.max(0, (ev.clientY - r.top) / r.height)),
    );
  };
  report(e);
  const move = (ev: PointerEvent) => report(ev);
  const up = () => {
    el.removeEventListener("pointermove", move);
    el.removeEventListener("pointerup", up);
    el.removeEventListener("pointercancel", up);
    onEnd();
  };
  el.addEventListener("pointermove", move);
  el.addEventListener("pointerup", up);
  el.addEventListener("pointercancel", up);
  e.preventDefault();
}

/**
 * Color picker: saturation/brightness area, hue and alpha strips, eyedropper,
 * and HEX / RGB / HSB fields. `value` is a hex string (#rrggbb or #rrggbbaa).
 *
 * <st-color-picker value="#3366cc" alpha></st-color-picker>
 */
export const ColorPicker = c(
  ({ value, alpha }) => {
    const host = useHost<PickerEl>();
    const hsv = useRef<Hsva>(rgbToHsv(parseColor(value ?? "") ?? { r: 51, g: 102, b: 204, a: 1 }));
    const [, rerender] = useState(0);
    const [mode, setMode] = useState<Mode>("hex");

    // External value changes (not our own echo) reset the HSV state.
    useEffect(() => {
      const rgb = parseColor(value ?? "");
      if (rgb && formatHex(rgb) !== formatHex(hsvToRgb(hsv.current))) {
        const next = rgbToHsv(rgb);
        // Keep hue when the new color has none (grays), so the area doesn't jump.
        if (next.s === 0 || next.v === 0) next.h = hsv.current.h;
        hsv.current = next;
        rerender((n) => n + 1);
      }
    }, [value]);

    const set = (patch: Partial<Hsva>, commit: boolean) => {
      hsv.current = { ...hsv.current, ...patch };
      if (!alpha) hsv.current.a = 1;
      const hex = formatHex(hsvToRgb(hsv.current));
      rerender((n) => n + 1);
      if (hex !== host.current.value) {
        host.current.value = hex;
        fire(host.current, "input");
      }
      if (commit) fire(host.current, "change");
    };

    const { h, s, v, a } = hsv.current;
    const rgb = hsvToRgb(hsv.current);
    const hex = formatHex(rgb);
    const opaque = formatHex({ ...rgb, a: 1 }, false);

    useEffect(() => {
      const st = host.current.style;
      st.setProperty("--_hue", `hsl(${h} 100% 50%)`);
      st.setProperty("--_color", hex);
      st.setProperty("--_opaque", opaque);
    });

    const areaKeys = (e: KeyboardEvent) => {
      const step = e.shiftKey ? 0.1 : 0.01;
      const map: Record<string, Partial<Hsva>> = {
        ArrowLeft: { s: Math.max(0, s - step) },
        ArrowRight: { s: Math.min(1, s + step) },
        ArrowUp: { v: Math.min(1, v + step) },
        ArrowDown: { v: Math.max(0, v - step) },
      };
      if (map[e.key]) {
        e.preventDefault();
        set(map[e.key]!, true);
      }
    };
    const stripKeys = (key: "h" | "a", max: number, step: number) => (e: KeyboardEvent) => {
      const current = key === "h" ? h : a;
      const big = e.shiftKey ? 10 : 1;
      let next: number | null = null;
      if (e.key === "ArrowRight" || e.key === "ArrowUp") next = current + step * big;
      if (e.key === "ArrowLeft" || e.key === "ArrowDown") next = current - step * big;
      if (e.key === "Home") next = 0;
      if (e.key === "End") next = max;
      if (next === null) return;
      e.preventDefault();
      set({ [key]: Math.min(max, Math.max(0, next)) }, true);
    };

    const eyedropper = async () => {
      const Dropper = (
        window as unknown as { EyeDropper?: new () => { open(): Promise<{ sRGBHex: string }> } }
      ).EyeDropper;
      if (!Dropper) return;
      try {
        const { sRGBHex } = await new Dropper().open();
        const picked = parseColor(sRGBHex);
        if (picked) set({ ...rgbToHsv(picked), a: hsv.current.a }, true);
      } catch {}
    };

    const numberField = (
      label: string,
      abbr: string,
      val: number,
      max: number,
      onValue: (n: number) => void,
      unit = "",
    ) => (
      <st-number-field
        size="small"
        label={label}
        abbr={abbr || undefined}
        value={val}
        min={0}
        max={max}
        step={1}
        precision={0}
        unit={unit || undefined}
        oninput={(e: Event) => onValue((e.target as HTMLElement & { value: number }).value)}
        onchange={(e: Event) => {
          e.stopPropagation();
          fire(host.current, "change");
        }}
      />
    );

    return (
      <host shadowDom>
        <div
          class="area"
          part="area"
          tabindex="0"
          role="slider"
          aria-label="Saturation and brightness"
          aria-valuemin="0"
          aria-valuemax="100"
          aria-valuenow={String(round(s * 100))}
          aria-valuetext={`Saturation ${round(s * 100)}%, brightness ${round(v * 100)}%`}
          onpointerdown={(e: PointerEvent) =>
            drag(
              e,
              (x, y) => set({ s: x, v: 1 - y }, false),
              () => fire(host.current, "change"),
            )
          }
          onkeydown={areaKeys}
        >
          <span
            class="cursor"
            data-light={isLight(rgb) ? "" : null}
            style={`left:${s * 100}%;top:${(1 - v) * 100}%`}
          />
        </div>

        <div class="controls">
          {"EyeDropper" in window && (
            <button
              type="button"
              class="dropper"
              aria-label="Pick a color from the screen"
              onclick={eyedropper}
            >
              <svg viewBox="0 0 16 16" aria-hidden="true">
                <path
                  d="M10.5 2.5l3 3-1.5 1.5-.8-.8-5.9 5.9H3.6v-1.7l5.9-5.9-.8-.8z"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.3"
                  stroke-linejoin="round"
                />
              </svg>
            </button>
          )}
          <span class="preview checker" aria-hidden="true" />
          <div class="strips">
            <div
              class="strip hue"
              part="hue"
              tabindex="0"
              role="slider"
              aria-label="Hue"
              aria-valuemin="0"
              aria-valuemax="360"
              aria-valuenow={String(round(h))}
              onpointerdown={(e: PointerEvent) =>
                drag(
                  e,
                  (x) => set({ h: x * 360 }, false),
                  () => fire(host.current, "change"),
                )
              }
              onkeydown={stripKeys("h", 360, 1)}
            >
              <span class="thumb" style={`left:${(h / 360) * 100}%;background:var(--_hue)`} />
            </div>
            {alpha && (
              <div
                class="strip alpha"
                part="alpha"
                tabindex="0"
                role="slider"
                aria-label="Opacity"
                aria-valuemin="0"
                aria-valuemax="100"
                aria-valuenow={String(round(a * 100))}
                onpointerdown={(e: PointerEvent) =>
                  drag(
                    e,
                    (x) => set({ a: Math.round(x * 100) / 100 }, false),
                    () => fire(host.current, "change"),
                  )
                }
                onkeydown={stripKeys("a", 1, 0.01)}
              >
                <span class="alpha-fill" />
                <span class="thumb checker" style={`left:${a * 100}%`} />
              </div>
            )}
          </div>
        </div>

        <div class="fields">
          <st-select
            size="small"
            class="mode"
            label="Color format"
            value={mode}
            onchange={(e: Event) => {
              e.stopPropagation();
              setMode((e.target as HTMLElement & { value: Mode }).value);
            }}
          >
            <st-option value="hex">HEX</st-option>
            <st-option value="rgb">RGB</st-option>
            <st-option value="hsb">HSB</st-option>
          </st-select>
          {mode === "hex" && (
            <st-text-field
              size="small"
              class="hex"
              label="Hex color"
              value={opaque.slice(1).toUpperCase()}
              onchange={(e: Event) => {
                e.stopPropagation();
                const parsed = parseColor((e.target as HTMLElement & { value: string }).value);
                if (parsed) set({ ...rgbToHsv(parsed), a: hsv.current.a }, true);
                else rerender((n) => n + 1);
              }}
            />
          )}
          {mode === "rgb" && [
            numberField("Red", "R", rgb.r, 255, (n) =>
              set(rgbToHsv({ ...hsvToRgb(hsv.current), r: n }), false),
            ),
            numberField("Green", "G", rgb.g, 255, (n) =>
              set(rgbToHsv({ ...hsvToRgb(hsv.current), g: n }), false),
            ),
            numberField("Blue", "B", rgb.b, 255, (n) =>
              set(rgbToHsv({ ...hsvToRgb(hsv.current), b: n }), false),
            ),
          ]}
          {mode === "hsb" && [
            numberField("Hue", "H", round(h), 360, (n) => set({ h: n }, false), "°"),
            numberField("Saturation", "S", round(s * 100), 100, (n) => set({ s: n / 100 }, false)),
            numberField("Brightness", "B", round(v * 100), 100, (n) => set({ v: n / 100 }, false)),
          ]}
          {alpha && numberField("Opacity", "", round(a * 100), 100, (n) => set({ a: n / 100 }, false), "%")}
        </div>
      </host>
    );
  },
  {
    props: {
      value: { type: String, reflect: true },
      alpha: { type: Boolean, reflect: true },
    },
    styles: [
      hostReset,
      css`
        .checker {
          background:
            linear-gradient(var(--_color), var(--_color)),
            repeating-conic-gradient(#ccc 0 25%, #fff 0 50%) 0 0 / 8px 8px;
        }
        :host {
          display: flex;
          flex-direction: column;
          gap: var(--st-space-2);
          width: 232px;
          font-family: var(--st-font-sans);
          --st-control-height: var(--st-control-small);
          --st-control-font-size: var(--st-text-1);
        }
        .area {
          position: relative;
          height: 160px;
          border-radius: var(--st-radius-2);
          background:
            linear-gradient(to top, #000, transparent),
            linear-gradient(to right, #fff, transparent),
            var(--_hue);
          box-shadow: inset 0 0 0 1px var(--st-gray-a4);
          cursor: crosshair;
          touch-action: none;
          outline: none;
        }
        .cursor {
          position: absolute;
          width: 12px;
          height: 12px;
          margin: -6px 0 0 -6px;
          border-radius: 50%;
          box-shadow:
            0 0 0 2px #fff,
            0 0 0 3px rgb(0 0 0 / 0.3),
            inset 0 0 0 1px rgb(0 0 0 / 0.3);
          pointer-events: none;
        }
        .area:focus-visible .cursor {
          box-shadow:
            0 0 0 2px #fff,
            0 0 0 4px var(--st-border-focus);
        }
        .controls {
          display: flex;
          align-items: center;
          gap: var(--st-space-2);
        }
        .dropper {
          all: unset;
          display: grid;
          place-items: center;
          flex: none;
          width: 24px;
          height: 24px;
          border-radius: var(--st-radius-2);
          color: var(--st-text-muted);
        }
        .dropper:hover {
          background: var(--st-bg-hover);
          color: var(--st-text-strong);
        }
        .dropper:focus-visible {
          outline: var(--st-focus-ring-width) solid var(--st-border-focus);
        }
        .dropper svg {
          width: 16px;
          height: 16px;
        }
        .preview {
          flex: none;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          box-shadow: inset 0 0 0 1px var(--st-gray-a5);
        }
        .strips {
          display: flex;
          flex-direction: column;
          gap: var(--st-space-2);
          flex: 1;
        }
        .strip {
          position: relative;
          height: 10px;
          border-radius: var(--st-radius-full);
          box-shadow: inset 0 0 0 1px var(--st-gray-a4);
          touch-action: none;
          outline: none;
        }
        .hue {
          background: linear-gradient(to right, #f00, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00);
        }
        .alpha {
          background: repeating-conic-gradient(#ccc 0 25%, #fff 0 50%) 0 0 / 8px 8px;
        }
        .alpha-fill {
          position: absolute;
          inset: 0;
          border-radius: inherit;
          background: linear-gradient(to right, transparent, var(--_opaque));
        }
        .thumb {
          position: absolute;
          top: 50%;
          width: 12px;
          height: 12px;
          margin: -6px 0 0 -6px;
          border-radius: 50%;
          box-shadow:
            0 0 0 2px #fff,
            0 0 0 3px rgb(0 0 0 / 0.25);
          pointer-events: none;
        }
        .strip:focus-visible .thumb {
          box-shadow:
            0 0 0 2px #fff,
            0 0 0 4px var(--st-border-focus);
        }
        .fields {
          display: flex;
          gap: var(--st-space-1);
        }
        .fields > * {
          flex: 1 1 0;
          min-width: 0;
          width: auto;
        }
        .fields .mode {
          flex: 0 0 64px;
        }
        .fields .hex {
          flex: 2 1 0;
          font-family: var(--st-font-numeric);
        }
      `,
    ],
  },
);
