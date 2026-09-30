import { createRovingFocus, createTypeahead, type Placement } from "@station/behaviors";
import { c, css, useEffect, useHost, useInternals, useProp, useRef } from "atomico";
import { fire, fireOpenChange } from "../shared/events.ts";
import { bindTrigger, createFloating, type TriggerMode } from "../shared/floating.ts";
import { floatingSurface, hostReset } from "../shared/styles.ts";

export type MenuItemEl = HTMLElement & {
  value?: string;
  type?: "normal" | "checkbox" | "radio";
  checked?: boolean;
  disabled?: boolean;
  group?: string;
  keepOpen?: boolean;
};
export type MenuEl = HTMLElement & {
  show(anchor?: Element | { x: number; y: number }, via?: "pointer" | "keyboard"): void;
  hide(): void;
};

const CONTROLLER = Symbol("menu");
type Controller = { show: MenuEl["show"]; hide: () => void };

const itemsOf = (menu: HTMLElement) =>
  [...menu.children].filter(
    (c) => c.localName === "st-menu-item" && !(c as MenuItemEl).disabled && !(c as HTMLElement).hidden,
  ) as MenuItemEl[];
export const submenuOf = (item: Element) => item.querySelector(":scope > st-menu") as MenuEl | null;
/** The item's own text, ignoring any nested submenu. */
const labelOf = (item: Element) =>
  [...item.childNodes]
    .filter((n) => n.nodeType === Node.TEXT_NODE)
    .map((n) => n.textContent)
    .join("")
    .trim();

/** The outermost open menu containing `menu`. Closing it closes every submenu too. */
function rootMenu(menu: HTMLElement): MenuEl {
  let current = menu;
  for (
    let parent = current.parentElement?.closest("st-menu");
    parent;
    parent = parent.parentElement?.closest("st-menu")
  ) {
    current = parent as HTMLElement;
  }
  return current as MenuEl;
}

/** Run an item: open its submenu, or toggle/check it, fire `select`, and close. */
export function activateItem(item: MenuItemEl, via: "pointer" | "keyboard") {
  if (item.disabled) return;
  const submenu = submenuOf(item);
  if (submenu) {
    submenu.show(item, via);
    return;
  }
  if (item.type === "checkbox") item.checked = !item.checked;
  if (item.type === "radio") {
    const menu = item.parentElement!;
    for (const sibling of menu.querySelectorAll<MenuItemEl>(":scope > st-menu-item[type='radio']")) {
      if ((sibling.group ?? "") === (item.group ?? "")) sibling.checked = sibling === item;
    }
  }
  fire(item, "select", { value: item.value ?? labelOf(item), checked: item.checked ?? false });
  if (!item.keepOpen) rootMenu(item.closest("st-menu")!).hide();
}

/**
 * A menu in the top layer. Attach it to a trigger with `for`:
 *
 * <st-icon-button id="more" icon="dots" label="More"></st-icon-button>
 * <st-menu for="more">
 *   <st-menu-item shortcut="Mod+D">Duplicate</st-menu-item>
 *   <st-menu-item tone="danger" shortcut="Delete">Delete</st-menu-item>
 * </st-menu>
 *
 * `trigger="contextmenu"` opens it at the pointer on right-click of the `for` element.
 * Or call menu.show(anchorOrPoint) yourself.
 */
export const Menu = c(
  ({ for: forId, trigger, label }) => {
    const host = useHost<MenuEl & { [CONTROLLER]?: Controller; placement?: Placement }>();
    const internals = useInternals();
    const [open, setOpen] = useProp<boolean>("open");
    const floating = useRef<ReturnType<typeof createFloating>>();
    const roving = useRef<ReturnType<typeof createRovingFocus>>();
    const typeahead = useRef(createTypeahead());
    const hoverTimer = useRef<ReturnType<typeof setTimeout>>();

    const el = host.current;
    const isSubmenu = () => el.parentElement?.localName === "st-menu-item";

    useEffect(() => {
      el.popover = "auto";
      el.tabIndex = -1;
      internals.role = "menu";
      floating.current = createFloating(
        el,
        () => el.placement ?? (isSubmenu() ? "right-start" : "bottom-start"),
        isSubmenu() ? -2 : 4,
      );
      roving.current = createRovingFocus(el, { orientation: "vertical", items: () => itemsOf(el) });
      el[CONTROLLER] = {
        show(anchor, via = "pointer") {
          const target =
            anchor ??
            (isSubmenu()
              ? el.parentElement!
              : el.getRootNode() instanceof Document
                ? document.getElementById(forId ?? "")
                : null);
          if (!target) return;
          floating.current!.show(target as HTMLElement);
          requestAnimationFrame(() => {
            const items = itemsOf(el);
            roving.current!.update();
            if (via === "keyboard" && items[0]) roving.current!.activate(items[0]);
            else el.focus({ preventScroll: true });
          });
        },
        hide: () => floating.current!.hide(),
      };
      return () => roving.current?.destroy();
    }, []);

    useEffect(() => {
      internals.ariaLabel = label ?? null;
    }, [label]);

    useEffect(() => {
      if (!forId || isSubmenu()) return;
      return bindTrigger(el, forId, (trigger as TriggerMode) ?? "click", {
        open: (anchor, via) => el.show(anchor as HTMLElement, via),
        isOpen: () => el.matches(":popover-open"),
      });
    }, [forId, trigger]);

    const ontoggle = (e: ToggleEvent) => {
      if (e.target !== el) return;
      const isOpen = e.newState === "open";
      if (!isOpen) floating.current?.closed();
      if (isOpen !== !!open) {
        setOpen(isOpen);
        fireOpenChange(el, isOpen);
      }
    };

    const onkeydown = (e: KeyboardEvent) => {
      // Events from nested submenus bubble through; only handle our own.
      if ((e.target as Element).closest("st-menu") !== el) return;
      const item = (e.target as Element).closest("st-menu-item") as MenuItemEl | null;
      const items = itemsOf(el);
      if ((e.key === "Enter" || e.key === " ") && item) {
        e.preventDefault();
        activateItem(item, "keyboard");
      } else if (e.key === "ArrowRight" && item && submenuOf(item)) {
        e.preventDefault();
        submenuOf(item)!.show(item, "keyboard");
      } else if (e.key === "ArrowLeft" && isSubmenu()) {
        e.preventDefault();
        el.hide();
      } else if (e.key === "Tab") {
        e.preventDefault();
        rootMenu(el).hide();
      } else if ((e.key === "ArrowDown" || e.key === "ArrowUp") && e.target === el && items.length) {
        e.preventDefault();
        roving.current!.activate(e.key === "ArrowDown" ? items[0]! : items.at(-1)!);
      } else if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && e.key !== " ") {
        const i = typeahead.current(e.key, items.map(labelOf), item ? items.indexOf(item) : -1);
        if (i >= 0) roving.current!.activate(items[i]!);
      }
    };

    const onclick = (e: MouseEvent) => {
      const item = (e.target as Element).closest("st-menu-item") as MenuItemEl | null;
      if (item && item.closest("st-menu") === el) activateItem(item, "pointer");
    };

    const onpointermove = (e: PointerEvent) => {
      const item = (e.target as Element).closest("st-menu-item") as MenuItemEl | null;
      if (!item || item.closest("st-menu") !== el || item.disabled) return;
      if (document.activeElement !== item) roving.current!.activate(item);
      clearTimeout(hoverTimer.current);
      hoverTimer.current = setTimeout(() => {
        for (const other of itemsOf(el)) if (other !== item) submenuOf(other)?.hide();
        submenuOf(item)?.show(item, "pointer");
      }, 120);
    };

    return (
      <host
        shadowDom
        ontoggle={ontoggle}
        onkeydown={onkeydown}
        onclick={onclick}
        onpointermove={onpointermove}
      >
        <slot
          onslotchange={() => {
            const leading = itemsOf(el).some(
              (i) => i.type === "checkbox" || i.type === "radio" || i.hasAttribute("icon"),
            );
            el.style.setProperty("--_leading", leading ? "var(--st-icon-size)" : "0px");
            el.style.setProperty("--_leading-display", leading ? "inline-grid" : "none");
            roving.current?.update();
          }}
        />
      </host>
    );
  },
  {
    props: {
      for: { type: String, reflect: true },
      trigger: { type: String, reflect: true },
      placement: { type: String, reflect: true },
      label: { type: String, reflect: true },
      open: { type: Boolean, reflect: true },
    },
    styles: [
      hostReset,
      floatingSurface,
      css`
        :host {
          min-width: 180px;
          max-width: 320px;
          max-height: min(480px, var(--st-available-height, 480px));
          overflow: auto;
          padding: var(--st-space-1);
          margin: 0;
          outline: none;
          scrollbar-width: thin;
          overscroll-behavior: contain;
        }
        :host(:popover-open) {
          display: flex;
          flex-direction: column;
          gap: 1px;
        }
        ::slotted(st-divider) {
          margin: var(--st-space-1) calc(var(--st-space-1) * -1);
        }
        ::slotted(st-menu-label) {
          display: block;
          padding: var(--st-space-1-5) var(--st-space-2) var(--st-space-1);
          padding-inline-start: calc(var(--st-space-2) + var(--_leading, 0px) + var(--st-space-1-5));
          font-size: var(--st-text-1);
          font-weight: var(--st-weight-medium);
          color: var(--st-text-muted);
        }
      `,
    ],
  },
);

Object.assign(Menu.prototype, {
  async show(
    this: MenuEl & { [CONTROLLER]?: Controller; updated: Promise<void> },
    anchor?: Element | { x: number; y: number },
    via: "pointer" | "keyboard" = "pointer",
  ) {
    if (!this[CONTROLLER]) await this.updated;
    this[CONTROLLER]?.show(anchor, via);
  },
  hide(this: MenuEl & { [CONTROLLER]?: Controller }) {
    this[CONTROLLER]?.hide();
  },
});
