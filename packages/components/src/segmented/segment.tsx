import { c, css, useEffect, useHost, useInternals } from "atomico";
import { buttonStyles } from "../button/button-styles.ts";
import { hostReset } from "../shared/styles.ts";
import { attachTooltip } from "../shared/tooltip.tsx";

/** One option inside <st-segmented-control>. */
export const Segment = c(
  ({ value, icon, label, selected, disabled }) => {
    const host = useHost();
    const internals = useInternals();
    useEffect(() => {
      internals.role = "radio";
      internals.ariaChecked = selected ? "true" : "false";
      internals.ariaDisabled = disabled ? "true" : null;
      internals.ariaLabel = label ?? null;
    }, [selected, disabled, label]);

    useEffect(
      () =>
        attachTooltip(host.current as HTMLElement, () => {
          const el = host.current as HTMLElement & { label?: string };
          return el.textContent?.trim() ? {} : { label: el.label };
        }),
      [],
    );
    void value;

    const iconOnly = !!icon && !(host.current as HTMLElement).textContent?.trim();
    return (
      <host shadowDom data-kind="ghost" data-icon-only={iconOnly || null}>
        {icon && <st-icon name={icon} />}
        <span class="label">
          <slot />
        </span>
      </host>
    );
  },
  {
    props: {
      value: { type: String, reflect: true },
      icon: { type: String, reflect: true },
      label: { type: String, reflect: true },
      selected: { type: Boolean, reflect: true },
      disabled: { type: Boolean, reflect: true },
    },
    styles: [
      hostReset,
      buttonStyles,
      css`
        :host {
          --_height: var(--_segment-height, var(--st-control-height));
          height: var(--_height);
          min-width: var(--_height);
          padding-inline: var(--st-space-2);
          border: 0;
          border-radius: calc(var(--st-radius-2) - 1px);
          font-size: var(--st-control-font-size);
          outline: none;
          --_fg: var(--st-text-muted);
          --_hover-bg: transparent;
          --_hover-fg: var(--st-text-strong);
          --_active-bg: transparent;
        }
        :host([data-icon-only]) {
          width: auto;
          padding: 0;
        }
        :host([selected]) {
          --_bg: var(--st-bg-panel);
          --_fg: var(--st-text-strong);
          --_hover-bg: var(--st-bg-panel);
          box-shadow: 0 0 0 1px var(--st-border-subtle);
        }
        :host(:focus-visible) {
          outline: var(--st-focus-ring-width) solid var(--st-border-focus);
          outline-offset: -1px;
        }
        :host([disabled]) {
          opacity: 0.45;
        }
      `,
    ],
  },
);
