import { css } from "atomico";

/** Shared host reset for every shadow-DOM component. */
export const hostReset = css`
  :host {
    box-sizing: border-box;
    -webkit-tap-highlight-color: transparent;
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

/**
 * Base for anything that behaves like a control: height from the size cascade,
 * control font, focus ring, disabled state.
 */
export const controlBase = css`
  :host {
    --_height: var(--st-control-height, 24px);
    font-family: var(--st-font-sans);
    font-size: var(--st-control-font-size, var(--st-text-2));
    line-height: 1;
    outline: none;
    user-select: none;
    -webkit-user-select: none;
    transition:
      background-color var(--st-duration-fast) var(--st-ease),
      border-color var(--st-duration-fast) var(--st-ease),
      color var(--st-duration-fast) var(--st-ease),
      box-shadow var(--st-duration-fast) var(--st-ease);
  }
  :host([size="small"]) {
    --st-control-height: var(--st-control-small);
    --st-icon-size: var(--st-icon-small);
    --st-control-font-size: var(--st-text-1);
  }
  :host([size="medium"]) {
    --st-control-height: var(--st-control-medium);
    --st-icon-size: var(--st-icon-medium);
    --st-control-font-size: var(--st-text-2);
  }
  :host([size="large"]) {
    --st-control-height: var(--st-control-large);
    --st-icon-size: var(--st-icon-large);
    --st-control-font-size: var(--st-text-2);
  }
  :host(:focus-visible) {
    outline: var(--st-focus-ring-width) solid var(--st-border-focus);
    outline-offset: var(--st-focus-ring-offset);
  }
  :host([disabled]) {
    cursor: default;
    opacity: 0.45;
    pointer-events: none;
  }
`;

/** Filled/outline/ghost field chrome, used by text, number, select and combobox fields. */
export const fieldBase = css`
  :host {
    display: inline-flex;
    align-items: center;
    min-width: 0;
    height: var(--_height);
    border-radius: var(--st-radius-2);
    background: var(--st-bg-field);
    box-shadow: var(--st-field-edge); /* recessed well */
    color: var(--st-text-strong);
    border: 1px solid transparent;
    cursor: text;
    transition: box-shadow var(--st-duration) var(--st-ease), background-color var(--st-duration) var(--st-ease);
  }
  :host(:hover) {
    background: var(--st-bg-field-hover);
    box-shadow: var(--st-field-edge-hover);
  }
  :host([kind="outline"]) {
    background: transparent;
    box-shadow: none;
    border-color: var(--st-border);
  }
  :host([kind="outline"]:hover) {
    border-color: var(--st-border-strong);
  }
  :host([kind="ghost"]) {
    background: transparent;
    box-shadow: none;
  }
  :host([kind="ghost"]:hover) {
    background: var(--st-bg-hover);
  }
  /* Focus: a crisp signal edge plus a soft halo. */
  :host(:focus-within) {
    background: transparent;
    border-color: var(--st-border-focus);
    box-shadow: 0 0 0 3px var(--st-signal-soft);
  }
  :host(:focus-visible) {
    outline: none;
  }
  :host([invalid]) {
    border-color: var(--st-danger-border);
  }
  :host([readonly]) {
    background: transparent;
    box-shadow: none;
    border-color: var(--st-border-subtle);
  }
  input,
  textarea {
    all: unset;
    flex: 1;
    min-width: 0;
    height: 100%;
    padding-inline: var(--st-space-2);
    font: inherit;
    color: inherit;
    cursor: inherit;
    user-select: text;
    -webkit-user-select: text;
  }
  input::placeholder,
  textarea::placeholder {
    color: var(--st-text-faint);
  }
  .affix {
    display: inline-flex;
    align-items: center;
    flex: none;
    color: var(--st-text-muted);
    gap: var(--st-space-1);
  }
  .affix:empty {
    display: none;
  }
  .affix.start {
    padding-inline-start: var(--st-space-1-5);
    margin-inline-end: calc(var(--st-space-1) * -1);
  }
  .affix.end {
    padding-inline-end: var(--st-space-1-5);
    margin-inline-start: calc(var(--st-space-1) * -1);
  }
  ::slotted(*) {
    flex: none;
  }
`;

/** Surfaces that float above the page: menus, popovers, listboxes. The only place shadows appear. */
export const floatingSurface = css`
  :host {
    box-sizing: border-box;
    border: 0;
    border-radius: var(--st-radius-4);
    background: var(--st-bg-panel);
    color: var(--st-text);
    box-shadow: var(--st-shadow-popover);
    font-family: var(--st-font-sans);
    font-size: var(--st-text-2);
  }
  :host(:popover-open) {
    animation: st-float-in var(--st-duration-fast) var(--st-ease);
  }
  @keyframes st-float-in {
    from {
      opacity: 0;
      translate: 0 -2px;
    }
  }
`;
