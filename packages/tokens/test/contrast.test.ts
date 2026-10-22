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

// Opt-in signal presets mirror signal.css. The default signal is the gray ladder (covered above).
describe("signal presets contrast", () => {
  const gray = (l: number) => luminance(l);
  const sig = (l: number, c: number, h: number) => luminance(l, c, h);
  const ratio = (a: number, b: number) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  const presets = {
    orange: {
      light: { ring: sig(62, 0.21, 40), text: sig(52, 0.168, 40), fill: sig(62, 0.21, 40) },
      dark: { ring: sig(69, 0.2, 42), text: sig(76, 0.151, 50), fill: sig(69, 0.2, 42) },
      ink: sig(17, 0.03, 40),
    },
    lime: {
      light: { ring: sig(56, 0.16, 140), text: sig(48, 0.13, 142), fill: sig(87, 0.21, 132) },
      dark: { ring: sig(86, 0.21, 132), text: sig(88, 0.19, 130), fill: sig(88, 0.22, 132) },
      ink: sig(20, 0.04, 135),
    },
  } as const;
  const surfaces = { light: [1, 2, 3], dark: [2, 3, 1] } as const;
  for (const [name, preset] of Object.entries(presets)) {
    for (const theme of ["light", "dark"] as const) {
      const t = preset[theme];
      const L: number[] = GRAY_LIGHTNESS[theme];
      for (const s of surfaces[theme]) {
        it(`${name} ${theme}: ring on step ${s} ≥ 3:1`, () => {
          expect(ratio(t.ring, gray(L[s - 1]!))).toBeGreaterThanOrEqual(3);
        });
        it(`${name} ${theme}: signal text on step ${s} ≥ 4.5:1`, () => {
          expect(ratio(t.text, gray(L[s - 1]!))).toBeGreaterThanOrEqual(4.5);
        });
      }
      it(`${name} ${theme}: ink on fill ≥ 4.5:1`, () => {
        expect(ratio(preset.ink, t.fill)).toBeGreaterThanOrEqual(4.5);
      });
    }
  }
});
