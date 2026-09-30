import { autoPosition, createTypeahead } from "@station/behaviors";
import { c, css, useEffect, useHost, useInternals, useProp, useRef, useState } from "atomico";
import { fire } from "../shared/events.ts";
import { useFocusable } from "../shared/focusable.ts";
import { ChevronUpDown } from "../shared/glyphs.tsx";
import { controlBase, fieldBase, hostReset } from "../shared/styles.ts";
import {
  ensureId,
  labelOf,
  listboxStyles,
  type OptionEl,
  optionsOf,
  optionValue,
  setActive,
  usable,
} from "./listbox.ts";

/**
 * Pick one value from a list.
 *
 * <st-select label="Blend mode" value="normal">
 *   <st-option value="normal">Normal</st-option>
 *   <st-option value="multiply">Multiply</st-option>
 * </st-select>
 */
export const Select = c(
  ({ placeholder, disabled, required, label, name }) => {
    const host = useHost();
    const internals = useInternals();
    const [value, setValue] = useProp<string>("value");
    const [open, setOpen] = useState(false);
    const [, rerender] = useState(0);
    const listbox = useRef<HTMLElement>();
    const active = useRef<OptionEl | null>(null);
    const typeahead = useRef(createTypeahead());
    const reopenGuard = useRef(false);
    useFocusable(disabled);

    const el = host.current as HTMLElement;
    const options = optionsOf(el);
    const selected = options.find((o) => optionValue(o) === value) ?? null;

    const activate = (option: OptionEl | null) => {
      active.current = option;
      setActive(optionsOf(el), option);
      if (option) el.setAttribute("aria-activedescendant", ensureId(option));
      else el.removeAttribute("aria-activedescendant");
    };

    const choose = (option: OptionEl | null) => {
      if (!option || option.disabled) return;
      if (optionValue(option) !== value) {
        setValue(optionValue(option));
        fire(el, "input");
        fire(el, "change");
      }
    };

    const show = () => {
      if (disabled || open) return;
      listbox.current?.showPopover();
    };
    const hide = () => listbox.current?.matches(":popover-open") && listbox.current.hidePopover();

    useEffect(() => {
      internals.role = "combobox";
      internals.ariaHasPopup = "listbox";
      internals.ariaLabel = label ?? null;
      internals.ariaDisabled = disabled ? "true" : null;
      internals.ariaRequired = required ? "true" : null;
    }, [label, disabled, required]);

    useEffect(() => {
      internals.ariaExpanded = open ? "true" : "false";
      if (!open) {
        activate(null);
        return;
      }
      activate(selected ?? usable(optionsOf(el))[0] ?? null);
      return autoPosition(el, listbox.current!, { placement: "bottom-start", matchWidth: true });
    }, [open]);

    useEffect(() => {
      for (const o of optionsOf(el)) o.selected = optionValue(o) === value;
      internals.setFormValue(value ?? null);
      if (required && !value) internals.setValidity({ valueMissing: true }, "Please select an option.");
      else internals.setValidity({});
    }, [value, required, name]);

    const onkeydown = (e: KeyboardEvent) => {
      const list = usable(optionsOf(el));
      const index = active.current ? list.indexOf(active.current) : list.indexOf(selected!);
      if (!open) {
        if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
          e.preventDefault();
          show();
        } else if (e.key.length === 1 && !e.metaKey && !e.ctrlKey) {
          const i = typeahead.current(e.key, list.map(labelOf), index);
          if (i >= 0) choose(list[i]!);
        }
        return;
      }
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const next = e.key === "ArrowDown" ? Math.min(list.length - 1, index + 1) : Math.max(0, index - 1);
        activate(list[next] ?? null);
      } else if (e.key === "Home" || e.key === "End") {
        e.preventDefault();
        activate((e.key === "Home" ? list[0] : list.at(-1)) ?? null);
      } else if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        choose(active.current);
        hide();
      } else if (e.key === "Tab") {
        hide();
      } else if (e.key === "Escape") {
        e.preventDefault();
        hide();
      } else if (e.key.length === 1 && !e.metaKey && !e.ctrlKey) {
        const i = typeahead.current(e.key, list.map(labelOf), index);
        if (i >= 0) activate(list[i]!);
      }
    };

    return (
      <host
        shadowDom
        onkeydown={onkeydown}
        onpointerdown={() => {
          reopenGuard.current = open;
        }}
        onclick={(e: MouseEvent) => {
          const option = e.composedPath().find((n) => (n as Element).localName === "st-option") as
            | OptionEl
            | undefined;
          if (option) {
            if (option.disabled) return;
            choose(option);
            hide();
            el.focus();
            return;
          }
          if (reopenGuard.current) {
            reopenGuard.current = false;
            return;
          }
          show();
        }}
        onpointermove={(e: PointerEvent) => {
          const option = e.composedPath().find((n) => (n as Element).localName === "st-option") as
            | OptionEl
            | undefined;
          if (option && !option.disabled && option !== active.current) activate(option);
        }}
      >
        {selected?.icon && <st-icon name={selected.icon} />}
        <span class={selected ? "value" : "value placeholder"} part="value">
          {selected ? labelOf(selected) : (placeholder ?? "Select…")}
        </span>
        <span class="chevron">
          <ChevronUpDown />
        </span>
        <div
          ref={listbox}
          class="listbox"
          part="listbox"
          popover="auto"
          ontoggle={(e: ToggleEvent) => setOpen(e.newState === "open")}
        >
          <slot onslotchange={() => rerender((n) => n + 1)} />
        </div>
      </host>
    );
  },
  {
    form: true,
    props: {
      value: { type: String, reflect: true },
      placeholder: { type: String, reflect: true },
      label: { type: String, reflect: true },
      name: { type: String, reflect: true },
      kind: { type: String, reflect: true },
      size: { type: String, reflect: true },
      required: { type: Boolean, reflect: true },
      disabled: { type: Boolean, reflect: true },
    },
    styles: [
      hostReset,
      controlBase,
      fieldBase,
      listboxStyles,
      css`
        :host {
          width: 160px;
          gap: var(--st-space-1-5);
          padding-inline: var(--st-space-2) var(--st-space-1);
          cursor: default;
          user-select: none;
        }
        :host(:focus-visible) {
          outline: none;
          border-color: var(--st-border-focus);
        }
        :host(:focus-within) {
          background: var(--st-bg-field);
          border-color: transparent;
        }
        :host(:focus-visible) {
          border-color: var(--st-border-focus);
        }
        .value {
          flex: 1;
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          line-height: var(--st-leading-tight);
        }
        .placeholder {
          color: var(--st-text-faint);
        }
        .chevron {
          display: inline-grid;
          flex: none;
          width: 14px;
          height: 14px;
          color: var(--st-text-muted);
        }
      `,
    ],
  },
);
