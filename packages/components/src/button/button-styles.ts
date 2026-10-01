import { css } from "atomico";

/** Shared look for st-button, st-icon-button, st-toggle-button, st-segment. */
export const buttonStyles = css`
  :host {
    --_bg: transparent;
    --_fg: var(--st-text-strong);
    --_border: transparent;
    --_hover-bg: var(--st-bg-hover);
    --_active-bg: var(--st-bg-pressed);
    --_hover-fg: var(--_fg);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--st-space-1-5);
    flex: none;
    position: relative;
    height: var(--_height);
    min-width: var(--_height);
    padding-inline: calc(var(--_height) * 0.4);
    border: 1px solid var(--_border);
    border-radius: var(--st-radius-2);
    background: var(--_bg);
    color: var(--_fg);
    font-weight: var(--st-weight-medium);
    white-space: nowrap;
    cursor: default;
    vertical-align: middle;
  }
  :host(:hover) {
    background: var(--_hover-bg);
    color: var(--_hover-fg);
  }
  :host(:active),
  :host([data-active]) {
    background: var(--_active-bg);
  }

  /* ---- kind × tone ---- */
  :host([data-kind="solid"]) {
    --_bg: var(--st-gray-a4);
    --_hover-bg: var(--st-gray-a5);
    --_active-bg: var(--st-gray-a6);
  }
  :host([data-kind="solid"][tone="accent"]) {
    --_bg: var(--st-accent-solid);
    --_fg: var(--st-text-on-accent);
    --_hover-bg: var(--st-accent-solid-hover);
    --_active-bg: var(--st-accent-solid-hover);
  }
  :host([data-kind="solid"][tone="danger"]) {
    --_bg: var(--st-danger-solid);
    --_fg: var(--st-text-on-status);
    --_hover-bg: var(--st-danger-solid-hover);
    --_active-bg: var(--st-danger-solid-hover);
  }
  :host([data-kind="outline"]) {
    --_border: var(--st-border);
  }
  :host([data-kind="outline"]:hover) {
    --_border: var(--st-border-strong);
  }
  :host([data-kind="outline"][tone="accent"]) {
    --_fg: var(--st-accent-text);
    --_border: var(--st-accent-7);
  }
  :host([data-kind="outline"][tone="danger"]),
  :host([data-kind="ghost"][tone="danger"]) {
    --_fg: var(--st-danger-text);
    --_hover-bg: var(--st-danger-bg);
    --_active-bg: var(--st-danger-bg);
  }
  :host([data-kind="outline"][tone="danger"]) {
    --_border: var(--st-danger-border);
  }
  :host([data-kind="ghost"]) {
    --_fg: var(--st-text);
    --_hover-fg: var(--st-text-strong);
  }
  :host([data-kind="ghost"][tone="accent"]) {
    --_fg: var(--st-accent-text);
  }

  /* ---- icon-only: square, quieter until hovered ---- */
  :host([data-icon-only]) {
    padding: 0;
    width: var(--_height);
  }
  :host([data-icon-only][data-kind="ghost"]:not([tone])) {
    --_fg: var(--st-text-muted);
  }

  /* ---- pressed (toggle, segment) ---- */
  :host([pressed]) {
    --_bg: var(--st-bg-pressed);
    --_fg: var(--st-text-strong);
    --_hover-bg: var(--st-bg-pressed);
    --_hover-fg: var(--st-text-strong);
  }
  :host([pressed][tone="accent"]) {
    --_bg: var(--st-accent-solid);
    --_fg: var(--st-text-on-accent);
    --_hover-bg: var(--st-accent-solid-hover);
    --_hover-fg: var(--st-text-on-accent);
    --_active-bg: var(--st-accent-solid-hover);
  }

  :host([block]) {
    display: flex;
    width: 100%;
  }
  /* Hide the label visually but keep it as the accessible name (visibility would drop it). */
  :host([loading]) .content {
    color: transparent;
  }

  .content {
    display: contents;
  }
  .label:empty {
    display: none;
  }
  .spinner {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
  }
  .spinner svg {
    width: var(--st-icon-size);
    height: var(--st-icon-size);
    animation: spin 0.7s linear infinite;
  }
  @keyframes spin {
    to {
      transform: rotate(1turn);
    }
  }
  ::slotted(st-icon),
  st-icon {
    margin-inline: -1px;
  }
`;
