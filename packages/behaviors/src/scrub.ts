export interface ScrubOptions {
  /** Pixels of movement before a press becomes a drag. Default 3. */
  threshold?: number;
  /** Lock the pointer so drags can go past the screen edge. Default true. */
  pointerLock?: boolean;
  onStart?: (event: PointerEvent) => void;
  /** Horizontal movement since the last call, in CSS pixels. */
  onMove: (dx: number, event: PointerEvent) => void;
  /** `cancelled` is true when Escape ended the drag. */
  onEnd?: (cancelled: boolean) => void;
  /** A press that never became a drag. */
  onClick?: (event: PointerEvent) => void;
}

/**
 * Drag-to-change for number fields and knobs.
 * Uses pointer lock when available so the value keeps changing at the screen edge.
 */
export function createScrub(target: HTMLElement, options: ScrubOptions) {
  const { threshold = 3, pointerLock = true } = options;
  let pointerId: number | null = null;
  let startX = 0;
  let dragging = false;

  function onPointerDown(event: PointerEvent) {
    if (event.button !== 0 || pointerId !== null) return;
    pointerId = event.pointerId;
    startX = event.clientX;
    dragging = false;
    target.setPointerCapture(event.pointerId);
    event.preventDefault();
  }

  function onPointerMove(event: PointerEvent) {
    if (event.pointerId !== pointerId) return;
    if (!dragging) {
      if (Math.abs(event.clientX - startX) < threshold) return;
      dragging = true;
      document.documentElement.dataset.stScrubbing = "";
      if (pointerLock && target.requestPointerLock) {
        Promise.resolve()
          .then(() => target.requestPointerLock())
          .catch(() => {});
      }
      options.onStart?.(event);
      options.onMove(event.clientX - startX, event);
      return;
    }
    const dx = document.pointerLockElement === target ? event.movementX : event.movementX || 0;
    if (dx) options.onMove(dx, event);
  }

  function finish(event: PointerEvent | null, cancelled: boolean) {
    if (pointerId === null) return;
    if (event && target.hasPointerCapture(pointerId)) target.releasePointerCapture(pointerId);
    pointerId = null;
    if (document.pointerLockElement === target) document.exitPointerLock();
    delete document.documentElement.dataset.stScrubbing;
    if (dragging) options.onEnd?.(cancelled);
    else if (event && !cancelled) options.onClick?.(event);
    dragging = false;
  }

  const onPointerUp = (event: PointerEvent) => event.pointerId === pointerId && finish(event, false);
  const onPointerCancel = (event: PointerEvent) => event.pointerId === pointerId && finish(event, true);
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape" && dragging) {
      event.preventDefault();
      finish(null, true);
    }
  };

  target.addEventListener("pointerdown", onPointerDown);
  target.addEventListener("pointermove", onPointerMove);
  target.addEventListener("pointerup", onPointerUp);
  target.addEventListener("pointercancel", onPointerCancel);
  window.addEventListener("keydown", onKeyDown, true);

  return {
    get dragging() {
      return dragging;
    },
    destroy() {
      target.removeEventListener("pointerdown", onPointerDown);
      target.removeEventListener("pointermove", onPointerMove);
      target.removeEventListener("pointerup", onPointerUp);
      target.removeEventListener("pointercancel", onPointerCancel);
      window.removeEventListener("keydown", onKeyDown, true);
    },
  };
}
