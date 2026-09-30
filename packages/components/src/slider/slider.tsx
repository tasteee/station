import { clamp, normalize } from "@station/behaviors";
import { c, css, useEffect, useHost, useInternals, useRef } from "atomico";
import { fire } from "../shared/events.ts";
import { controlBase, hostReset } from "../shared/styles.ts";

type Thumb = "start" | "end";

const styles = css`
  :host {
    display: inline-flex;
    align-items: center;
    position: relative;
    width: 160px;
    height: var(--_height);
    min-width: 48px;
    touch-action: none;
    cursor: default;
    --_thumb: calc(var(--st-icon-size) - 4px);
  }
  :host(:focus-visible) {
    outline: none;
  }
  .track {
    position: absolute;
    inset-inline: calc(var(--_thumb) / 2);
    height: 4px;
    border-radius: var(--st-radius-full);
    background: var(--st-gray-a5);
  }
  .fill {
    position: absolute;
    top: 0;
    bottom: 0;
    border-radius: inherit;
    background: var(--st-accent-solid);
  }
  .thumb {
    position: absolute;
    top: 50%;
    width: var(--_thumb);
    height: var(--_thumb);
    margin-inline-start: calc(var(--_thumb) / -2);
    translate: 0 -50%;
    border-radius: 50%;
    background: var(--st-gray-1);
    box-shadow:
      0 0 0 1px var(--st-border-strong),
      0 1px 2px var(--st-gray-a6);
    outline: none;
    transition: scale var(--st-duration-fast) var(--st-ease);
  }
  .thumb:hover,
  :host([data-dragging]) .thumb[data-dragging] {
    scale: 1.15;
  }
  .thumb:focus-visible {
    outline: var(--st-focus-ring-width) solid var(--st-border-focus);
    outline-offset: var(--st-focus-ring-offset);
  }
`;

function createSlider(range: boolean) {
  return c(
    (props) => {
      const { min, max, step, disabled, label, name } = props;
      // The single and range variants declare different props, so read them loosely.
      const { value, start, end } = props as { value?: number; start?: number; end?: number };
      const host = useHost<HTMLElement & { value?: number; start?: number; end?: number }>();
      const internals = useInternals();
      const track = useRef<HTMLElement>();
      const dragging = useRef<Thumb | null>(null);

      const lo = min ?? 0;
      const hi = max ?? 100;
      const s = step ?? 1;
      const values: Record<Thumb, number> = range
        ? { start: clamp(start ?? lo, lo, hi), end: clamp(end ?? hi, lo, hi) }
        : { start: lo, end: clamp(value ?? lo, lo, hi) };
      const pct = (n: number) => ((n - lo) / (hi - lo || 1)) * 100;

      const set = (thumb: Thumb, raw: number, commit: boolean) => {
        let n = normalize(Math.round((raw - lo) / s) * s + lo, { min: lo, max: hi, step: s });
        if (range) n = thumb === "start" ? Math.min(n, values.end) : Math.max(n, values.start);
        const current = range ? values[thumb] : values.end;
        if (n !== current) {
          if (!range) host.current.value = n;
          else if (thumb === "start") host.current.start = n;
          else host.current.end = n;
          fire(host.current, "input");
          if (commit) fire(host.current, "change");
        }
      };

      const valueAt = (clientX: number) => {
        const rect = track.current!.getBoundingClientRect();
        const rtl = getComputedStyle(host.current).direction === "rtl";
        let ratio = (clientX - rect.left) / rect.width;
        if (rtl) ratio = 1 - ratio;
        return lo + clamp(ratio, 0, 1) * (hi - lo);
      };

      useEffect(() => {
        internals.role = range ? "group" : null;
        internals.ariaLabel = range ? (label ?? null) : null;
        if (range) {
          const data = new FormData();
          if (name) {
            data.append(name, String(values.start));
            data.append(name, String(values.end));
          }
          internals.setFormValue(data);
        } else internals.setFormValue(String(values.end));
      }, [values.start, values.end, label, name]);

      const onpointerdown = (e: PointerEvent) => {
        if (disabled || e.button !== 0) return;
        const v = valueAt(e.clientX);
        const thumb: Thumb =
          range && Math.abs(v - values.start) < Math.abs(v - values.end)
            ? "start"
            : range && v < values.start
              ? "start"
              : "end";
        dragging.current = thumb;
        (host.current as HTMLElement).setPointerCapture(e.pointerId);
        (host.current as HTMLElement).dataset.dragging = "";
        set(thumb, v, false);
        (
          host.current.shadowRoot!.querySelector(`.thumb[data-thumb="${thumb}"]`) as HTMLElement | null
        )?.focus();
        e.preventDefault();
      };
      const onpointermove = (e: PointerEvent) => {
        if (dragging.current) set(dragging.current, valueAt(e.clientX), false);
      };
      const onpointerup = () => {
        if (!dragging.current) return;
        dragging.current = null;
        delete (host.current as HTMLElement).dataset.dragging;
        fire(host.current, "change");
      };

      const onkeydown = (thumb: Thumb) => (e: KeyboardEvent) => {
        const big = Math.max(s, (hi - lo) / 10);
        const current = values[thumb];
        const rtl = getComputedStyle(host.current).direction === "rtl";
        const map: Record<string, number> = {
          ArrowRight: rtl ? -s : s,
          ArrowUp: s,
          ArrowLeft: rtl ? s : -s,
          ArrowDown: -s,
          PageUp: big,
          PageDown: -big,
        };
        let next: number | undefined;
        if (e.key in map) next = current + map[e.key]! * (e.shiftKey ? 10 : 1);
        else if (e.key === "Home") next = lo;
        else if (e.key === "End") next = hi;
        if (next === undefined) return;
        e.preventDefault();
        set(thumb, next, true);
      };

      const thumb = (which: Thumb, thumbLabel: string | undefined) => (
        <span
          class="thumb"
          part="thumb"
          data-thumb={which}
          data-dragging={dragging.current === which ? "" : null}
          role="slider"
          tabindex={disabled ? null : "0"}
          aria-label={thumbLabel}
          aria-valuemin={String(range && which === "end" ? values.start : lo)}
          aria-valuemax={String(range && which === "start" ? values.end : hi)}
          aria-valuenow={String(values[which])}
          aria-disabled={disabled ? "true" : null}
          style={`inset-inline-start:${pct(values[which])}%`}
          onkeydown={onkeydown(which)}
        />
      );

      return (
        <host
          shadowDom={{ delegatesFocus: true }}
          onpointerdown={onpointerdown}
          onpointermove={onpointermove}
          onpointerup={onpointerup}
          onpointercancel={onpointerup}
        >
          <span class="track" ref={track} part="track">
            <span
              class="fill"
              part="fill"
              style={`inset-inline-start:${range ? pct(values.start) : 0}%;inset-inline-end:${100 - pct(values.end)}%`}
            />
            {range && thumb("start", label ? `${label} minimum` : "Minimum")}
            {thumb("end", range ? (label ? `${label} maximum` : "Maximum") : label)}
          </span>
        </host>
      );
    },
    {
      form: true,
      props: range
        ? {
            start: { type: Number, reflect: false },
            end: { type: Number, reflect: false },
            min: { type: Number, reflect: true },
            max: { type: Number, reflect: true },
            step: { type: Number, reflect: true },
            label: { type: String, reflect: true },
            name: { type: String, reflect: true },
            size: { type: String, reflect: true },
            disabled: { type: Boolean, reflect: true },
          }
        : {
            value: { type: Number, reflect: false },
            min: { type: Number, reflect: true },
            max: { type: Number, reflect: true },
            step: { type: Number, reflect: true },
            label: { type: String, reflect: true },
            name: { type: String, reflect: true },
            size: { type: String, reflect: true },
            disabled: { type: Boolean, reflect: true },
          },
      styles: [hostReset, controlBase, styles],
    },
  );
}

/** <st-slider label="Opacity" value="80" max="100"></st-slider> */
export const Slider = createSlider(false);

/** <st-range-slider label="Frequency" start="200" end="8000" min="20" max="20000"></st-range-slider> */
export const RangeSlider = createSlider(true);
