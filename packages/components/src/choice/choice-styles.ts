import { css } from "atomico";

/** Label layout shared by checkbox, switch and radio. */
export const choiceStyles = css`
  :host {
    display: inline-flex;
    align-items: center;
    gap: var(--st-space-2);
    min-height: var(--_height);
    color: var(--st-text);
    cursor: default;
    --_box: calc(var(--st-icon-size) - 2px);
  }
  :host(:focus-visible) {
    outline: none;
  }
  :host(:focus-visible) .control {
    outline: var(--st-focus-ring-width) solid var(--st-border-focus);
    outline-offset: var(--st-focus-ring-offset);
  }
  .label {
    line-height: var(--st-leading-tight);
  }
  .label:empty {
    display: none;
  }
  .control {
    display: inline-grid;
    place-items: center;
    flex: none;
    transition:
      background-color var(--st-duration-fast) var(--st-ease),
      border-color var(--st-duration-fast) var(--st-ease),
      transform var(--st-duration) var(--st-ease);
  }
  .control svg {
    width: 100%;
    height: 100%;
  }
`;
