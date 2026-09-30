import { describe, expect, it } from "vitest";
// @ts-expect-error: plain .mjs without types
import { contrast, GRAY_LIGHTNESS } from "../scripts/palette.mjs";

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
