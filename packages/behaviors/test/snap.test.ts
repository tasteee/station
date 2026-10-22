import { describe, expect, it } from "vitest";
import { boundsOf, gridLines, intersects, rectLines, snapRect, snapValue } from "../src/snap.ts";

describe("snap", () => {
  it("snaps a value to the closest target within the threshold", () => {
    expect(snapValue(98, [0, 100, 200], 4)).toEqual({ value: 100, target: 100 });
    expect(snapValue(90, [0, 100], 4)).toEqual({ value: 90, target: null });
    expect(snapValue(101, [100, 102], 4)).toEqual({ value: 100, target: 100 });
  });

  it("snaps a rect by edges or center, each axis on its own", () => {
    const r = { x: 47, y: 10, width: 100, height: 40 };
    // left edge 47 → 50; center y 30 → 32
    expect(snapRect(r, { x: [50], y: [32] }, 4)).toEqual({ dx: 3, dy: 2, x: 50, y: 32 });
    // right edge 147 → 150
    expect(snapRect(r, { x: [150], y: [] }, 4)).toMatchObject({ dx: 3, dy: 0, x: 150, y: null });
    // picks the closest match across edges
    expect(snapRect(r, { x: [44, 148], y: [] }, 4).dx).toBe(1);
  });

  it("builds target lines from rects and grids", () => {
    expect(rectLines([{ x: 0, y: 0, width: 10, height: 20 }])).toEqual({ x: [0, 5, 10], y: [0, 10, 20] });
    expect(gridLines(13, 31, 10)).toEqual([10, 20, 30, 40]);
    expect(gridLines(0, 10, 0)).toEqual([]);
  });

  it("computes bounds and intersection", () => {
    expect(
      boundsOf([
        { x: 10, y: 10, width: 10, height: 10 },
        { x: -5, y: 30, width: 5, height: 5 },
      ]),
    ).toEqual({ x: -5, y: 10, width: 25, height: 25 });
    expect(boundsOf([])).toBeNull();
    const a = { x: 0, y: 0, width: 10, height: 10 };
    expect(intersects(a, { x: 5, y: 5, width: 10, height: 10 })).toBe(true);
    expect(intersects(a, { x: 10, y: 0, width: 5, height: 5 })).toBe(false);
  });
});
