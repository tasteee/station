import { c, css } from "atomico";
import { Check, Minus } from "../shared/glyphs.tsx";
import { controlBase, hostReset } from "../shared/styles.ts";
import { choiceStyles } from "./choice-styles.ts";
import { useToggle } from "./use-toggle.ts";

/**
 * <st-checkbox checked>Show grid</st-checkbox>
 * `indeterminate` shows a dash for partially selected groups.
 */
export const Checkbox = c(
  ({ disabled, required, value, indeterminate }) => {
    const { checked, handlers } = useToggle({ role: "checkbox", disabled, required, value, indeterminate });
    return (
      <host shadowDom {...handlers}>
        <span class="control box" part="control">
          {indeterminate ? <Minus /> : checked ? <Check /> : null}
        </span>
        <span class="label">
          <slot />
        </span>
      </host>
    );
  },
  {
    form: true,
    props: {
      checked: { type: Boolean, reflect: true },
      indeterminate: { type: Boolean, reflect: true },
      disabled: { type: Boolean, reflect: true },
      required: { type: Boolean, reflect: true },
      name: { type: String, reflect: true },
      value: { type: String, reflect: true },
      size: { type: String, reflect: true },
    },
    styles: [
      hostReset,
      controlBase,
      choiceStyles,
      css`
        .box {
          width: var(--_box);
          height: var(--_box);
          padding: 1px;
          border: 1px solid var(--st-border-strong);
          border-radius: calc(var(--st-radius-1) + 1px);
          background: var(--st-bg-panel);
          color: var(--st-text-on-signal);
        }
        :host(:hover) .box {
          border-color: var(--st-gray-9);
        }
        :host([checked]) .box,
        :host([indeterminate]) .box {
          background: var(--st-signal-gradient);
          border-color: transparent;
        }
      `,
    ],
  },
);
