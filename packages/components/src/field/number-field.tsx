import { createScrub, formatNumber, normalize, parseNumber, stepPrecision } from "@station/behaviors";
import { c, css, useEffect, useHost, useInternals, useProp, useRef, useState } from "atomico";
import { fire } from "../shared/events.ts";
import { controlBase, fieldBase, hostReset } from "../shared/styles.ts";

type Host = HTMLElement & {
  value?: number | null;
  min?: number;
  max?: number;
  step?: number;
  precision?: number;
};

/**
 * Numeric input built for inspectors.
 * - Drag the prefix (`abbr` text or `icon`) left/right to scrub. `label` is the accessible name.
 * - ↑/↓ change by `step`; hold Shift for ×10, Alt for ×0.1.
 * - Type math: "12*2", "(100-8)/2". Enter commits, Escape reverts.
 * - `mixed` shows "Mixed" for multi-selections with different values.
 *
 * <st-number-field label="Width" abbr="W" value="120" unit="px" min="0"></st-number-field>
 */
export const NumberField = c(
  ({ min, max, step, unit, label, abbr, icon, name, disabled, readonly, placeholder, mixed, precision }) => {
    const host = useHost<Host>();
    const internals = useInternals();
    const [value, setValue] = useProp<number | null>("value");
    const [editing, setEditing] = useState(false);
    const input = useRef<HTMLInputElement>();
    const prefix = useRef<HTMLElement>();
    const scrubStart = useRef<number | null>(null);

    const digits = precision ?? Math.min(3, Math.max(stepPrecision(step ?? 1), 0) + 1);
    const display = value == null || Number.isNaN(value) ? "" : formatNumber(value, digits);

    // Round to display precision (not to the step) so scrubbing stays smooth.
    const constrain = (n: number) => {
      const el = host.current;
      return normalize(n, { min: el.min ?? undefined, max: el.max ?? undefined, step: 10 ** -digits });
    };

    const commit = (next: number, kind: "input" | "change" | "both") => {
      const current = host.current.value;
      if (Number.isNaN(next)) return false;
      const n = constrain(next);
      if (n !== current) {
        setValue(n);
        if (kind !== "change") fire(host.current, "input");
      }
      if (kind !== "input" && (n !== current || kind === "change")) fire(host.current, "change");
      return true;
    };

    const multiplier = (e: { shiftKey: boolean; altKey: boolean }) => (e.shiftKey ? 10 : e.altKey ? 0.1 : 1);

    useEffect(() => {
      internals.role = null;
      internals.setFormValue(value == null ? null : String(value));
    }, [value]);

    useEffect(() => {
      if (!editing && input.current && input.current.value !== display) input.current.value = display;
    });

    useEffect(() => {
      const el = input.current;
      if (!el) return;
      el.setAttribute("role", "spinbutton");
      if (min != null) el.setAttribute("aria-valuemin", String(min));
      else el.removeAttribute("aria-valuemin");
      if (max != null) el.setAttribute("aria-valuemax", String(max));
      else el.removeAttribute("aria-valuemax");
      if (value != null) el.setAttribute("aria-valuenow", String(value));
      else el.removeAttribute("aria-valuenow");
      el.setAttribute("aria-valuetext", mixed && value == null ? "Mixed" : `${display}${unit ?? ""}`);
      const name = label ?? abbr;
      if (name) el.setAttribute("aria-label", name);
    }, [min, max, value, unit, label, abbr, mixed]);

    // Scrub by dragging the prefix.
    useEffect(() => {
      const handle = prefix.current;
      if (!handle || disabled || readonly) return;
      const scrub = createScrub(handle, {
        onStart: () => {
          scrubStart.current = host.current.value ?? 0;
          input.current?.blur();
        },
        onMove: (dx, e) => {
          const s = host.current.step ?? 1;
          commit((host.current.value ?? 0) + dx * s * multiplier(e), "input");
        },
        onEnd: (cancelled) => {
          if (cancelled && scrubStart.current != null) {
            setValue(scrubStart.current);
            fire(host.current, "input");
          } else fire(host.current, "change");
          scrubStart.current = null;
        },
        onClick: () => input.current?.focus(),
      });
      return () => scrub.destroy();
    }, [disabled, readonly, !!(abbr || icon)]);

    const onkeydown = (e: KeyboardEvent) => {
      const el = e.target as HTMLInputElement;
      const s = step ?? 1;
      if (e.key === "ArrowUp" || e.key === "ArrowDown") {
        e.preventDefault();
        const base = Number.isNaN(parseNumber(el.value, unit)) ? (value ?? 0) : parseNumber(el.value, unit);
        commit(base + (e.key === "ArrowUp" ? 1 : -1) * s * multiplier(e), "both");
        el.value = formatNumber(host.current.value ?? 0, digits);
        el.select();
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (!commit(parseNumber(el.value, unit), "change")) el.value = display;
        el.select();
      } else if (e.key === "Escape") {
        e.preventDefault();
        el.value = display;
        el.blur();
      }
    };

    const onblur = (e: FocusEvent) => {
      setEditing(false);
      const el = e.target as HTMLInputElement;
      if (el.value.trim() === "" || el.value === display) {
        el.value = display;
        return;
      }
      if (!commit(parseNumber(el.value, unit), "change")) el.value = display;
    };

    return (
      <host shadowDom={{ delegatesFocus: true }} data-scrub={abbr || icon ? "" : null}>
        {(abbr || icon) && (
          <span ref={prefix} class="prefix" part="prefix" aria-hidden="true">
            {icon ? <st-icon name={icon} /> : abbr}
          </span>
        )}
        <input
          ref={input}
          part="input"
          inputMode="decimal"
          name={name}
          disabled={disabled}
          readOnly={readonly}
          placeholder={mixed && value == null ? "Mixed" : (placeholder ?? "")}
          autocomplete="off"
          spellcheck={false}
          onfocus={(e: FocusEvent) => {
            setEditing(true);
            (e.target as HTMLInputElement).select();
          }}
          onblur={onblur}
          onkeydown={onkeydown}
          oninput={(e: Event) => e.stopPropagation()}
          onchange={(e: Event) => e.stopPropagation()}
        />
        {unit && <span class="unit">{unit}</span>}
      </host>
    );
  },
  {
    form: true,
    props: {
      value: { type: Number, reflect: false },
      min: { type: Number, reflect: true },
      max: { type: Number, reflect: true },
      step: { type: Number, reflect: true, value: () => 1 },
      precision: { type: Number, reflect: true },
      unit: { type: String, reflect: true },
      label: { type: String, reflect: true },
      abbr: { type: String, reflect: true },
      icon: { type: String, reflect: true },
      name: { type: String, reflect: true },
      placeholder: { type: String, reflect: true },
      kind: { type: String, reflect: true },
      size: { type: String, reflect: true },
      mixed: { type: Boolean, reflect: true },
      disabled: { type: Boolean, reflect: true },
      readonly: { type: Boolean, reflect: true },
    },
    styles: [
      hostReset,
      controlBase,
      fieldBase,
      css`
        :host {
          width: 80px;
        }
        input {
          font-family: var(--st-font-numeric);
          font-variant-numeric: tabular-nums;
          letter-spacing: -0.02em;
        }
        .prefix {
          display: inline-grid;
          place-items: center;
          flex: none;
          align-self: stretch;
          min-width: calc(var(--_height) - 4px);
          padding-inline-start: 2px;
          margin-inline-end: calc(var(--st-space-1) * -1);
          color: var(--st-text-muted);
          font-size: var(--st-text-1);
          font-weight: var(--st-weight-medium);
          cursor: ew-resize;
          touch-action: none;
          user-select: none;
        }
        .prefix:hover {
          color: var(--st-text-strong);
        }
        .unit {
          flex: none;
          padding-inline-end: var(--st-space-1-5);
          margin-inline-start: calc(var(--st-space-1) * -1);
          color: var(--st-text-muted);
          font-size: var(--st-text-1);
        }
        :host([readonly]) .prefix,
        :host([disabled]) .prefix {
          cursor: default;
        }
      `,
    ],
  },
);
