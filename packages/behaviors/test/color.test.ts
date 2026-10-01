import { describe, expect, it } from "vitest";
import { contrastRatio, formatHex, hsvToRgb, parseColor, readableInk, rgbToHsv } from "../src/color.ts";

describe("color", () => {
  it("parses hex and rgb()", () => {
    expect(parseColor("#f80")).toEqual({ r: 255, g: 136, b: 0, a: 1 });
    expect(parseColor("ff880080")).toEqual({ r: 255, g: 136, b: 0, a: 0.502 });
    expect(parseColor("rgba(10, 20, 30, 0.5)")).toEqual({ r: 10, g: 20, b: 30, a: 0.5 });
    expect(parseColor("rgb(10 20 30 / 50%)")).toEqual({ r: 10, g: 20, b: 30, a: 0.5 });
    expect(parseColor("nope")).toBeNull();
  });
  it("formats hex with optional alpha", () => {
    expect(formatHex({ r: 255, g: 136, b: 0, a: 1 })).toBe("#ff8800");
    expect(formatHex({ r: 255, g: 136, b: 0, a: 0.5 })).toBe("#ff880080");
  });
  it("round-trips through HSV", () => {
    for (const hex of ["#ff0000", "#00ff00", "#3366cc", "#808080", "#000000", "#ffffff", "#c0ffee"]) {
      expect(formatHex(hsvToRgb(rgbToHsv(parseColor(hex)!)))).toBe(hex);
    }
    expect(rgbToHsv(parseColor("#3366cc")!).h).toBeCloseTo(220);
  });
});

import { fuzzyMatch } from "../src/fuzzy.ts";

describe("fuzzyMatch", () => {
  it("matches subsequences and ranks word starts higher", () => {
    expect(fuzzyMatch("gl", "Group Layers")!.indices).toEqual([0, 6]);
    expect(fuzzyMatch("xyz", "Group Layers")).toBeNull();
    const a = fuzzyMatch("fl", "Flatten Image")!.score;
    const b = fuzzyMatch("fl", "Transform Layer")!.score;
    expect(a).toBeGreaterThan(b);
  });
});

import { linearCurve, monotoneSpline } from "../src/curve.ts";

describe("curves", () => {
  it("passes through its points and stays monotone", () => {
    const pts = [
      { x: 0, y: 0 },
      { x: 0.25, y: 0.1 },
      { x: 0.5, y: 0.9 },
      { x: 1, y: 1 },
    ];
    const f = monotoneSpline(pts);
    for (const p of pts) expect(f(p.x)).toBeCloseTo(p.y);
    let prev = -1;
    for (let x = 0; x <= 1; x += 0.01) {
      const y = f(x);
      expect(y).toBeGreaterThanOrEqual(prev - 1e-9);
      expect(y).toBeLessThanOrEqual(1 + 1e-9);
      prev = y;
    }
  });
  it("interpolates linearly", () => {
    expect(
      linearCurve([
        { x: 0, y: 0 },
        { x: 1, y: 0.5 },
      ])(0.5),
    ).toBeCloseTo(0.25);
  });
});

describe("contrast", () => {
  it("matches WCAG reference values", () => {
    const black = parseColor("#000")!;
    const white = parseColor("#fff")!;
    expect(contrastRatio(black, white)).toBeCloseTo(21);
    expect(contrastRatio(parseColor("#767676")!, white)).toBeCloseTo(4.54, 1);
  });
  it("picks the more readable ink", () => {
    expect(readableInk("#1e1b4b")).toBe("#ffffff");
    expect(readableInk("#fbbf24")).toBe("#111214");
    expect(readableInk("#22c55e")).toBe("#111214");
    for (const bg of ["#3b82f6", "#ef4444", "#a855f7", "#14b8a6", "#ec4899", "#808080"]) {
      const ink = parseColor(readableInk(bg))!;
      expect(contrastRatio(ink, parseColor(bg)!), bg).toBeGreaterThanOrEqual(4.5);
    }
  });
});
