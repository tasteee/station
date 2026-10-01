export interface CurvePoint {
  x: number;
  y: number;
}

/**
 * Monotone cubic interpolation (Fritsch–Carlson). Smooth like Photoshop's
 * Curves, but never overshoots between points. Returns f(x) for sorted points.
 */
export function monotoneSpline(points: CurvePoint[]): (x: number) => number {
  const p = [...points].sort((a, b) => a.x - b.x);
  const n = p.length;
  if (n === 0) return (x) => x;
  if (n === 1) return () => p[0]!.y;
  const dx: number[] = [];
  const slope: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    dx.push(p[i + 1]!.x - p[i]!.x || 1e-9);
    slope.push((p[i + 1]!.y - p[i]!.y) / dx[i]!);
  }
  const m: number[] = [slope[0]!];
  for (let i = 1; i < n - 1; i++) {
    const a = slope[i - 1]!;
    const b = slope[i]!;
    m.push(
      a * b <= 0
        ? 0
        : (3 * (dx[i - 1]! + dx[i]!)) / ((2 * dx[i]! + dx[i - 1]!) / a + (dx[i]! + 2 * dx[i - 1]!) / b),
    );
  }
  m.push(slope[n - 2]!);

  return (x: number) => {
    if (x <= p[0]!.x) return p[0]!.y;
    if (x >= p[n - 1]!.x) return p[n - 1]!.y;
    let i = 0;
    while (i < n - 2 && x > p[i + 1]!.x) i++;
    const h = dx[i]!;
    const t = (x - p[i]!.x) / h;
    const t2 = t * t;
    const t3 = t2 * t;
    return (
      (2 * t3 - 3 * t2 + 1) * p[i]!.y +
      (t3 - 2 * t2 + t) * h * m[i]! +
      (-2 * t3 + 3 * t2) * p[i + 1]!.y +
      (t3 - t2) * h * m[i + 1]!
    );
  };
}

/** Straight segments between points. */
export function linearCurve(points: CurvePoint[]): (x: number) => number {
  const p = [...points].sort((a, b) => a.x - b.x);
  return (x: number) => {
    if (!p.length) return x;
    if (x <= p[0]!.x) return p[0]!.y;
    for (let i = 0; i < p.length - 1; i++) {
      const a = p[i]!;
      const b = p[i + 1]!;
      if (x <= b.x) return a.y + ((b.y - a.y) * (x - a.x)) / (b.x - a.x || 1e-9);
    }
    return p[p.length - 1]!.y;
  };
}
