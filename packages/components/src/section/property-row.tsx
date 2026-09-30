import { c, css, useHost } from "atomico";
import { hostReset } from "../shared/styles.ts";

const LABELLED =
  /^st-(text-field|search-field|textarea|number-field|select|combobox|slider|range-slider|segmented-control|radio-group)$/;

/** Give unlabeled Station controls the row's label as their accessible name. */
function nameChildren(host: HTMLElement, label: string | undefined) {
  if (!label) return;
  for (const child of host.children) {
    if (LABELLED.test(child.localName) && !child.hasAttribute("label")) child.setAttribute("label", label);
  }
}

/**
 * Inspector row: label column + controls. Labels line up across rows
 * (width from --st-property-label-width). Unlabeled controls get the row label
 * as their accessible name.
 *
 * <st-property-row label="Opacity"><st-slider></st-slider><st-number-field unit="%"></st-number-field></st-property-row>
 */
export const PropertyRow = c(
  ({ label }) => {
    const host = useHost();
    nameChildren(host.current as HTMLElement, label);
    const focusFirst = () => {
      const target = [...(host.current as HTMLElement).children].find(
        (el) => (el as HTMLElement).tabIndex >= 0 || LABELLED.test(el.localName),
      ) as HTMLElement | undefined;
      target?.focus();
    };
    return (
      <host shadowDom>
        <span class="label" part="label" onclick={focusFirst}>
          {label}
          <slot name="label" />
        </span>
        <span class="controls" part="controls">
          <slot
            onslotchange={() =>
              nameChildren(
                host.current as HTMLElement,
                (host.current as HTMLElement & { label?: string }).label,
              )
            }
          />
        </span>
      </host>
    );
  },
  {
    props: {
      label: { type: String, reflect: true },
      stacked: { type: Boolean, reflect: true },
    },
    styles: [
      hostReset,
      css`
        :host {
          display: grid;
          grid-template-columns: var(--st-property-label-width, 76px) minmax(0, 1fr);
          align-items: center;
          gap: var(--st-space-2);
          min-height: var(--st-control-height);
        }
        :host([stacked]) {
          grid-template-columns: minmax(0, 1fr);
          gap: var(--st-space-1);
        }
        .label {
          display: flex;
          align-items: center;
          gap: var(--st-space-1);
          min-width: 0;
          overflow: hidden;
          font: var(--st-text-1) / var(--st-leading-tight) var(--st-font-sans);
          color: var(--st-text-muted);
          text-overflow: ellipsis;
          white-space: nowrap;
          cursor: default;
        }
        .controls {
          display: flex;
          align-items: center;
          gap: var(--st-space-2);
          min-width: 0;
        }
        ::slotted(:not(st-icon-button, st-toggle-button, st-checkbox, st-switch)) {
          flex: 1 1 0;
          min-width: 0;
          width: auto;
        }
        ::slotted([shrink="none"]) {
          flex: none;
        }
      `,
    ],
  },
);
