/**
 * Type to jump: "fo" finds the next item starting with "fo".
 * Repeating one letter cycles through items that start with it.
 */
export function createTypeahead(timeout = 500) {
  let buffer = "";
  let timer: ReturnType<typeof setTimeout> | undefined;

  return function search(key: string, labels: string[], currentIndex: number): number {
    if (key.length !== 1 || key === " ") return -1;
    clearTimeout(timer);
    timer = setTimeout(() => {
      buffer = "";
    }, timeout);
    buffer += key.toLowerCase();

    const repeated = buffer.split("").every((c) => c === buffer[0]);
    const query = repeated ? buffer[0]! : buffer;
    const start = repeated || buffer.length === 1 ? currentIndex + 1 : currentIndex;
    const n = labels.length;
    for (let k = 0; k < n; k++) {
      const i = (start + k) % n;
      if (labels[i]!.trim().toLowerCase().startsWith(query)) return i;
    }
    return -1;
  };
}
