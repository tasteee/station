import { c, css } from "atomico";
import { controlBase, hostReset } from "../shared/styles.ts";
import { choiceStyles } from "./choice-styles.ts";
import { useToggle } from "./use-toggle.ts";

/** <st-switch checked>Snap to grid</st-switch> */
export const Switch = c(
  ({ disabled, required, value }) => {
    const { handlers } = useToggle({ role: "switch", disabled, required, value });
    return (
      <host shadowDom {...handlers}>
        <span class="control track" part="control">
          <span class="thumb" part="thumb" />
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
        .track {
          --_h: calc(var(--st-icon-size) - 2px);
          display: inline-flex;
          place-items: center start;
          width: calc(var(--_h) * 1.8);
          height: var(--_h);
          padding: 2px;
          border-radius: var(--st-radius-full);
          background: var(--st-gray-a7);
        }
        :host(:hover) .track {
          background: var(--st-gray-a8);
        }
        .thumb {
          width: calc(var(--_h) - 4px);
          height: calc(var(--_h) - 4px);
          border-radius: 50%;
          background: var(--st-gray-1);
          transition: translate var(--st-duration) var(--st-ease);
        }
        :host([checked]) .track {
          background: var(--st-signal-gradient);
        }
        :host([checked]) .thumb {
          background: oklch(100% 0 0);
          translate: calc(var(--_h) * 0.8) 0;
        }
      `,
    ],
  },
);
