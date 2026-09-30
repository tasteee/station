import { css } from "atomico";

/** Shared host reset for every shadow-DOM component. */
export const hostReset = css`
  :host {
    box-sizing: border-box;
  }
  :host([hidden]) {
    display: none !important;
  }
  *,
  *::before,
  *::after {
    box-sizing: inherit;
  }
`;
