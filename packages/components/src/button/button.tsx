import { c } from "atomico";
import { Spinner } from "../shared/glyphs.tsx";
import { controlBase, hostReset } from "../shared/styles.ts";
import { useEffectiveKind, usePressable } from "./button-base.ts";
import { buttonStyles } from "./button-styles.ts";

/**
 * <st-button kind="solid" tone="accent">Export</st-button>
 * <st-button icon="plus">Add layer</st-button>
 */
export const Button = c(
  ({ kind, disabled, loading, type, icon, iconEnd }) => {
    const effectiveKind = useEffectiveKind(kind, "outline");
    const { internals, ...handlers } = usePressable({
      disabled,
      loading,
      onPress: () => {
        const form = internals.form;
        if (!form) return;
        if (type === "submit") form.requestSubmit();
        else if (type === "reset") form.reset();
      },
    });

    return (
      <host shadowDom data-kind={effectiveKind} {...handlers}>
        {loading && (
          <span class="spinner">
            <Spinner />
          </span>
        )}
        <span class="content">
          {icon && <st-icon name={icon} />}
          <slot name="start" />
          <span class="label">
            <slot />
          </span>
          <slot name="end" />
          {iconEnd && <st-icon name={iconEnd} />}
        </span>
      </host>
    );
  },
  {
    form: true,
    props: {
      kind: { type: String, reflect: true },
      tone: { type: String, reflect: true },
      size: { type: String, reflect: true },
      disabled: { type: Boolean, reflect: true },
      loading: { type: Boolean, reflect: true },
      type: { type: String, reflect: true, value: (): "button" | "submit" | "reset" => "button" },
      icon: { type: String, reflect: true },
      iconEnd: { type: String, reflect: true },
      block: { type: Boolean, reflect: true },
    },
    styles: [hostReset, controlBase, buttonStyles],
  },
);
