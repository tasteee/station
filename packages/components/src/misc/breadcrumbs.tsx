import { autoPosition } from "@station/behaviors";
import { c, css, useEffect, useHost, useInternals, useRef, useState } from "atomico";
import { usePressable } from "../button/button-base.ts";
import { fire } from "../shared/events.ts";
import { hostReset } from "../shared/styles.ts";

type Crumb = HTMLElement & { value?: string; icon?: string; current?: boolean };
const crumbsOf = (host: HTMLElement) =>
  [...host.children].filter((c) => c.localName === "st-crumb") as Crumb[];
const text = (c: Crumb) => c.textContent?.trim() ?? "";

/**
 * Path navigation (folders, nested frames, compositions). The last crumb is the
 * current page. When space runs out, middle crumbs fold into a "…" menu.
 * Crumbs fire `select`.
 *
 * <st-breadcrumbs>
 *   <st-crumb value="project" icon="folder">Project</st-crumb>
 *   <st-crumb value="assets">Assets</st-crumb>
 *   <st-crumb value="icons">Icons</st-crumb>
 * </st-breadcrumbs>
 */
export const Breadcrumbs = c(
  ({ label }) => {
    const host = useHost();
    const internals = useInternals();
    const [hidden, setHidden] = useState<Crumb[]>([]);
    const firstSlot = useRef<HTMLSlotElement>();
    const restSlot = useRef<HTMLSlotElement>();
    const more = useRef<HTMLButtonElement>();
    const menu = useRef<HTMLElement>();

    const layout = () => {
      const el = host.current as HTMLElement;
      const crumbs = crumbsOf(el);
      crumbs.forEach((c, i) => {
        c.current = i === crumbs.length - 1;
        c.removeAttribute("data-collapsed");
      });
      firstSlot.current?.assign(...crumbs.slice(0, 1));
      restSlot.current?.assign(...crumbs.slice(1));
      // Fold from the second crumb onward until everything fits (keep first and last).
      const folded: Crumb[] = [];
      for (let i = 1; i < crumbs.length - 1 && el.scrollWidth > el.clientWidth + 1; i++) {
        crumbs[i]!.setAttribute("data-collapsed", "");
        folded.push(crumbs[i]!);
      }
      setHidden(folded);
    };

    useEffect(() => {
      internals.role = "navigation";
      internals.ariaLabel = label ?? "Breadcrumb";
    }, [label]);

    useEffect(() => {
      const el = host.current as HTMLElement;
      const ro = new ResizeObserver(() => requestAnimationFrame(layout));
      ro.observe(el);
      const mo = new MutationObserver(() => requestAnimationFrame(layout));
      mo.observe(el, { childList: true, characterData: true, subtree: true });
      layout();
      return () => {
        ro.disconnect();
        mo.disconnect();
      };
    }, []);

    return (
      <host shadowDom={{ slotAssignment: "manual" }}>
        <slot ref={firstSlot} />
        {hidden.length > 0 && (
          <>
            <button
              ref={more}
              type="button"
              class="more"
              aria-label={`Show ${hidden.length} more`}
              aria-haspopup="menu"
              onclick={() => {
                menu.current!.showPopover();
                autoPosition(more.current!, menu.current!, { placement: "bottom-start" });
              }}
            >
              …
            </button>
            <span class="sep" aria-hidden="true">
              /
            </span>
            <div ref={menu} class="menu" popover="auto" role="menu">
              {hidden.map((c) => (
                <button
                  type="button"
                  role="menuitem"
                  onclick={() => {
                    menu.current!.hidePopover();
                    fire(c, "select", { value: c.value ?? text(c) });
                  }}
                >
                  {text(c)}
                </button>
              ))}
            </div>
          </>
        )}
        <slot ref={restSlot} />
      </host>
    );
  },
  {
    props: { label: { type: String, reflect: true } },
    styles: [
      hostReset,
      css`
        :host {
          display: flex;
          align-items: center;
          min-width: 0;
          overflow: hidden;
          white-space: nowrap;
          font-size: var(--st-control-font-size, var(--st-text-2));
        }
        ::slotted([data-collapsed]) {
          display: none !important;
        }
        .more {
          all: unset;
          padding: 0 var(--st-space-1);
          border-radius: var(--st-radius-1);
          color: var(--st-text-muted);
        }
        .more:hover {
          background: var(--st-bg-hover);
          color: var(--st-text-strong);
        }
        .more:focus-visible {
          outline: var(--st-focus-ring-width) solid var(--st-border-focus);
        }
        .sep {
          padding-inline: var(--st-space-1);
          color: var(--st-text-faint);
        }
        .menu {
          margin: 0;
          inset: auto;
          padding: var(--st-space-1);
          border: 0;
          border-radius: var(--st-radius-3);
          background: var(--st-bg-panel);
          color: var(--st-text);
          box-shadow: var(--st-shadow-popover);
        }
        .menu:popover-open {
          display: flex;
          flex-direction: column;
        }
        .menu button {
          all: unset;
          height: var(--st-control-height);
          padding-inline: var(--st-space-2);
          border-radius: var(--st-radius-1);
          color: var(--st-text-strong);
        }
        .menu button:hover,
        .menu button:focus {
          background: var(--st-bg-selected-strong);
          color: var(--st-text-on-accent);
        }
      `,
    ],
  },
);

/** One step of a path in st-breadcrumbs. */
export const Crumb = c(
  ({ value, icon, current }) => {
    const host = useHost<Crumb>();
    const { internals, ...handlers } = usePressable({
      disabled: !!current,
      role: "link",
      onPress: () => fire(host.current, "select", { value: value ?? text(host.current) }),
    });
    useEffect(() => {
      internals.ariaCurrent = current ? "page" : null;
      internals.ariaDisabled = null;
    }, [current]);
    return (
      <host shadowDom {...handlers}>
        <span class="crumb" part="crumb">
          {icon && <st-icon name={icon} />}
          <slot />
        </span>
        {!current && (
          <span class="sep" aria-hidden="true">
            /
          </span>
        )}
      </host>
    );
  },
  {
    props: {
      value: { type: String, reflect: true },
      icon: { type: String, reflect: true },
      current: { type: Boolean, reflect: true },
    },
    styles: [
      hostReset,
      css`
        :host {
          display: inline-flex;
          align-items: center;
          flex: none;
          min-width: 0;
          outline: none;
          cursor: default;
          --st-icon-size: 14px;
        }
        .crumb {
          display: inline-flex;
          align-items: center;
          gap: var(--st-space-1);
          min-width: 0;
          padding: 2px var(--st-space-1);
          border-radius: var(--st-radius-1);
          color: var(--st-text-muted);
          overflow: hidden;
          text-overflow: ellipsis;
        }
        :host(:hover:not([current])) .crumb {
          background: var(--st-bg-hover);
          color: var(--st-text-strong);
        }
        /* Only the current crumb shrinks; the rest fold into "…" instead. */
        :host([current]) {
          flex: 0 1 auto;
        }
        :host([current]) .crumb {
          color: var(--st-text-strong);
          font-weight: var(--st-weight-medium);
        }
        :host(:focus-visible) .crumb {
          outline: var(--st-focus-ring-width) solid var(--st-border-focus);
        }
        .sep {
          padding-inline: var(--st-space-1);
          color: var(--st-text-faint);
        }
      `,
    ],
  },
);
