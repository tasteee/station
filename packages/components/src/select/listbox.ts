import { uniqueId } from "@station/behaviors";
import { css } from "atomico";

export type OptionEl = HTMLElement & {
  value?: string;
  label?: string;
  icon?: string;
  disabled?: boolean;
  selected?: boolean;
};

export const optionsOf = (host: HTMLElement) => [...host.querySelectorAll<OptionEl>("st-option")];
export const usable = (options: OptionEl[]) =>
  options.filter((o) => !o.disabled && !o.hasAttribute("data-filtered"));
export const labelOf = (o: OptionEl) => o.label || o.textContent?.trim() || o.value || "";
export const optionValue = (o: OptionEl) => o.value ?? labelOf(o);

export function ensureId(option: OptionEl) {
  if (!option.id) option.id = uniqueId("st-option");
  return option.id;
}

export function setActive(options: OptionEl[], active: OptionEl | null) {
  for (const o of options) {
    if (o === active) o.setAttribute("data-active", "");
    else o.removeAttribute("data-active");
  }
  active?.scrollIntoView({ block: "nearest" });
}

/** The floating listbox: a top-layer popover styled as a menu surface. */
export const listboxStyles = css`
  .listbox {
    box-sizing: border-box;
    min-width: 120px;
    max-height: min(320px, var(--st-available-height, 320px));
    overflow: auto;
    padding: var(--st-space-1);
    border: 0;
    border-radius: var(--st-radius-3);
    background: var(--st-bg-panel);
    color: var(--st-text);
    box-shadow: var(--st-shadow-popover);
    scrollbar-width: thin;
    overscroll-behavior: contain;
  }
  .listbox:popover-open {
    display: flex;
    flex-direction: column;
    gap: 1px;
  }
  .listbox ::slotted(st-divider) {
    margin: var(--st-space-1) calc(var(--st-space-1) * -1);
  }
  .empty {
    padding: var(--st-space-1-5) var(--st-space-2);
    color: var(--st-text-faint);
  }
`;
