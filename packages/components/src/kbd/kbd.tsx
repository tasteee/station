import { ariaShortcut, shortcutKeys } from "@station/behaviors";
import { c, css } from "atomico";
import { hostReset } from "../shared/styles.ts";

/**
 * <st-kbd shortcut="Mod+Shift+D"></st-kbd>   → ⇧⌘D on Mac, Ctrl+Shift+D elsewhere
 * <st-kbd shortcut="Mod+D" kind="boxed"></st-kbd>
 */
export const Kbd = c(
  ({ shortcut, kind }) => {
    const keys = shortcut ? shortcutKeys(shortcut) : [];
    const apple = keys.some((k) => /[⌘⌥⇧⌃]/.test(k));
    return (
      <host shadowDom aria-label={shortcut ? ariaShortcut(shortcut) : null}>
        {keys.length ? (
          keys.map((key, i) => (
            <>
              {kind === "plain" && !apple && i > 0 && <span class="sep">+</span>}
              <kbd part="key">{key}</kbd>
            </>
          ))
        ) : (
          <slot />
        )}
      </host>
    );
  },
  {
    props: {
      /** Shortcut string, e.g. "Mod+Shift+D". `Mod` = ⌘ on Mac, Ctrl elsewhere. */
      shortcut: { type: String, reflect: true },
      /** `plain` (muted text, for menus/tooltips) or `boxed` (key caps). */
      kind: { type: String, reflect: true, value: (): "plain" | "boxed" => "plain" },
    },
    styles: [
      hostReset,
      css`
        :host {
          display: inline-flex;
          align-items: center;
          gap: 1px;
          font-family: var(--st-font-sans);
          font-size: var(--st-text-1);
          line-height: 1;
          color: var(--st-text-muted);
          white-space: nowrap;
        }
        kbd {
          font: inherit;
        }
        .sep {
          color: var(--st-text-faint);
        }
        :host([kind="boxed"]) {
          gap: 2px;
        }
        :host([kind="boxed"]) kbd {
          display: inline-grid;
          place-items: center;
          min-inline-size: 16px;
          block-size: 16px;
          padding-inline: 4px;
          border: 1px solid var(--st-border-subtle);
          border-radius: var(--st-radius-1);
          background: var(--st-bg-section);
          color: var(--st-text);
        }
      `,
    ],
  },
);
