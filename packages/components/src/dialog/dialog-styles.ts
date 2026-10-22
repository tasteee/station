import { css } from "atomico";

/** Modal chrome shared by st-dialog and st-alert-dialog. */
export const dialogStyles = css`
  :host {
    display: contents;
  }
  dialog {
    box-sizing: border-box;
    display: none;
    flex-direction: column;
    width: var(--_width, 440px);
    max-width: calc(100vw - 32px);
    max-height: calc(100vh - 64px);
    padding: 0;
    border: 0;
    border-radius: var(--st-radius-5);
    background: var(--st-bg-panel);
    color: var(--st-text);
    box-shadow: var(--st-shadow-dialog);
    font-family: var(--st-font-sans);
    font-size: var(--st-text-2);
    line-height: var(--st-leading);
    overflow: hidden;
  }
  dialog[open] {
    display: flex;
    animation: st-dialog-in var(--st-duration-slow) var(--st-ease);
  }
  dialog::backdrop {
    background: oklch(0% 0 0 / 0.32);
    animation: st-fade-in var(--st-duration-slow) var(--st-ease);
  }
  @keyframes st-dialog-in {
    from {
      opacity: 0;
      scale: 0.98;
    }
  }
  @keyframes st-fade-in {
    from {
      opacity: 0;
    }
  }
  :host([width="small"]) {
    --_width: 320px;
  }
  :host([width="large"]) {
    --_width: 640px;
  }
  header {
    display: flex;
    align-items: center;
    gap: var(--st-space-2);
    flex: none;
    min-height: 44px;
    padding: var(--st-space-2) var(--st-space-2) var(--st-space-1) var(--st-space-4);
  }
  h2 {
    flex: 1;
    min-width: 0;
    margin: 0;
    font-size: var(--st-text-3);
    font-weight: var(--st-weight-strong);
    line-height: var(--st-leading-tight);
    color: var(--st-text-strong);
  }
  .body {
    flex: 1;
    min-height: 0;
    overflow: auto;
    padding: var(--st-space-1) var(--st-space-4) var(--st-space-4);
    scrollbar-width: thin;
  }
  footer {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: var(--st-space-2);
    flex: none;
    padding: var(--st-space-3) var(--st-space-4);
    border-top: 1px solid var(--st-border-subtle);
  }
  footer.empty {
    display: none;
  }
  .close {
    all: unset;
    display: grid;
    place-items: center;
    width: 24px;
    height: 24px;
    border-radius: var(--st-radius-2);
    color: var(--st-text-muted);
  }
  .close:hover {
    background: var(--st-bg-hover);
    color: var(--st-text-strong);
  }
  .close:focus-visible {
    outline: var(--st-focus-ring-width) solid var(--st-border-focus);
    outline-offset: var(--st-focus-ring-offset);
  }
  .close svg {
    width: 14px;
    height: 14px;
  }
`;

const FOCUSABLE =
  "[autofocus], button, [href], input, select, textarea, [tabindex]:not([tabindex='-1']), st-button, st-icon-button, st-toggle-button, st-text-field, st-number-field, st-select, st-combobox, st-slider, st-checkbox, st-switch, st-segmented-control";

/** Focus [autofocus] or the first control in the light DOM, else `fallback`. */
export function focusInitial(host: HTMLElement, fallback: HTMLElement | null) {
  const target = (host.querySelector("[autofocus]") ?? host.querySelector(FOCUSABLE)) as HTMLElement | null;
  (target ?? fallback)?.focus();
}
