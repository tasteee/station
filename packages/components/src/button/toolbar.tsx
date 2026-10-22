import { createRovingFocus } from "@station/behaviors";
import { c, css, useEffect, useHost, useInternals, useRef } from "atomico";
import { hostReset } from "../shared/styles.ts";
import { refreshChildren } from "./button-group.tsx";

const ITEMS = "st-button, st-icon-button, st-toggle-button";

/**
 * role="toolbar" with one tab stop: arrow keys move between buttons.
 * Children inherit `kind` (default ghost) and `size`.
 * `floating` makes it a pill tool dock with round buttons and a floating shadow.
 *
 * <st-toolbar label="Text formatting" size="small">…</st-toolbar>
 * <st-toolbar label="Tools" floating>…</st-toolbar>
 */
export const Toolbar = c(
  ({ kind, label, orientation }) => {
    const host = useHost();
    const internals = useInternals();
    const roving = useRef<ReturnType<typeof createRovingFocus>>();

    useEffect(() => {
      internals.role = "toolbar";
      internals.ariaLabel = label ?? null;
      internals.ariaOrientation = orientation === "vertical" ? "vertical" : "horizontal";
    }, [label, orientation]);

    useEffect(() => {
      const el = host.current as HTMLElement;
      roving.current = createRovingFocus(el, {
        orientation: orientation === "vertical" ? "vertical" : "horizontal",
        items: () => [...el.querySelectorAll<HTMLElement>(ITEMS)].filter((i) => !i.hasAttribute("disabled")),
      });
      return () => roving.current?.destroy();
    }, [orientation]);

    useEffect(() => refreshChildren(host.current), [kind]);

    return (
      <host shadowDom>
        <slot
          onslotchange={() => {
            refreshChildren(host.current);
            roving.current?.update();
          }}
        />
      </host>
    );
  },
  {
    props: {
      kind: { type: String, reflect: true, value: (): "solid" | "outline" | "ghost" => "ghost" },
      size: { type: String, reflect: true },
      label: { type: String, reflect: true },
      orientation: { type: String, reflect: true, value: (): "horizontal" | "vertical" => "horizontal" },
      floating: { type: Boolean, reflect: true },
    },
    styles: [
      hostReset,
      css`
        :host {
          display: flex;
          align-items: center;
          gap: var(--st-space-0-5);
          min-width: 0;
        }
        :host([orientation="vertical"]) {
          flex-direction: column;
        }
        ::slotted(st-divider) {
          align-self: stretch;
          margin-block: var(--st-space-1);
        }
        /* Floating tool dock: pill bar, round buttons, the only shadow on the page. */
        :host([floating]) {
          --st-radius: 999px;
          --st-control-height: var(--st-toolbar-control-height, calc(var(--st-control-large) + 6px));
          gap: var(--st-space-1);
          padding: var(--st-space-1-5);
          border-radius: 999px;
          background: var(--st-bg-panel);
          box-shadow: var(--st-shadow-floating);
          width: max-content;
        }
        :host([floating]) ::slotted(st-divider) {
          margin-inline: var(--st-space-1);
          margin-block: var(--st-space-1-5);
        }
      `,
    ],
  },
);
