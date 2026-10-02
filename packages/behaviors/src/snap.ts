/**
 * Snapping for canvases: pure math, no DOM. Works for DOM, SVG and <canvas> apps alike.
 *
 * Targets are document-space lines: x positions (vertical lines) and y positions
 * (horizontal lines). A rect snaps by its left / center / right and top / middle / bottom.
 */

export interface SnapRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SnapTargets {
  x: number[];
  y: number[];
}

export interface SnapResult {
  /** Offset to add to the rect (0 when nothing snapped on that axis). */
  dx: number;
  dy: number;
  /** The target lines that matched, for drawing snap lines. */
  x: number | null;
  y: number | null;
}

/** Closest target within `threshold` of any candidate; returns the offset or null. */
function nearest(candidates: number[], targets: number[], threshold: number) {
  let best: { delta: number; target: number } | null = null;
  for (const c of candidates) {
    for (const t of targets) {
      const delta = t - c;
      if (Math.abs(delta) <= threshold && (!best || Math.abs(delta) < Math.abs(best.delta)))
        best = { delta, target: t };
    }
  }
  return best;
}

/** Snap one value to the closest target within `threshold`. */
export function snapValue(
  value: number,
  targets: number[],
  threshold: number,
): { value: number; target: number | null } {
  const hit = nearest([value], targets, threshold);
  return hit ? { value: value + hit.delta, target: hit.target } : { value, target: null };
}

/** Snap a rect's edges and center to the target lines (independently per axis). */
export function snapRect(rect: SnapRect, targets: SnapTargets, threshold: number): SnapResult {
  const hx = nearest([rect.x, rect.x + rect.width / 2, rect.x + rect.width], targets.x, threshold);
  const hy = nearest([rect.y, rect.y + rect.height / 2, rect.y + rect.height], targets.y, threshold);
  return { dx: hx?.delta ?? 0, dy: hy?.delta ?? 0, x: hx?.target ?? null, y: hy?.target ?? null };
}

/** Edge and center lines of rects, for use as snap targets. */
export function rectLines(rects: SnapRect[]): SnapTargets {
  const x: number[] = [];
  const y: number[] = [];
  for (const r of rects) {
    x.push(r.x, r.x + r.width / 2, r.x + r.width);
    y.push(r.y, r.y + r.height / 2, r.y + r.height);
  }
  return { x, y };
}

/** Grid lines around a value range (so a grid can join the targets without listing it all). */
export function gridLines(from: number, to: number, size: number): number[] {
  if (!(size > 0)) return [];
  const out: number[] = [];
  for (let v = Math.floor(from / size) * size; v <= to + size; v += size) out.push(v);
  return out;
}

/** Union bounds of rects, or null when empty. */
export function boundsOf(rects: SnapRect[]): SnapRect | null {
  if (!rects.length) return null;
  let x1 = Number.POSITIVE_INFINITY;
  let y1 = Number.POSITIVE_INFINITY;
  let x2 = Number.NEGATIVE_INFINITY;
  let y2 = Number.NEGATIVE_INFINITY;
  for (const r of rects) {
    x1 = Math.min(x1, r.x);
    y1 = Math.min(y1, r.y);
    x2 = Math.max(x2, r.x + r.width);
    y2 = Math.max(y2, r.y + r.height);
  }
  return { x: x1, y: y1, width: x2 - x1, height: y2 - y1 };
}

/** True when two rects overlap (touching edges do not count). */
export function intersects(a: SnapRect, b: SnapRect): boolean {
  return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
}
