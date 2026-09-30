import { c, useEffect, useHost } from "atomico";
import { controlBase, hostReset } from "../shared/styles.ts";
import { attachTooltip } from "../shared/tooltip.tsx";
import { useEffectiveKind, usePressable } from "./button-base.ts";
import { buttonStyles } from "./button-styles.ts";

/**
 * Square, icon-only button. `label` is required: it becomes the accessible
 * name and the tooltip. `shortcut` is shown in the tooltip.
 *
 * <st-icon-button icon="trash" label="Delete layer" shortcut="Delete"></st-icon-button>
 */
export const IconButton = c(
  ({ icon, label, shortcut, kind, disabled }) => {
    const host = useHost();
    const effectiveKind = useEffectiveKind(kind, "ghost");
    const { internals, ...handlers } = usePressable({ disabled });

    useEffect(() => {
      internals.ariaLabel = label ?? null;
      internals.ariaKeyShortcuts = shortcut ?? null;
    }, [label, shortcut]);

    useEffect(
      () =>
        attachTooltip(host.current as HTMLElement, () => {
          const el = host.current as HTMLElement & {
            label?: string;
            shortcut?: string;
            tooltipPlacement?: never;
          };
          return { label: el.label, shortcut: el.shortcut, placement: el.tooltipPlacement };
        }),
      [],
    );

    return (
      <host shadowDom data-kind={effectiveKind} data-icon-only {...handlers}>
        {icon ? <st-icon name={icon} /> : <slot />}
      </host>
    );
  },
  {
    props: {
      icon: { type: String, reflect: true },
      label: { type: String, reflect: true },
      shortcut: { type: String, reflect: true },
      kind: { type: String, reflect: true },
      tone: { type: String, reflect: true },
      size: { type: String, reflect: true },
      disabled: { type: Boolean, reflect: true },
      tooltipPlacement: { type: String, reflect: true },
    },
    styles: [hostReset, controlBase, buttonStyles],
  },
);
