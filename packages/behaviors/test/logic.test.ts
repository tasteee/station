import { describe, expect, it } from "vitest";
import { evaluate } from "../src/math.ts";
import { formatNumber, normalize, parseNumber, stepPrecision } from "../src/number.ts";
import { computePosition } from "../src/position.ts";
import { createTypeahead } from "../src/typeahead.ts";

describe("evaluate", () => {
  it.each([
    ["12", 12],
    ["12*2", 24],
    ["(10 + 4) / 2", 7],
    ["2^3^2", 512],
    ["-3^2", -9],
    ["10 - -2", 12],
    ["50%", 0.5],
    ["10 % 4", 2],
    ["1,200", 1200],
    [".5 + .25", 0.75],
    ["1e3", 1000],
  ])("%s = %d", (input, expected) => {
    expect(evaluate(input)).toBeCloseTo(expected as number);
  });

  it.each(["", "abc", "2+", "(1", "1/0", "alert(1)", "2 +* 3"])("rejects %j", (input) => {
    expect(evaluate(input)).toBeNaN();
  });
});

describe("number helpers", () => {
  it("parses units and math", () => {
    expect(parseNumber("24px", "px")).toBe(24);
    expect(parseNumber("12 * 2 px", "px")).toBe(24);
    expect(parseNumber("45°", "°")).toBe(45);
  });
  it("normalizes to step precision and bounds", () => {
    expect(stepPrecision(0.01)).toBe(2);
    expect(normalize(0.1 + 0.2, { step: 0.1 })).toBe(0.3);
    expect(normalize(150, { max: 100 })).toBe(100);
  });
  it("formats without trailing zeros", () => {
    expect(formatNumber(1.5)).toBe("1.5");
    expect(formatNumber(2)).toBe("2");
    expect(formatNumber(1 / 3, 2)).toBe("0.33");
  });
});

describe("computePosition", () => {
  const viewport = { width: 800, height: 600 };
  const anchor = { x: 100, y: 100, width: 80, height: 24 };

  it("places below, aligned to start", () => {
    expect(computePosition(anchor, { width: 120, height: 200 }, viewport)).toMatchObject({
      x: 100,
      y: 128,
      placement: "bottom-start",
    });
  });
  it("flips to top when there is no room below", () => {
    const low = { ...anchor, y: 500 };
    expect(computePosition(low, { width: 120, height: 200 }, viewport).placement).toBe("top-start");
  });
  it("shifts to stay on screen", () => {
    const right = { ...anchor, x: 760 };
    expect(computePosition(right, { width: 120, height: 50 }, viewport).x).toBe(800 - 120 - 8);
  });
  it("centers tooltips", () => {
    expect(computePosition(anchor, { width: 40, height: 20 }, viewport, { placement: "top" })).toMatchObject({
      x: 120,
      y: 76,
      placement: "top",
    });
  });
});

describe("typeahead", () => {
  const labels = ["Apple", "Banana", "Blueberry", "Cherry"];
  it("jumps to the first match after the current item", () => {
    const search = createTypeahead();
    expect(search("b", labels, 0)).toBe(1);
  });
  it("cycles on repeated letters", () => {
    const search = createTypeahead();
    expect(search("b", labels, 1)).toBe(2);
  });
  it("matches multi-letter prefixes", () => {
    const search = createTypeahead();
    search("b", labels, 0);
    expect(search("l", labels, 1)).toBe(2);
  });
});
