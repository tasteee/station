import { autoPosition, formatHex, parseColor } from "@station/behaviors";
import { c, css, useEffect, useHost, useProp, useRef, useState } from "atomico";
import { fire } from "../shared/events.ts";
import { controlBase, fieldBase, hostReset } from "../shared/styles.ts";

type FieldEl = HTMLElement & { value?: string; alpha?: boolean };

/**
 * Inspector color row: swatch + hex + opacity. The swatch opens a picker popover.
 * <st-color-field label="Fill" value="#3366cc" alpha></st-color-field>
 */
export const ColorField = c(
  ({ label, alpha, disabled }) => {
    const host = useHost<FieldEl>();
    const [value, setValue] = useProp<string>("value");
    const [open, setOpen] = useState(false);
    const popover = useRef<HTMLElement>();
    const swatch = useRef<HTMLButtonElement>();
    const rgb = parseColor(value ?? "") ?? { r: 0, g: 0, b: 0, a: 1 };
    const opaque = formatHex(rgb, false);

    const update = (next: string, commit: boolean) => {
      if (next !== host.current.value) {
        setValue(next);
        fire(host.current, "input");
      }
      if (commit) fire(host.current, "change");
    };

    useEffect(() => host.current.style.setProperty("--_color", formatHex(rgb)));

    useEffect(() => {
      if (!open) return;
      return autoPosition(swatch.current!, popover.current!, { placement: "left-start", offset: 8 });
    }, [open]);

    return (
      <host shadowDom={{ delegatesFocus: true }}>
        <button
          ref={swatch}
          type="button"
          class="swatch checker"
          aria-label={`${label ?? "Color"}: ${opaque}. Open color picker`}
          aria-haspopup="dialog"
          aria-expanded={open ? "true" : "false"}
          disabled={disabled}
          onclick={() => {
            if (open) popover.current!.hidePopover();
            else popover.current!.showPopover();
          }}
        />
        <input
          class="hex"
          part="input"
          aria-label={`${label ?? "Color"} hex`}
          value={opaque.slice(1).toUpperCase()}
          disabled={disabled}
          spellcheck={false}
          onfocus={(e: FocusEvent) => (e.target as HTMLInputElement).select()}
          onkeydown={(e: KeyboardEvent) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
          onchange={(e: Event) => {
            e.stopPropagation();
            const parsed = parseColor((e.target as HTMLInputElement).value);
            if (parsed) update(formatHex({ ...parsed, a: rgb.a }), true);
            else (e.target as HTMLInputElement).value = opaque.slice(1).toUpperCase();
          }}
          oninput={(e: Event) => e.stopPropagation()}
        />
        {alpha && (
          <st-number-field
            class="opacity"
            kind="ghost"
            label={`${label ?? "Color"} opacity`}
            value={Math.round(rgb.a * 100)}
            min={0}
            max={100}
            precision={0}
            unit="%"
            disabled={disabled}
            oninput={(e: Event) => {
              e.stopPropagation();
              update(
                formatHex({ ...rgb, a: (e.target as HTMLElement & { value: number }).value / 100 }),
                false,
              );
            }}
            onchange={(e: Event) => {
              e.stopPropagation();
              fire(host.current, "change");
            }}
          />
        )}
        <div
          ref={popover}
          class="popover"
          popover="auto"
          role="dialog"
          aria-label={`${label ?? "Color"} picker`}
          ontoggle={(e: ToggleEvent) => setOpen(e.newState === "open")}
        >
          {open && (
            <st-color-picker
              value={formatHex(rgb)}
              alpha={alpha}
              oninput={(e: Event) => {
                e.stopPropagation();
                update((e.target as HTMLElement & { value: string }).value, false);
              }}
              onchange={(e: Event) => {
                e.stopPropagation();
                fire(host.current, "change");
              }}
            />
          )}
        </div>
      </host>
    );
  },
  {
    props: {
      value: { type: String, reflect: true },
      label: { type: String, reflect: true },
      alpha: { type: Boolean, reflect: true },
      kind: { type: String, reflect: true },
      size: { type: String, reflect: true },
      disabled: { type: Boolean, reflect: true },
    },
    styles: [
      hostReset,
      controlBase,
      fieldBase,
      css`
        .swatch.checker {
          background:
            linear-gradient(var(--_color), var(--_color)),
            repeating-conic-gradient(#ccc 0 25%, #fff 0 50%) 0 0 / 6px 6px;
        }
        :host {
          width: 160px;
          padding-inline-start: 4px;
          gap: 0;
        }
        .swatch {
          all: unset;
          flex: none;
          width: calc(var(--_height) - 10px);
          height: calc(var(--_height) - 10px);
          border-radius: var(--st-radius-1);
          box-shadow: inset 0 0 0 1px var(--st-gray-a5);
          cursor: default;
        }
        .swatch:focus-visible {
          outline: var(--st-focus-ring-width) solid var(--st-border-focus);
          outline-offset: 1px;
        }
        .hex {
          font-family: var(--st-font-numeric);
          letter-spacing: -0.02em;
          text-transform: uppercase;
        }
        .opacity {
          flex: 0 0 56px;
          width: 56px;
          border: 0;
          border-inline-start: 1px solid var(--st-border-subtle);
          border-radius: 0;
          background: transparent;
          height: calc(var(--_height) - 2px);
        }
        .popover {
          margin: 0;
          inset: auto;
          padding: var(--st-space-3);
          border: 0;
          border-radius: var(--st-radius-3);
          background: var(--st-bg-panel);
          color: var(--st-text);
          box-shadow: var(--st-shadow-popover);
          cursor: default;
        }
      `,
    ],
  },
);
