import { evaluate } from "./math.ts";

export interface NumberConstraints {
  min?: number;
  max?: number;
  step?: number;
}

export function clamp(value: number, min = -Infinity, max = Infinity): number {
  return Math.min(max, Math.max(min, value));
}

/** Decimal places in a step, so 0.1 steps don't produce 0.30000000000000004. */
export function stepPrecision(step = 1): number {
  const s = String(step);
  if (s.includes("e-")) return Number(s.split("e-")[1]);
  return s.includes(".") ? s.split(".")[1]!.length : 0;
}

/** Clamp and round to the step's precision. */
export function normalize(value: number, { min, max, step = 1 }: NumberConstraints = {}): number {
  const precision = stepPrecision(step);
  const rounded = Number(value.toFixed(Math.max(precision, 0)));
  return clamp(rounded, min, max);
}

/** Format without trailing zeros: 1.50 → "1.5". */
export function formatNumber(value: number, precision = 3): string {
  if (!Number.isFinite(value)) return "";
  return String(Number(value.toFixed(precision)));
}

/**
 * Parse user input. Accepts math and an optional trailing unit ("12px", "45°", "2*8 px").
 * Returns NaN when it can't be read.
 */
export function parseNumber(input: string, unit = ""): number {
  let text = input.trim();
  if (unit && text.toLowerCase().endsWith(unit.toLowerCase())) text = text.slice(0, -unit.length);
  return evaluate(text);
}
