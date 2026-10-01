import { c, css, useHost, useProp } from "atomico";
import { fireOpenChange } from "../shared/events.ts";
import { hostReset } from "../shared/styles.ts";

/**
 * Titled group inside a panel. `collapsible` adds a chevron; `collapsed` hides the body.
 *
 * <st-section heading="Layout">…</st-section>
 * <st-section heading="Effects" collapsible collapsed>
 *   <st-icon-button slot="actions" icon="plus" label="Add effect"></st-icon-button>
 *   …
 * </st-section>
 */
export const Section = c(
  ({ heading, collapsible }) => {
    const host = useHost();
    const [collapsed, setCollapsed] = useProp<boolean>("collapsed");
    const open = !collapsible || !collapsed;

    const toggle = () => {
      if (!collapsible) return;
      setCollapsed(!collapsed);
      fireOpenChange(host.current, !!collapsed);
    };

    return (
      <host shadowDom>
        <div class="header" part="header">
          {collapsible ? (
            <button
              type="button"
              class="title toggle"
              part="title"
              aria-expanded={open ? "true" : "false"}
              aria-controls="body"
              onclick={toggle}
            >
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
              <span>{heading}</span>
              <slot name="heading" />
            </button>
          ) : (
            <h3 class="title" part="title">
              <span>{heading}</span>
              <slot name="heading" />
            </h3>
          )}
          <span class="actions">
            <slot name="actions" />
          </span>
        </div>
        <div class="body" id="body" part="body" inert={!open}>
          <div class="inner">
            <slot />
          </div>
        </div>
      </host>
    );
  },
  {
    props: {
      heading: { type: String, reflect: true },
      collapsible: { type: Boolean, reflect: true },
      collapsed: { type: Boolean, reflect: true },
      divided: { type: Boolean, reflect: true },
    },
    styles: [
      hostReset,
      css`
        :host {
          display: block;
          color: var(--st-text);
          padding-block-end: var(--st-space-2);
        }
        :host([divided]) {
          border-block-end: 1px solid var(--st-border-subtle);
        }
        :host([collapsible][collapsed]) {
          padding-block-end: 0;
        }
        .header {
          display: flex;
          align-items: center;
          gap: var(--st-space-1);
          min-height: calc(var(--st-control-height) + var(--st-space-2));
          padding-inline: var(--st-space-3) var(--st-space-2);
        }
        .title {
          all: unset;
          display: flex;
          align-items: center;
          gap: var(--st-space-1);
          flex: 1;
          min-width: 0;
          height: 100%;
          /* Micro-label legend: values carry the weight, labels stay quiet. */
          font: var(--st-weight-medium) calc(var(--st-text-1) * 0.94) / var(--st-leading-tight) var(--st-font-mono);
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--st-text-muted);
        }
        .toggle:hover {
          color: var(--st-text-strong);
        }
        .toggle {
          margin-inline-start: calc(var(--st-space-1) * -1 - 2px);
          cursor: default;
          border-radius: var(--st-radius-1);
        }
        .toggle:focus-visible {
          outline: var(--st-focus-ring-width) solid var(--st-border-focus);
          outline-offset: var(--st-focus-ring-offset);
        }
        .toggle:hover .chevron {
          color: var(--st-text-strong);
        }
        .chevron {
          width: 14px;
          height: 14px;
          flex: none;
          color: var(--st-text-muted);
          rotate: 90deg;
          transition: rotate var(--st-duration) var(--st-ease);
        }
        :host([collapsed]) .chevron {
          rotate: 0deg;
        }
        .title span {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .actions {
          display: flex;
          align-items: center;
          gap: var(--st-space-0-5);
          --st-control-height: var(--st-control-small);
          --st-icon-size: var(--st-icon-small);
        }
        .body {
          display: grid;
          grid-template-rows: 1fr;
          transition: grid-template-rows var(--st-duration) var(--st-ease);
        }
        :host([collapsible][collapsed]) .body {
          grid-template-rows: 0fr;
        }
        .inner {
          min-height: 0;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          gap: var(--st-space-1-5);
          padding-inline: var(--st-space-3);
        }
        :host([collapsible][collapsed]) .inner {
          visibility: hidden;
        }
      `,
    ],
  },
);
