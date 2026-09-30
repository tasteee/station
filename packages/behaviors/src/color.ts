/** sRGB color with channels 0–255 and alpha 0–1. */
export interface Rgba {
  r: number;
  g: number;
  b: number;
  a: number;
}

/** Hue 0–360, saturation and value 0–1 (the model Photoshop's picker uses), alpha 0–1. */
export interface Hsva {
  h: number;
  s: number;
  v: number;
  a: number;
}

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
const byte = (n: number) => Math.round(Math.min(255, Math.max(0, n)));

/** Parse #rgb, #rgba, #rrggbb, #rrggbbaa, rgb()/rgba(). Returns null when unreadable. */
export function parseColor(input: string): Rgba | null {
  const s = input.trim().toLowerCase();
  const hex = /^#?([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/.exec(s);
  if (hex) {
    let h = hex[1]!;
    if (h.length <= 4) h = [...h].map((c) => c + c).join("");
    const n = (i: number) => Number.parseInt(h.slice(i, i + 2), 16);
    return { r: n(0), g: n(2), b: n(4), a: h.length === 8 ? Math.round((n(6) / 255) * 1000) / 1000 : 1 };
  }
  const fn = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:[\s,/]+([\d.]+%?))?\s*\)$/.exec(s);
  if (fn) {
    const alpha =
      fn[4] === undefined ? 1 : fn[4].endsWith("%") ? Number.parseFloat(fn[4]) / 100 : Number(fn[4]);
    return { r: byte(Number(fn[1])), g: byte(Number(fn[2])), b: byte(Number(fn[3])), a: clamp01(alpha) };
  }
  return null;
}

/** #rrggbb, or #rrggbbaa when not opaque. */
export function formatHex({ r, g, b, a }: Rgba, withAlpha = a < 1): string {
  const h = (n: number) => byte(n).toString(16).padStart(2, "0");
  return `#${h(r)}${h(g)}${h(b)}${withAlpha ? h(a * 255) : ""}`;
}

export function rgbToHsv({ r, g, b, a }: Rgba): Hsva {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const d = max - min;
  let h = 0;
  if (d) {
    if (max === rn) h = ((gn - bn) / d) % 6;
    else if (max === gn) h = (bn - rn) / d + 2;
    else h = (rn - gn) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h, s: max ? d / max : 0, v: max, a };
}

export function hsvToRgb({ h, s, v, a }: Hsva): Rgba {
  const f = (n: number) => {
    const k = (n + h / 60) % 6;
    return v - v * s * Math.max(0, Math.min(k, 4 - k, 1));
  };
  return { r: byte(f(5) * 255), g: byte(f(3) * 255), b: byte(f(1) * 255), a };
}

/** Relative luminance, for picking readable marks on top of a color. */
export function isLight({ r, g, b }: Rgba): boolean {
  const lin = (c: number) => {
    const x = c / 255;
    return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b) > 0.4;
}
