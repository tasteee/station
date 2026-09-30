import { describe, expect, it } from "vitest";
import { formatHex, hsvToRgb, parseColor, rgbToHsv } from "../src/color.ts";

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
