import { createRovingFocus } from "@station/behaviors";
import { c, css, useEffect, useHost, useInternals, useProp, useRef } from "atomico";
import { fire } from "../shared/events.ts";
import { controlBase, hostReset } from "../shared/styles.ts";

type Tab = HTMLElement & { value?: string; selected?: boolean; disabled?: boolean };
type Panel = HTMLElement & { value?: string };

const tabsOf = (host: HTMLElement) => [...host.children].filter((c) => c.localName === "st-tab") as Tab[];
const panelsOf = (host: HTMLElement) =>
  [...host.children].filter((c) => c.localName === "st-tab-panel") as Panel[];

/**
 * Tabs. No slot attributes needed: st-tab children go in the tab bar,
 * the st-tab-panel with the matching value is shown.
 *
 * <st-tabs value="design">
 *   <st-tab value="design">Design</st-tab>
 *   <st-tab value="prototype">Prototype</st-tab>
 *   <st-tab-panel value="design">…</st-tab-panel>
 *   <st-tab-panel value="prototype">…</st-tab-panel>
 * </st-tabs>
 */
export const Tabs = c(
  ({ label }) => {
    const host = useHost();
    const [value, setValue] = useProp<string>("value");
    const tabSlot = useRef<HTMLSlotElement>();
    const panelSlot = useRef<HTMLSlotElement>();
    const actionSlot = useRef<HTMLSlotElement>();
    const roving = useRef<ReturnType<typeof createRovingFocus>>();

    const current = () => {
      const el = host.current as HTMLElement & { value?: string };
      const tabs = tabsOf(el);
      return el.value ?? tabs.find((t) => !t.disabled)?.value;
    };

    const assign = () => {
      const el = host.current as HTMLElement;
      const active = current();
      const tabs = tabsOf(el);
      for (const t of tabs) t.selected = t.value === active;
      tabSlot.current?.assign(...tabs);
      actionSlot.current?.assign(...[...el.children].filter((c) => c.getAttribute("slot") === "actions"));
      panelSlot.current?.assign(...panelsOf(el).filter((p) => p.value === active));
      roving.current?.update();
      const activeTab = tabs.find((t) => t.value === active);
      if (activeTab && roving.current && roving.current.active !== activeTab)
        roving.current.activate(activeTab, false);
    };

    useEffect(() => {
      const el = host.current as HTMLElement;
      const list = el.shadowRoot!.querySelector(".list") as HTMLElement;
      roving.current = createRovingFocus(list, {
        items: () => tabsOf(el).filter((t) => !t.disabled),
        onActivate: (tab) => select(tab as Tab),
      });
      const observer = new MutationObserver(assign);
      observer.observe(el, {
        childList: true,
        attributes: true,
        subtree: false,
        attributeFilter: ["value", "slot"],
      });
      assign();
      return () => {
        observer.disconnect();
        roving.current?.destroy();
      };
    }, []);

    useEffect(assign, [value]);

    const select = (tab: Tab) => {
      if (tab.disabled || tab.value === current()) return;
      setValue(tab.value);
      fire(host.current, "change");
    };

    return (
      <host shadowDom={{ slotAssignment: "manual" }}>
        <div class="bar" part="bar">
          <div
            class="list"
            part="list"
            role="tablist"
            aria-label={label}
            onclick={(e: Event) => {
              const tab = e.composedPath().find((n) => (n as Element).localName === "st-tab") as
                | Tab
                | undefined;
              if (tab) select(tab);
            }}
          >
            <slot ref={tabSlot} name="tabs" />
          </div>
          <span class="actions">
            <slot ref={actionSlot} name="actions" />
          </span>
        </div>
        <div class="panel" part="panel">
          <slot ref={panelSlot} name="panel" />
        </div>
      </host>
    );
  },
  {
    props: {
      value: { type: String, reflect: true },
      label: { type: String, reflect: true },
      divided: { type: Boolean, reflect: true },
    },
    styles: [
      hostReset,
      css`
        :host {
          display: flex;
          flex-direction: column;
          min-height: 0;
        }
        .bar {
          display: flex;
          align-items: center;
          gap: var(--st-space-2);
          flex: none;
          min-height: calc(var(--st-control-height) + var(--st-space-3));
          padding-inline: var(--st-space-1-5) var(--st-space-2);
        }
        :host([divided]) .bar {
          border-block-end: 1px solid var(--st-border-subtle);
        }
        .list {
          display: flex;
          align-items: center;
          gap: var(--st-space-0-5);
          flex: 1;
          min-width: 0;
          overflow-x: auto;
          scrollbar-width: none;
        }
        .actions {
          display: flex;
          align-items: center;
          gap: var(--st-space-0-5);
        }
        .panel {
          display: flex;
          flex-direction: column;
          flex: 1;
          min-height: 0;
        }
      `,
    ],
  },
);

/** One tab in <st-tabs>. */
export const TabItem = c(
  ({ selected, disabled, icon }) => {
    const internals = useInternals();
    useEffect(() => {
      internals.role = "tab";
      internals.ariaSelected = selected ? "true" : "false";
      internals.ariaDisabled = disabled ? "true" : null;
    }, [selected, disabled]);
    return (
      <host shadowDom>
        {icon && <st-icon name={icon} />}
        <slot />
      </host>
    );
  },
  {
    props: {
      value: { type: String, reflect: true },
      icon: { type: String, reflect: true },
      selected: { type: Boolean, reflect: true },
      disabled: { type: Boolean, reflect: true },
    },
    styles: [
      hostReset,
      controlBase,
      css`
        :host {
          display: inline-flex;
          align-items: center;
          gap: var(--st-space-1-5);
          flex: none;
          height: var(--_height);
          padding-inline: var(--st-space-1-5);
          border-radius: var(--st-radius-2);
          color: var(--st-text-muted);
          font-weight: var(--st-weight-medium);
          white-space: nowrap;
          cursor: default;
        }
        :host(:hover) {
          color: var(--st-text-strong);
        }
        :host([selected]) {
          color: var(--st-text-strong);
          background: var(--st-bg-pressed); /* navigation stays neutral */
        }
        :host(:focus-visible) {
          outline-offset: -1px;
        }
      `,
    ],
  },
);

/** Content for one tab. Only the selected panel is rendered. */
export const TabPanel = c(
  () => {
    const internals = useInternals();
    useEffect(() => {
      internals.role = "tabpanel";
    }, []);
    return (
      <host shadowDom>
        <slot />
      </host>
    );
  },
  {
    props: { value: { type: String, reflect: true } },
    styles: [
      hostReset,
      css`
        :host {
          display: flex;
          flex-direction: column;
          flex: 1;
          min-height: 0;
        }
      `,
    ],
  },
);
