import { c, useEffect, useHost, useProp, useRef } from "atomico";
import { fire } from "../shared/events.ts";
import { controlBase, hostReset } from "../shared/styles.ts";
import { attachTooltip } from "../shared/tooltip.tsx";
import { useEffectiveKind, usePressable } from "./button-base.ts";
import { buttonStyles } from "./button-styles.ts";

/**
 * On/off button. Icon-only when it has `icon` and no text.
 *
 * <st-toggle-button icon="bold" label="Bold" shortcut="Mod+B"></st-toggle-button>
 * <st-toggle-button pressed>Snap</st-toggle-button>
 */
export const ToggleButton = c(
  ({ icon, label, shortcut, kind, disabled }) => {
    const host = useHost();
    const [pressed, setPressed] = useProp<boolean>("pressed");
    const hasText = useRef(false);
    const effectiveKind = useEffectiveKind(kind, "ghost");
    const { internals, ...handlers } = usePressable({
      disabled,
      onPress: () => {
        setPressed(!pressed);
        fire(host.current, "change");
      },
    });

    useEffect(() => {
      internals.ariaPressed = pressed ? "true" : "false";
      internals.ariaLabel = label ?? null;
      internals.ariaKeyShortcuts = shortcut ?? null;
    }, [pressed, label, shortcut]);

    useEffect(
      () =>
        attachTooltip(host.current as HTMLElement, () => {
          const el = host.current as HTMLElement & { label?: string; shortcut?: string };
          return hasText.current ? {} : { label: el.label, shortcut: el.shortcut };
        }),
      [],
    );

    hasText.current = !!(host.current as HTMLElement).textContent?.trim();
    const iconOnly = !!icon && !hasText.current;

    return (
      <host shadowDom data-kind={effectiveKind} data-icon-only={iconOnly || null} {...handlers}>
        {icon && <st-icon name={icon} />}
        <span class="label">
          <slot onslotchange={() => (host.current as HTMLElement & { update(): void }).update()} />
        </span>
      </host>
    );
  },
  {
    props: {
      pressed: { type: Boolean, reflect: true },
      icon: { type: String, reflect: true },
      label: { type: String, reflect: true },
      shortcut: { type: String, reflect: true },
      kind: { type: String, reflect: true },
      tone: { type: String, reflect: true },
      size: { type: String, reflect: true },
      disabled: { type: Boolean, reflect: true },
    },
    styles: [hostReset, controlBase, buttonStyles],
  },
);
