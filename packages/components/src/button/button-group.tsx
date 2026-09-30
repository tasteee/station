import { c, css, useEffect, useHost, useInternals } from "atomico";
import { hostReset } from "../shared/styles.ts";

type Updatable = Element & { update?: () => void };

/** Re-render children so they pick up an inherited `kind`. */
export function refreshChildren(host: Element) {
  for (const el of host.querySelectorAll<Updatable>("st-button, st-icon-button, st-toggle-button"))
    el.update?.();
}

/**
 * Groups related buttons. Children inherit `kind` and `size`.
 * `attached` joins them into one bordered strip.
 *
 * <st-button-group kind="outline" attached>…</st-button-group>
 */
export const ButtonGroup = c(
  ({ kind, label }) => {
    const host = useHost();
    const internals = useInternals();
    useEffect(() => {
      internals.role = "group";
      internals.ariaLabel = label ?? null;
    }, [label]);
    useEffect(() => refreshChildren(host.current), [kind]);
    return (
      <host shadowDom>
        <slot onslotchange={() => refreshChildren(host.current)} />
      </host>
    );
  },
  {
    props: {
      kind: { type: String, reflect: true },
      size: { type: String, reflect: true },
      attached: { type: Boolean, reflect: true },
      label: { type: String, reflect: true },
    },
    styles: [
      hostReset,
      css`
        :host {
          display: inline-flex;
          align-items: center;
          gap: var(--st-space-0-5);
        }
        :host([attached]) {
          gap: 0;
        }
        :host([attached]) ::slotted(:not(:first-child)) {
          margin-inline-start: -1px;
          border-start-start-radius: 0;
          border-end-start-radius: 0;
        }
        :host([attached]) ::slotted(:not(:last-child)) {
          border-start-end-radius: 0;
          border-end-end-radius: 0;
        }
        :host([attached]) ::slotted(:hover),
        :host([attached]) ::slotted(:focus-visible) {
          z-index: 1;
        }
      `,
    ],
  },
);
