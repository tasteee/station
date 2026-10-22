import { createRovingFocus } from "@station/behaviors";
import { c, css, useEffect, useHost, useInternals, useProp, useRef } from "atomico";
import { fire } from "../shared/events.ts";
import { controlBase, hostReset } from "../shared/styles.ts";
import { choiceStyles } from "./choice-styles.ts";

type Radio = HTMLElement & { value?: string; disabled?: boolean; checked?: boolean };
const radiosOf = (host: HTMLElement) => [...host.querySelectorAll<Radio>("st-radio")];

/**
 * <st-radio-group label="Export format" value="png">
 *   <st-radio value="png">PNG</st-radio>
 *   <st-radio value="svg">SVG</st-radio>
 * </st-radio-group>
 */
export const RadioGroup = c(
  ({ label, required }) => {
    const host = useHost();
    const internals = useInternals();
    const [value, setValue] = useProp<string>("value");
    const roving = useRef<ReturnType<typeof createRovingFocus>>();

    const select = (radio: Radio) => {
      if (radio.disabled || (host.current as Radio).disabled || radio.value === (host.current as Radio).value)
        return;
      setValue(radio.value);
      fire(host.current, "input");
      fire(host.current, "change");
    };

    const sync = () => {
      for (const r of radiosOf(host.current)) r.checked = r.value === (host.current as Radio).value;
      roving.current?.update();
    };

    useEffect(() => {
      internals.role = "radiogroup";
      internals.ariaLabel = label ?? null;
      internals.ariaRequired = required ? "true" : null;
    }, [label, required]);

    useEffect(() => {
      internals.setFormValue(value ?? null);
      if (required && !value) internals.setValidity({ valueMissing: true }, "Please select an option.");
      else internals.setValidity({});
      sync();
      const current = radiosOf(host.current).find((r) => r.value === value);
      if (current && roving.current && roving.current.active !== current)
        roving.current.activate(current, false);
    }, [value, required]);

    useEffect(() => {
      const el = host.current as HTMLElement;
      roving.current = createRovingFocus(el, {
        orientation: "both",
        items: () => radiosOf(el).filter((r) => !r.disabled),
        onActivate: (item) => select(item as Radio),
      });
      sync();
      return () => roving.current?.destroy();
    }, []);

    return (
      <host
        shadowDom
        onclick={(e: Event) => {
          const radio = e.composedPath().find((n) => (n as Element).localName === "st-radio") as
            | Radio
            | undefined;
          if (radio) select(radio);
        }}
      >
        <slot onslotchange={sync} />
      </host>
    );
  },
  {
    form: true,
    props: {
      value: { type: String, reflect: true },
      name: { type: String, reflect: true },
      label: { type: String, reflect: true },
      orientation: { type: String, reflect: true, value: (): "vertical" | "horizontal" => "vertical" },
      required: { type: Boolean, reflect: true },
      disabled: { type: Boolean, reflect: true },
      size: { type: String, reflect: true },
    },
    styles: [
      hostReset,
      css`
        :host {
          display: flex;
          flex-direction: column;
          gap: var(--st-space-0-5);
        }
        :host([orientation="horizontal"]) {
          flex-direction: row;
          flex-wrap: wrap;
          gap: var(--st-space-4);
        }
        :host([disabled]) {
          opacity: 0.45;
          pointer-events: none;
        }
      `,
    ],
  },
);

/** One option in <st-radio-group>. */
export const Radio = c(
  ({ checked, disabled }) => {
    const internals = useInternals();
    useEffect(() => {
      internals.role = "radio";
      internals.ariaChecked = checked ? "true" : "false";
      internals.ariaDisabled = disabled ? "true" : null;
    }, [checked, disabled]);
    return (
      <host shadowDom>
        <span class="control dot" part="control" />
        <span class="label">
          <slot />
        </span>
      </host>
    );
  },
  {
    props: {
      value: { type: String, reflect: true },
      checked: { type: Boolean, reflect: true },
      disabled: { type: Boolean, reflect: true },
    },
    styles: [
      hostReset,
      controlBase,
      choiceStyles,
      css`
        :host(:focus-visible) {
          outline: none;
        }
        .dot {
          width: var(--_box);
          height: var(--_box);
          border: 1px solid var(--st-border-strong);
          border-radius: 50%;
          background: var(--st-bg-panel);
        }
        :host(:hover) .dot {
          border-color: var(--st-gray-9);
        }
        :host([checked]) .dot {
          border: calc(var(--_box) * 0.3) solid var(--st-signal-fill);
          background: var(--st-text-on-signal);
        }
      `,
    ],
  },
);
