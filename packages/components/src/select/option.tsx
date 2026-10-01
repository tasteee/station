import { c, css, useEffect, useInternals } from "atomico";
import { Check } from "../shared/glyphs.tsx";
import { hostReset } from "../shared/styles.ts";

/** One choice inside <st-select> or <st-combobox>. */
export const Option = c(
  ({ icon, selected, disabled }) => {
    const internals = useInternals();
    useEffect(() => {
      internals.role = "option";
      internals.ariaSelected = selected ? "true" : "false";
      internals.ariaDisabled = disabled ? "true" : null;
    }, [selected, disabled]);
    return (
      <host shadowDom>
        <span class="check">{selected && <Check />}</span>
        {icon && <st-icon name={icon} />}
        <span class="label">
          <slot />
        </span>
        <slot name="end" />
      </host>
    );
  },
  {
    props: {
      value: { type: String, reflect: true },
      label: { type: String, reflect: true },
      icon: { type: String, reflect: true },
      selected: { type: Boolean, reflect: true },
      disabled: { type: Boolean, reflect: true },
    },
    styles: [
      hostReset,
      css`
        :host {
          display: flex;
          align-items: center;
          gap: var(--st-space-1-5);
          height: var(--st-control-height);
          padding-inline: var(--st-space-1) var(--st-space-2);
          border-radius: var(--st-radius-1);
          color: var(--st-text-strong);
          font-size: var(--st-control-font-size);
          white-space: nowrap;
          cursor: default;
          scroll-margin-block: 4px;
        }
        :host([data-active]) {
          background: var(--st-bg-selected-strong);
          color: var(--st-text-selected);
        }
        :host([disabled]) {
          opacity: 0.45;
        }
        :host([data-filtered]) {
          display: none;
        }
        .check {
          display: inline-grid;
          width: 12px;
          height: 12px;
          flex: none;
        }
        .label {
          flex: 1;
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        ::slotted([slot="end"]) {
          color: var(--st-text-muted);
        }
      `,
    ],
  },
);
