import { describe, expect, it } from "vitest";
// @ts-expect-error: plain .mjs without types
import { contrast, GRAY_LIGHTNESS, luminance } from "../scripts/palette.mjs";

// Surfaces per theme (mirrors semantic.css): [panel, section, well]
const SURFACES = { light: [1, 2, 3], dark: [2, 3, 1] } as const;

// WCAG targets for the text ladder on every surface.
const TARGETS = [
  { step: 12, min: 12, role: "text-strong" },
  { step: 11, min: 7, role: "text" },
  { step: 10, min: 4.5, role: "text-muted" },
  { step: 9, min: 3, role: "text-faint" },
];

describe("gray scale contrast", () => {
  for (const theme of ["light", "dark"] as const) {
    const L: number[] = GRAY_LIGHTNESS[theme];
    for (const { step, min, role } of TARGETS) {
      for (const surface of SURFACES[theme]) {
        it(`${theme}: ${role} (step ${step}) on step ${surface} ≥ ${min}:1`, () => {
          expect(contrast(L[step - 1], L[surface - 1])).toBeGreaterThanOrEqual(min);
        });
      }
    }

    it(`${theme}: lightness moves one way across the scale`, () => {
      const dir = theme === "light" ? -1 : 1;
      for (let i = 1; i < 12; i++) expect(Math.sign(L[i]! - L[i - 1]!)).toBe(dir);
    });
  }
});

// Signal values mirror semantic.css (hue 40, chroma 0.21 by default).
describe("signal contrast", () => {
  const gray = (l: number) => luminance(l);
  const sig = (l: number, c: number, h: number) => luminance(l, c, h);
  const ratio = (a: number, b: number) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  const themes = {
    light: { surfaces: [1, 2, 3], solid: sig(62, 0.21, 40), text: sig(52, 0.168, 40) },
    dark: { surfaces: [2, 3, 1], solid: sig(69, 0.2, 42), text: sig(76, 0.151, 50) },
  } as const;
  const ink = sig(17, 0.03, 40);
  for (const [theme, t] of Object.entries(themes)) {
    const L: number[] = GRAY_LIGHTNESS[theme as "light" | "dark"];
    for (const s of t.surfaces) {
      it(`${theme}: signal ring/fill on step ${s} ≥ 3:1`, () => {
        expect(ratio(t.solid, gray(L[s - 1]!))).toBeGreaterThanOrEqual(3);
      });
      it(`${theme}: signal text on step ${s} ≥ 4.5:1`, () => {
        expect(ratio(t.text, gray(L[s - 1]!))).toBeGreaterThanOrEqual(4.5);
      });
    }
    it(`${theme}: ink on signal fill ≥ 4.5:1`, () => {
      expect(ratio(ink, t.solid)).toBeGreaterThanOrEqual(4.5);
    });
  }
});
