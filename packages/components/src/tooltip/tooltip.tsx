import { c, css, useEffect, useHost, useRef } from "atomico";
import { hostReset } from "../shared/styles.ts";
import { attachTooltip } from "../shared/tooltip.tsx";

/**
 * Adds a tooltip to its first child.
 * (Icon buttons don't need this: they show `label` + `shortcut` on their own.)
 *
 * <st-tooltip label="Snap to pixel grid" shortcut="Mod+'"><st-switch></st-switch></st-tooltip>
 */
export const Tooltip = c(
  ({ label }) => {
    const host = useHost();
    const cleanup = useRef<() => void>();

    const attach = () => {
      cleanup.current?.();
      const target = (host.current as HTMLElement).firstElementChild as HTMLElement | null;
      if (!target) return;
      cleanup.current = attachTooltip(target, () => {
        const el = host.current as HTMLElement & { label?: string; shortcut?: string; placement?: never };
        return { label: el.label, shortcut: el.shortcut, placement: el.placement };
      });
    };

    useEffect(() => {
      attach();
      return () => cleanup.current?.();
    }, []);

    useEffect(() => {
      const target = (host.current as HTMLElement).firstElementChild;
      if (target && label && !target.hasAttribute("aria-label"))
        target.setAttribute("aria-description", label);
    }, [label]);

    return (
      <host shadowDom>
        <slot onslotchange={attach} />
      </host>
    );
  },
  {
    props: {
      label: { type: String, reflect: true },
      shortcut: { type: String, reflect: true },
      placement: { type: String, reflect: true },
    },
    styles: [
      hostReset,
      css`
        :host {
          display: contents;
        }
      `,
    ],
  },
);
