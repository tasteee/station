// Source of truth for the lightness tables and a small OKLCH contrast checker.
// Hue and chroma stay runtime knobs in CSS. Only lightness is fixed here.

/** OKLCH lightness (%) per step, 1..12. */
export const GRAY_LIGHTNESS = {
  light: [99.2, 97.6, 95.4, 93.2, 91.0, 88.4, 84.6, 76.0, 63.0, 52.5, 40.0, 21.0],
  dark: [16.5, 19.5, 23.0, 26.0, 29.0, 32.5, 38.0, 46.0, 55.0, 67.0, 81.0, 95.5],
};

/** Alpha per step for the alpha scale (tinted with step 12). */
export const GRAY_ALPHA = {
  light: [0.012, 0.028, 0.05, 0.072, 0.095, 0.12, 0.16, 0.25, 0.42, 0.52, 0.66, 0.88],
  dark: [0.012, 0.03, 0.055, 0.08, 0.105, 0.135, 0.18, 0.27, 0.42, 0.56, 0.78, 0.94],
};

/** Status color lightness per step. Chroma follows a bell curve peaking at step 9. */
export const STATUS_CHROMA_CURVE = [0.08, 0.12, 0.2, 0.28, 0.36, 0.46, 0.58, 0.74, 1, 0.94, 0.8, 0.45];
export const STATUS_LIGHTNESS = {
  light: [99, 97.5, 95, 92, 88.5, 84, 78, 70, 60, 55, 48, 30],
  dark: [17, 20, 24.5, 28, 32, 37, 43, 51, 60, 65, 78, 92],
};

export const DEFAULTS = {
  grayHue: 255,
  grayChroma: 0.006,
};

// ---- contrast math ----

export function oklchToLinearSrgb(lPct, c, hDeg) {
  const L = lPct / 100;
  const h = (hDeg * Math.PI) / 180;
  const a = c * Math.cos(h);
  const b = c * Math.sin(h);
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l = l_ ** 3;
  const m = m_ ** 3;
  const s = s_ ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ].map((v) => Math.min(1, Math.max(0, v)));
}

export function luminance(lPct, c = DEFAULTS.grayChroma, h = DEFAULTS.grayHue) {
  const [r, g, b] = oklchToLinearSrgb(lPct, c, h);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(lA, lB) {
  const a = luminance(lA);
  const b = luminance(lB);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}
