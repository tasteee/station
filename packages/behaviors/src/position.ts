/**
 * Place a floating element (tooltip, menu, listbox) next to an anchor.
 *
 * Why JS and not CSS anchor positioning: anchor names are scoped to one
 * shadow tree, and Station's anchors and popovers often live in different
 * trees. This is small, predictable, and handles flip + shift.
 */
export type Side = "top" | "bottom" | "left" | "right";
export type Align = "start" | "center" | "end";
export type Placement = Side | `${Side}-${Align}`;

export interface PositionOptions {
  placement?: Placement;
  /** Gap between anchor and floating element. Default 4. */
  offset?: number;
  /** Minimum distance from the viewport edge. Default 8. */
  padding?: number;
  /** Move to the opposite side when there isn't room. Default true. */
  flip?: boolean;
  /** Make the floating element at least as wide as the anchor. */
  matchWidth?: boolean;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PositionResult {
  x: number;
  y: number;
  placement: Placement;
  /** Height available on the chosen side; use as max-height. */
  maxHeight: number;
}

const OPPOSITE: Record<Side, Side> = { top: "bottom", bottom: "top", left: "right", right: "left" };

function split(placement: Placement): [Side, Align] {
  const [side, align = "center"] = placement.split("-") as [Side, Align?];
  return [side, align];
}

function place(a: Rect, f: { width: number; height: number }, side: Side, align: Align, offset: number) {
  const vertical = side === "top" || side === "bottom";
  let x = 0;
  let y = 0;
  if (vertical) {
    y = side === "bottom" ? a.y + a.height + offset : a.y - f.height - offset;
    x = align === "start" ? a.x : align === "end" ? a.x + a.width - f.width : a.x + (a.width - f.width) / 2;
  } else {
    x = side === "right" ? a.x + a.width + offset : a.x - f.width - offset;
    y =
      align === "start" ? a.y : align === "end" ? a.y + a.height - f.height : a.y + (a.height - f.height) / 2;
  }
  return { x, y };
}

function space(
  a: Rect,
  side: Side,
  viewport: { width: number; height: number },
  offset: number,
  padding: number,
) {
  switch (side) {
    case "bottom":
      return viewport.height - (a.y + a.height) - offset - padding;
    case "top":
      return a.y - offset - padding;
    case "right":
      return viewport.width - (a.x + a.width) - offset - padding;
    case "left":
      return a.x - offset - padding;
  }
}

/** Pure math: exported for tests and custom renderers. */
export function computePosition(
  anchor: Rect,
  floating: { width: number; height: number },
  viewport: { width: number; height: number },
  { placement = "bottom-start", offset = 4, padding = 8, flip = true }: PositionOptions = {},
): PositionResult {
  let [side, align] = split(placement);
  const needed = side === "top" || side === "bottom" ? floating.height : floating.width;
  if (flip && space(anchor, side, viewport, offset, padding) < needed) {
    const other = OPPOSITE[side];
    if (space(anchor, other, viewport, offset, padding) > space(anchor, side, viewport, offset, padding))
      side = other;
  }
  let { x, y } = place(anchor, floating, side, align, offset);
  // Shift along the cross axis to stay on screen.
  x = Math.min(Math.max(x, padding), Math.max(padding, viewport.width - floating.width - padding));
  y = Math.min(Math.max(y, padding), Math.max(padding, viewport.height - floating.height - padding));
  const maxHeight =
    side === "top" || side === "bottom"
      ? space(anchor, side, viewport, offset, padding)
      : viewport.height - 2 * padding;
  return { x, y, placement: align === "center" ? side : `${side}-${align}`, maxHeight };
}

/**
 * Keep `floating` (position: fixed, usually a [popover]) attached to `anchor`
 * while scrolling, resizing and content changes. Returns a cleanup function.
 */
export function autoPosition(
  anchor: Element,
  floating: HTMLElement,
  options: PositionOptions = {},
): () => void {
  let frame = 0;
  const update = () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      const a = anchor.getBoundingClientRect();
      if (options.matchWidth) floating.style.minWidth = `${a.width}px`;
      const f = floating.getBoundingClientRect();
      const result = computePosition(a, f, { width: window.innerWidth, height: window.innerHeight }, options);
      floating.style.left = `${Math.round(result.x)}px`;
      floating.style.top = `${Math.round(result.y)}px`;
      floating.style.setProperty("--st-available-height", `${Math.floor(result.maxHeight)}px`);
      floating.dataset.placement = result.placement;
    });
  };

  // Top-layer popovers default to inset:0; margin:auto. Pin them instead.
  floating.style.position = "fixed";
  floating.style.inset = "auto";
  floating.style.margin = "0";

  const observer = new ResizeObserver(update);
  observer.observe(anchor);
  observer.observe(floating);
  window.addEventListener("scroll", update, true);
  window.addEventListener("resize", update);
  update();

  return () => {
    cancelAnimationFrame(frame);
    observer.disconnect();
    window.removeEventListener("scroll", update, true);
    window.removeEventListener("resize", update);
  };
}
