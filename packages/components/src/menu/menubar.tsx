import { createRovingFocus } from "@station/behaviors";
import { c, css, useEffect, useHost, useRef, useState } from "atomico";
import { controlBase, hostReset } from "../shared/styles.ts";
import type { MenuEl } from "./menu.tsx";

type LabeledMenu = MenuEl & { label?: string };

const menusOf = (bar: HTMLElement) =>
  [...bar.children].filter((c) => c.localName === "st-menu") as LabeledMenu[];

/**
 * Application menubar. Each child st-menu becomes a top-level entry named by its `label`.
 * Hover switches between open menus; ←/→ move across the bar.
 *
 * <st-menubar>
 *   <st-menu label="File">…</st-menu>
 *   <st-menu label="Edit">…</st-menu>
 * </st-menubar>
 */
export const Menubar = c(
  ({ label }) => {
    const host = useHost();
    const [, rerender] = useState(0);
    const [openIndex, setOpenIndex] = useState(-1);
    const roving = useRef<ReturnType<typeof createRovingFocus>>();
    const bar = useRef<HTMLElement>();
    // The menu we last opened. Read by fast key repeats before focus has moved.
    const current = useRef(-1);

    const buttons = () => [...(bar.current?.querySelectorAll<HTMLButtonElement>("button") ?? [])];
    const el = host.current as HTMLElement;
    const menus = menusOf(el);

    const open = (index: number, via: "pointer" | "keyboard") => {
      const list = menusOf(el);
      const count = list.length;
      const i = (index + count) % count;
      const button = buttons()[i];
      if (!button) return;
      current.current = i;
      roving.current?.activate(button, false);
      list[i]!.show(button, via);
    };

    useEffect(() => {
      roving.current = createRovingFocus(bar.current!, { items: buttons });
      const onOpenChange = (e: Event) => {
        const menu = e.target as LabeledMenu;
        if (menu.parentElement !== el) return;
        const i = menusOf(el).indexOf(menu);
        const opened = (e as CustomEvent).detail.open;
        if (!opened && current.current === i) current.current = -1;
        setOpenIndex((prev) => (opened ? i : prev === i ? -1 : prev));
      };
      el.addEventListener("openchange", onOpenChange);
      const observer = new MutationObserver(() => rerender((n) => n + 1));
      observer.observe(el, { childList: true, subtree: false, attributes: true, attributeFilter: ["label"] });
      return () => {
        roving.current?.destroy();
        el.removeEventListener("openchange", onOpenChange);
        observer.disconnect();
      };
    }, []);

    useEffect(() => roving.current?.update());

    return (
      <host
        shadowDom
        onkeydown={(e: KeyboardEvent) => {
          if (e.defaultPrevented) return;
          const menu = (e.target as Element).closest?.("st-menu");
          // Inside an open top-level menu: ←/→ jump to the neighbouring menu.
          if (menu && menu.parentElement === el && (e.key === "ArrowLeft" || e.key === "ArrowRight")) {
            e.preventDefault();
            const from = current.current >= 0 ? current.current : menusOf(el).indexOf(menu as LabeledMenu);
            open(from + (e.key === "ArrowRight" ? 1 : -1), "keyboard");
          }
        }}
      >
        <div
          ref={bar}
          class="bar"
          role="menubar"
          aria-label={label}
          onkeydown={(e: KeyboardEvent) => {
            const i = buttons().indexOf(e.target as HTMLButtonElement);
            if (i < 0) return;
            if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              open(i, "keyboard");
            }
          }}
        >
          {menus.map((menu, i) => (
            <button
              type="button"
              role="menuitem"
              aria-haspopup="menu"
              aria-expanded={openIndex === i ? "true" : "false"}
              data-open={openIndex === i ? "" : null}
              onpointerdown={(e: PointerEvent) => {
                // Clicking the open entry closes it (light dismiss) and must not reopen.
                (e.currentTarget as HTMLElement).dataset.wasOpen = openIndex === i ? "1" : "";
              }}
              onclick={(e: MouseEvent) => {
                const b = e.currentTarget as HTMLElement;
                if (b.dataset.wasOpen === "1") return;
                open(i, e.detail === 0 ? "keyboard" : "pointer");
              }}
              onpointermove={() => {
                // pointermove, not pointerenter: a resting pointer mustn't switch menus
                // when the keyboard opens one.
                if (openIndex >= 0 && openIndex !== i) open(i, "pointer");
              }}
            >
              {menu.label}
            </button>
          ))}
        </div>
        <slot />
      </host>
    );
  },
  {
    props: { label: { type: String, reflect: true } },
    styles: [
      hostReset,
      controlBase,
      css`
        :host {
          display: flex;
          align-items: center;
          min-width: 0;
        }
        .bar {
          display: flex;
          align-items: center;
          gap: 1px;
        }
        button {
          all: unset;
          display: inline-flex;
          align-items: center;
          height: var(--st-control-height);
          padding-inline: var(--st-space-2);
          border-radius: var(--st-radius-2);
          color: var(--st-text-strong);
          font-size: var(--st-control-font-size);
          white-space: nowrap;
          cursor: default;
        }
        button:hover,
        button[data-open] {
          background: var(--st-bg-pressed);
        }
        button:focus-visible {
          outline: var(--st-focus-ring-width) solid var(--st-border-focus);
          outline-offset: -1px;
        }
      `,
    ],
  },
);
