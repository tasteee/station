import { c, css, useEffect, useHost, useProp } from "atomico";
import { fire } from "../shared/events.ts";
import { hostReset } from "../shared/styles.ts";

type VectorEl = HTMLElement & { value?: string; values: number[]; linked?: boolean };

const parse = (s: string | undefined) =>
  (s ?? "")
    .trim()
    .split(/[\s,]+/)
    .filter(Boolean)
    .map(Number);

/**
 * Several numbers edited together: position (X Y), size (W H), 3D (X Y Z).
 * `linkable` adds a lock that keeps the ratio (aspect ratio) when one changes.
 *
 * <st-vector-field label="Size" axes="w h" value="120 80" unit="px" linkable linked></st-vector-field>
 * el.values → [120, 80]
 */
export const VectorField = c(
  ({ axes, label, unit, step, min, max, precision, linkable, disabled, size }) => {
    const host = useHost<VectorEl>();
    const [value, setValue] = useProp<string>("value");
    const [linked, setLinked] = useProp<boolean>("linked");
    const names = (axes ?? "x y").split(/\s+/).filter(Boolean);
    const values = names.map((_, i) => parse(value)[i] ?? 0);

    useEffect(() => {
      host.current.setAttribute("role", "group");
      if (label) host.current.setAttribute("aria-label", label);
    }, [label]);

    const update = (index: number, next: number, commit: boolean) => {
      const current = parse(host.current.value);
      const old = current[index] ?? 0;
      const out = names.map((_, i) => current[i] ?? 0);
      if (host.current.linked && old !== 0) {
        const ratio = next / old;
        for (let i = 0; i < out.length; i++)
          out[i] = i === index ? next : Number((out[i]! * ratio).toFixed(precision ?? 3));
      } else out[index] = next;
      const str = out.join(" ");
      if (str !== host.current.value) {
        setValue(str);
        fire(host.current, "input", { values: out });
      }
      if (commit) fire(host.current, "change", { values: out });
    };

    return (
      <host shadowDom>
        {names.map((axis, i) => (
          <st-number-field
            label={label ? `${label} ${axis.toUpperCase()}` : axis.toUpperCase()}
            abbr={axis.toUpperCase()}
            value={values[i]}
            unit={unit}
            step={step}
            min={min}
            max={max}
            precision={precision}
            disabled={disabled}
            size={size}
            oninput={(e: Event) => {
              e.stopPropagation();
              update(i, (e.target as HTMLElement & { value: number }).value, false);
            }}
            onchange={(e: Event) => {
              e.stopPropagation();
              update(i, (e.target as HTMLElement & { value: number }).value, true);
            }}
          />
        ))}
        {linkable && (
          <button
            type="button"
            class="link"
            aria-pressed={linked ? "true" : "false"}
            aria-label={linked ? "Unlink values" : "Link values (keep ratio)"}
            title={linked ? "Unlink" : "Keep ratio"}
            disabled={disabled}
            onclick={() => setLinked(!linked)}
          >
            <svg viewBox="0 0 16 16" aria-hidden="true">
              {linked ? (
                <path
                  d="M6.5 9.5l3-3M5 8l-1.3 1.3a2.3 2.3 0 0 0 3.2 3.2L8 11.2M11 8l1.3-1.3a2.3 2.3 0 0 0-3.2-3.2L8 4.8"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.4"
                  stroke-linecap="round"
                />
              ) : (
                <path
                  d="M5 8l-1.3 1.3a2.3 2.3 0 0 0 3.2 3.2L8 11.2M11 8l1.3-1.3a2.3 2.3 0 0 0-3.2-3.2L8 4.8M4 4l8 8"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.4"
                  stroke-linecap="round"
                />
              )}
            </svg>
          </button>
        )}
      </host>
    );
  },
  {
    props: {
      value: { type: String, reflect: true },
      axes: { type: String, reflect: true },
      label: { type: String, reflect: true },
      unit: { type: String, reflect: true },
      step: { type: Number, reflect: true },
      min: { type: Number, reflect: true },
      max: { type: Number, reflect: true },
      precision: { type: Number, reflect: true },
      linkable: { type: Boolean, reflect: true },
      linked: { type: Boolean, reflect: true },
      size: { type: String, reflect: true },
      disabled: { type: Boolean, reflect: true },
    },
    styles: [
      hostReset,
      css`
        :host {
          display: flex;
          align-items: center;
          gap: var(--st-space-1-5);
          min-width: 0;
        }
        st-number-field {
          flex: 1 1 0;
          min-width: 0;
          width: auto;
        }
        .link {
          all: unset;
          display: grid;
          place-items: center;
          flex: none;
          width: var(--st-control-height);
          height: var(--st-control-height);
          border-radius: var(--st-radius-2);
          color: var(--st-text-muted);
        }
        .link:hover {
          background: var(--st-bg-hover);
          color: var(--st-text-strong);
        }
        .link[aria-pressed="true"] {
          color: var(--st-text-strong);
          background: var(--st-bg-pressed);
        }
        .link:focus-visible {
          outline: var(--st-focus-ring-width) solid var(--st-border-focus);
        }
        .link svg {
          width: 16px;
          height: 16px;
        }
      `,
    ],
  },
);

Object.defineProperty(VectorField.prototype, "values", {
  get(this: VectorEl) {
    return parse(this.value);
  },
  set(this: VectorEl, next: number[]) {
    this.value = next.join(" ");
  },
});
