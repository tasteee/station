import { c, css, useEffect, useHost, useInternals, useState } from "atomico";
import { Check } from "../shared/glyphs.tsx";
import { hostReset } from "../shared/styles.ts";

/**
 * One command in <st-menu>.
 * - `type="checkbox"` / `type="radio"` (+ `group`) make it checkable.
 * - A nested <st-menu> child becomes its submenu (it opens in the top layer).
 * - Fires `select` (detail: { value, checked }).
 */
export const MenuItem = c(
  ({ icon, shortcut, type, checked, disabled }) => {
    const host = useHost();
    const internals = useInternals();
    const [hasSubmenu, setHasSubmenu] = useState(false);
    const [expanded, setExpanded] = useState(false);

    useEffect(() => {
      const el = host.current as HTMLElement;
      if (!el.hasAttribute("tabindex")) el.tabIndex = -1;
      const update = () => setHasSubmenu(!!el.querySelector(":scope > st-menu"));
      update();
      const observer = new MutationObserver(update);
      observer.observe(el, { childList: true });
      const onOpen = (e: Event) => {
        if ((e.target as Element).parentElement === el) setExpanded((e as CustomEvent).detail.open);
      };
      el.addEventListener("openchange", onOpen);
      return () => {
        observer.disconnect();
        el.removeEventListener("openchange", onOpen);
      };
    }, []);

    useEffect(() => {
      internals.role =
        type === "checkbox" ? "menuitemcheckbox" : type === "radio" ? "menuitemradio" : "menuitem";
      internals.ariaChecked = type === "checkbox" || type === "radio" ? (checked ? "true" : "false") : null;
      internals.ariaDisabled = disabled ? "true" : null;
      internals.ariaHasPopup = hasSubmenu ? "menu" : null;
      internals.ariaExpanded = hasSubmenu ? (expanded ? "true" : "false") : null;
      internals.ariaKeyShortcuts = shortcut ?? null;
    }, [type, checked, disabled, hasSubmenu, expanded, shortcut]);

    const checkable = type === "checkbox" || type === "radio";
    return (
      <host shadowDom data-expanded={expanded ? "" : null}>
        <span class="leading">{checkable ? checked && <Check /> : icon && <st-icon name={icon} />}</span>
        <span class="label">
          <slot />
        </span>
        {shortcut && <st-kbd class="shortcut" shortcut={shortcut} />}
        {hasSubmenu && (
          <svg class="chevron" viewBox="0 0 16 16" aria-hidden="true">
            <path
              d="M6 4l4 4-4 4"
              fill="none"
              stroke="currentColor"
              stroke-width="1.75"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        )}
      </host>
    );
  },
  {
    props: {
      value: { type: String, reflect: true },
      icon: { type: String, reflect: true },
      shortcut: { type: String, reflect: true },
      type: { type: String, reflect: true, value: (): "normal" | "checkbox" | "radio" => "normal" },
      group: { type: String, reflect: true },
      checked: { type: Boolean, reflect: true },
      tone: { type: String, reflect: true },
      disabled: { type: Boolean, reflect: true },
      keepOpen: { type: Boolean, reflect: true },
    },
    styles: [
      hostReset,
      css`
        :host {
          display: flex;
          align-items: center;
          gap: var(--st-space-1-5);
          flex: none;
          height: var(--st-control-height);
          padding-inline: var(--st-space-2);
          border-radius: var(--st-radius-2); /* concentric with the menu's radius-4 minus its padding */
          color: var(--st-text-strong);
          font-size: var(--st-control-font-size, var(--st-text-2));
          white-space: nowrap;
          outline: none;
          cursor: default;
          user-select: none;
        }
        :host(:focus),
        :host([data-expanded]) {
          background: var(--st-bg-selected-strong);
          color: var(--st-text-selected);
        }
        :host([tone="danger"]) {
          color: var(--st-danger-text);
        }
        :host([tone="danger"]:focus) {
          background: var(--st-danger-solid);
          color: var(--st-text-on-status);
        }
        :host([disabled]) {
          opacity: 0.45;
        }
        .leading {
          display: var(--_leading-display, none);
          place-items: center;
          flex: none;
          width: var(--st-icon-size);
          height: var(--st-icon-size);
        }
        .leading svg {
          width: 12px;
          height: 12px;
        }
        .label {
          flex: 1;
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .shortcut {
          margin-inline-start: var(--st-space-4);
        }
        .chevron {
          width: 12px;
          height: 12px;
          flex: none;
          margin-inline-end: -2px;
          color: var(--st-text-muted);
        }
      `,
    ],
  },
);
