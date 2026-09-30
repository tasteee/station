export interface FuzzyMatch {
  score: number;
  /** Indices of matched characters, for highlighting. */
  indices: number[];
}

/**
 * Subsequence match with bonuses for word starts and runs.
 * "gl" matches "Group Layers" strongly; "lyr" matches "Layer".
 * Returns null when not all query characters appear in order.
 */
export function fuzzyMatch(query: string, text: string): FuzzyMatch | null {
  const q = query.trim().toLowerCase();
  if (!q) return { score: 0, indices: [] };
  const t = text.toLowerCase();
  const indices: number[] = [];
  let score = 0;
  let ti = 0;
  let prev = -2;
  for (const ch of q) {
    if (ch === " ") continue;
    let found = -1;
    // Prefer a word-start occurrence ahead of a mid-word one.
    for (let i = ti; i < t.length; i++) {
      if (t[i] !== ch) continue;
      const wordStart =
        i === 0 || /[\s\-_./]/.test(t[i - 1]!) || (text[i] !== t[i] && text[i - 1] === t[i - 1]);
      if (wordStart) {
        found = i;
        break;
      }
      if (found < 0) found = i;
    }
    if (found < 0) return null;
    const wordStart = found === 0 || /[\s\-_./]/.test(t[found - 1]!);
    score += 1 + (wordStart ? 8 : 0) + (found === prev + 1 ? 5 : 0);
    if (found === 0) score += 4;
    indices.push(found);
    prev = found;
    ti = found + 1;
  }
  // Shorter targets win ties.
  score -= t.length * 0.05;
  return { score, indices };
}
