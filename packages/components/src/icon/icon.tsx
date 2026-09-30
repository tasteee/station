import { devWarn } from "@station/behaviors";
import { getIcon, hasIcon, onIconsChange } from "@station/icons";
import { c, css, useEffect, useHost, useState } from "atomico";
import { hostReset } from "../shared/styles.ts";

/**
 * <st-icon name="plus"></st-icon>
 * <st-icon name="trash" label="Delete"></st-icon>   ← meaningful icon, announced
 *
 * Size follows --st-icon-size (set by any ancestor's `size` attribute).
 * Color follows `color`, so icons sit on the text contrast ladder.
 */
export const Icon = c(
  ({ name, label }) => {
    const host = useHost();
    const [, rerender] = useState(0);

    // Icons registered after first render still show up.
    useEffect(() => onIconsChange(() => rerender((n) => n + 1)), []);

    const icon = name ? getIcon(name) : undefined;
    if (name && !hasIcon(name)) {
      devWarn(`<st-icon name="${name}">: unknown icon. Register it with registerIcons().`, host.current);
    }

    return (
      <host
        shadowDom
        role={label ? "img" : null}
        aria-label={label || null}
        aria-hidden={label ? null : "true"}
      >
        {icon && (
          <svg
            part="svg"
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill={icon.type === "filled" ? "currentColor" : "none"}
            stroke={icon.type === "outline" ? "currentColor" : "none"}
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            {icon.nodes.map(([tag, attrs]) => {
              const Tag = tag as "path";
              return <Tag {...attrs} />;
            })}
          </svg>
        )}
      </host>
    );
  },
  {
    props: {
      /** Registered icon name. */
      name: { type: String, reflect: true },
      /** Accessible label. Leave empty for decorative icons. */
      label: String,
    },
    styles: [
      hostReset,
      css`
        :host {
          display: inline-flex;
          flex: none;
          inline-size: var(--st-icon-size, 16px);
          block-size: var(--st-icon-size, 16px);
          color: inherit;
          vertical-align: middle;
        }
        svg {
          display: block;
          inline-size: 100%;
          block-size: 100%;
          overflow: visible;
          /* In 24px grid units. 1.5 renders as a crisp 1px line at 16px. */
          stroke-width: var(--st-icon-stroke, 1.5);
        }
      `,
    ],
  },
);
