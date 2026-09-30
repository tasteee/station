import { type Anchor, autoPosition, type Placement, pointAnchor } from "@station/behaviors";

/**
 * Host-as-popover helper for menus and popovers: top-layer [popover],
 * positioning, and returning focus to the anchor on close.
 */
export function createFloating(host: HTMLElement, getPlacement: () => Placement, offset = 4) {
  let stop: (() => void) | null = null;
  let anchor: Anchor | null = null;

  return {
    get anchor() {
      return anchor;
    },
    show(target: Anchor | { x: number; y: number }) {
      anchor = "getBoundingClientRect" in target ? target : pointAnchor(target.x, target.y);
      if (!host.matches(":popover-open")) host.showPopover();
      stop?.();
      stop = autoPosition(anchor, host, { placement: getPlacement(), offset });
    },
    hide() {
      if (host.matches(":popover-open")) host.hidePopover();
    },
    /** Call from the popover's `toggle` event when it closes. */
    closed() {
      stop?.();
      stop = null;
      const returnTo = anchor;
      // Wait a frame: if another menu opened in the meantime it has taken focus, so leave it.
      requestAnimationFrame(() => {
        const active = document.activeElement;
        const focusLost = !active || active === document.body || host.contains(active) || host === active;
        if (focusLost && returnTo instanceof HTMLElement && returnTo.isConnected)
          returnTo.focus({ preventScroll: true });
      });
      anchor = null;
    },
  };
}

export type TriggerMode = "click" | "contextmenu";

/**
 * Wire the element whose id is `forId` (in the same document or shadow root)
 * as a trigger. Listens at the root, so triggers can mount before or after.
 */
export function bindTrigger(
  host: HTMLElement,
  forId: string,
  mode: TriggerMode,
  handlers: {
    open: (anchor: Anchor | { x: number; y: number }, via: "pointer" | "keyboard") => void;
    isOpen: () => boolean;
  },
): () => void {
  const root = host.getRootNode() as Document | ShadowRoot;
  const findTrigger = (event: Event) =>
    event.composedPath().find((n) => (n as Element).id === forId) as HTMLElement | undefined;

  const sync = () => {
    const trigger = root.getElementById?.(forId) ?? null;
    if (trigger && mode === "click") {
      trigger.setAttribute("aria-haspopup", host.localName === "st-menu" ? "menu" : "dialog");
      trigger.setAttribute("aria-expanded", handlers.isOpen() ? "true" : "false");
    }
  };

  // Light dismiss closes the popover on pointerdown; don't let the click reopen it.
  let wasOpen = false;
  const onPointerDown = (event: Event) => {
    if (findTrigger(event)) wasOpen = handlers.isOpen();
  };
  const onClick = (event: Event) => {
    const trigger = findTrigger(event);
    if (!trigger) return;
    if (wasOpen) {
      wasOpen = false;
      return;
    }
    handlers.open(trigger, (event as MouseEvent).detail === 0 ? "keyboard" : "pointer");
  };
  const onKeyDown = (event: Event) => {
    const e = event as KeyboardEvent;
    const trigger = findTrigger(e);
    if (!trigger) return;
    if (mode === "click" && (e.key === "ArrowDown" || e.key === "ArrowUp") && !handlers.isOpen()) {
      e.preventDefault();
      handlers.open(trigger, "keyboard");
    }
    if (mode === "contextmenu" && (e.key === "ContextMenu" || (e.shiftKey && e.key === "F10"))) {
      e.preventDefault();
      const r = trigger.getBoundingClientRect();
      handlers.open({ x: r.left + 8, y: r.top + 8 }, "keyboard");
    }
  };
  // On Linux/macOS `contextmenu` fires while the button is still down. Opening
  // then would let the popover's light dismiss close it on pointerup, so wait.
  let buttonDown = false;
  const onAnyPointerDown = () => {
    buttonDown = true;
  };
  const onAnyPointerUp = () => {
    buttonDown = false;
  };
  const onContextMenu = (event: Event) => {
    const e = event as MouseEvent;
    if (!findTrigger(e)) return;
    e.preventDefault();
    const point = { x: e.clientX, y: e.clientY };
    if (buttonDown) {
      window.addEventListener("pointerup", () => setTimeout(() => handlers.open(point, "pointer")), {
        once: true,
        capture: true,
      });
    } else handlers.open(point, "pointer");
  };

  sync();
  if (mode === "click") {
    root.addEventListener("pointerdown", onPointerDown, true);
    root.addEventListener("click", onClick);
  } else {
    window.addEventListener("pointerdown", onAnyPointerDown, true);
    window.addEventListener("pointerup", onAnyPointerUp, true);
    root.addEventListener("contextmenu", onContextMenu);
  }
  root.addEventListener("keydown", onKeyDown);
  host.addEventListener("toggle", sync);
  return () => {
    root.removeEventListener("pointerdown", onPointerDown, true);
    root.removeEventListener("click", onClick);
    root.removeEventListener("contextmenu", onContextMenu);
    window.removeEventListener("pointerdown", onAnyPointerDown, true);
    window.removeEventListener("pointerup", onAnyPointerUp, true);
    root.removeEventListener("keydown", onKeyDown);
    host.removeEventListener("toggle", sync);
  };
}
