export type Orientation = "horizontal" | "vertical" | "both";

export interface RovingFocusOptions {
  /** Current focusable items, in order. Disabled items should be excluded. */
  items: () => HTMLElement[];
  orientation?: Orientation;
  /** Wrap from last to first. Default true. */
  loop?: boolean;
  /** Called when the active item changes (keyboard or focus). */
  onActivate?: (item: HTMLElement) => void;
}

/**
 * One tab stop for a group; arrow keys move between items.
 * Used by toolbars, segmented controls, radio groups, menus, trees.
 */
export function createRovingFocus(container: HTMLElement, options: RovingFocusOptions) {
  const { orientation = "horizontal", loop = true } = options;
  let active: HTMLElement | null = null;

  const prevKeys =
    orientation === "vertical"
      ? ["ArrowUp"]
      : orientation === "horizontal"
        ? ["ArrowLeft"]
        : ["ArrowLeft", "ArrowUp"];
  const nextKeys =
    orientation === "vertical"
      ? ["ArrowDown"]
      : orientation === "horizontal"
        ? ["ArrowRight"]
        : ["ArrowRight", "ArrowDown"];

  function sync() {
    const items = options.items();
    if (!active || !items.includes(active)) active = items.find((i) => i.tabIndex === 0) ?? items[0] ?? null;
    for (const item of items) item.tabIndex = item === active ? 0 : -1;
  }

  function activate(item: HTMLElement, focus = true) {
    active = item;
    sync();
    if (focus) item.focus();
    options.onActivate?.(item);
  }

  function onKeyDown(event: KeyboardEvent) {
    const items = options.items();
    if (!items.length) return;
    const rtl = getComputedStyle(container).direction === "rtl";
    let key = event.key;
    if (rtl && (key === "ArrowLeft" || key === "ArrowRight"))
      key = key === "ArrowLeft" ? "ArrowRight" : "ArrowLeft";
    const current = items.indexOf(active ?? items[0]!);
    let next = -1;
    if (prevKeys.includes(key)) next = current - 1;
    else if (nextKeys.includes(key)) next = current + 1;
    else if (key === "Home") next = 0;
    else if (key === "End") next = items.length - 1;
    else return;

    if (loop) next = (next + items.length) % items.length;
    else next = Math.max(0, Math.min(items.length - 1, next));
    event.preventDefault();
    activate(items[next]!);
  }

  function onFocusIn(event: FocusEvent) {
    const items = options.items();
    const item = event.composedPath().find((n) => items.includes(n as HTMLElement)) as
      | HTMLElement
      | undefined;
    if (item && item !== active) {
      active = item;
      sync();
      options.onActivate?.(item);
    }
  }

  container.addEventListener("keydown", onKeyDown);
  container.addEventListener("focusin", onFocusIn);
  sync();

  return {
    /** Re-read items (call after children change). */
    update: sync,
    /** Make an item the tab stop, optionally focusing it. */
    activate,
    get active() {
      return active;
    },
    destroy() {
      container.removeEventListener("keydown", onKeyDown);
      container.removeEventListener("focusin", onFocusIn);
    },
  };
}
