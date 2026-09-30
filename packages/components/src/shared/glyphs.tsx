/** Tiny built-in glyphs so core controls work without registering icons. */
const svg = (d: string, stroke = 1.75) => (
  <svg
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    stroke-width={stroke}
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path d={d} />
  </svg>
);

export const Check = () => svg("M3.5 8.5l3 3 6-7", 2);
export const Minus = () => svg("M4 8h8", 2);
export const ChevronDown = () => svg("M4.5 6.5L8 10l3.5-3.5");
export const ChevronUpDown = () => svg("M5 6l3-3 3 3M5 10l3 3 3-3");
export const Close = () => svg("M4.5 4.5l7 7M11.5 4.5l-7 7");
export const Search = () => svg("M7 12A5 5 0 1 0 7 2a5 5 0 0 0 0 10zM14 14l-3.5-3.5", 1.5);
export const Spinner = () => (
  <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <circle cx="8" cy="8" r="6" stroke="currentColor" stroke-opacity="0.25" stroke-width="2" />
    <path d="M14 8a6 6 0 0 0-6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
  </svg>
);
