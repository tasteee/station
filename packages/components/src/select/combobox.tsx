import { autoPosition } from "@station/behaviors";
import { c, css, useEffect, useHost, useInternals, useProp, useRef, useState } from "atomico";
import { fire } from "../shared/events.ts";
import { ChevronDown } from "../shared/glyphs.tsx";
import { controlBase, fieldBase, hostReset } from "../shared/styles.ts";
import {
  labelOf,
  listboxStyles,
  type OptionEl,
  optionsOf,
  optionValue,
  setActive,
  usable,
} from "./listbox.ts";

/**
 * Text input with a filtered list of options.
 * `allow-custom` accepts values that aren't in the list (e.g. font sizes).
 *
 * <st-combobox label="Font" value="inter">
 *   <st-option value="inter">Inter</st-option>
 *   <st-option value="dm-sans">DM Sans</st-option>
 * </st-combobox>
 */
export const Combobox = c(
  ({ placeholder, disabled, required, label, name, allowCustom, emptyText }) => {
    const host = useHost();
    const internals = useInternals();
    const [value, setValue] = useProp<string>("value");
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState<string | null>(null);
    const [, rerender] = useState(0);
    const input = useRef<HTMLInputElement>();
    const listbox = useRef<HTMLElement>();
    const active = useRef<OptionEl | null>(null);
    const reopenGuard = useRef(false);

    const el = host.current as HTMLElement;
    const options = optionsOf(el);
    const selected = options.find((o) => optionValue(o) === value) ?? null;
    const text = query ?? (selected ? labelOf(selected) : (value ?? ""));

    const activate = (option: OptionEl | null) => {
      active.current = option;
      setActive(optionsOf(el), option);
      if (input.current)
        (
          input.current as HTMLInputElement & { ariaActiveDescendantElement: Element | null }
        ).ariaActiveDescendantElement = option;
    };

    const filter = (q: string | null) => {
      const needle = q?.trim().toLowerCase() ?? "";
      for (const o of optionsOf(el)) {
        if (needle && !labelOf(o).toLowerCase().includes(needle)) o.setAttribute("data-filtered", "");
        else o.removeAttribute("data-filtered");
      }
      rerender((n) => n + 1);
    };

    const show = () =>
      !disabled && !listbox.current?.matches(":popover-open") && listbox.current?.showPopover();
    const hide = () => listbox.current?.matches(":popover-open") && listbox.current.hidePopover();

    const commit = (next: string | null) => {
      setQuery(null);
      filter(null);
      if (next != null && next !== value) {
        setValue(next);
        fire(el, "input");
        fire(el, "change");
      }
    };

    const commitText = () => {
      if (query == null) return;
      const match = optionsOf(el).find((o) => labelOf(o).toLowerCase() === query.trim().toLowerCase());
      if (match) commit(optionValue(match));
      else if (allowCustom && query.trim()) commit(query.trim());
      else commit(null);
    };

    useEffect(() => {
      internals.ariaDisabled = disabled ? "true" : null;
      const i = input.current!;
      i.setAttribute("role", "combobox");
      i.setAttribute("aria-autocomplete", "list");
      i.setAttribute("aria-expanded", open ? "true" : "false");
      if (label) i.setAttribute("aria-label", label);
    }, [label, disabled, open]);

    useEffect(() => {
      if (!open) {
        activate(null);
        return;
      }
      activate(
        selected && !selected.hasAttribute("data-filtered") ? selected : (usable(optionsOf(el))[0] ?? null),
      );
      return autoPosition(el, listbox.current!, { placement: "bottom-start", matchWidth: true });
    }, [open]);

    useEffect(() => {
      for (const o of optionsOf(el)) o.selected = optionValue(o) === value;
      internals.setFormValue(value ?? null);
      if (required && !value)
        internals.setValidity({ valueMissing: true }, "Please select an option.", input.current);
      else internals.setValidity({});
    }, [value, required, name]);

    const onkeydown = (e: KeyboardEvent) => {
      const list = usable(optionsOf(el));
      const index = active.current ? list.indexOf(active.current) : -1;
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        if (!open) return show();
        activate(
          list[e.key === "ArrowDown" ? Math.min(list.length - 1, index + 1) : Math.max(0, index - 1)] ?? null,
        );
      } else if (e.key === "Enter") {
        if (open && active.current) {
          e.preventDefault();
          commit(optionValue(active.current));
          hide();
        } else {
          commitText();
          hide();
        }
      } else if (e.key === "Escape") {
        if (open) {
          e.preventDefault();
          hide();
        } else if (query != null) {
          e.preventDefault();
          setQuery(null);
          filter(null);
        }
      } else if (e.key === "Tab") {
        hide();
      }
    };

    const visible = usable(optionsOf(el)).length;

    return (
      <host
        shadowDom={{ delegatesFocus: true }}
        onclick={(e: MouseEvent) => {
          const option = e.composedPath().find((n) => (n as Element).localName === "st-option") as
            | OptionEl
            | undefined;
          if (option) {
            if (!option.disabled) {
              commit(optionValue(option));
              hide();
              input.current?.focus();
            }
            return;
          }
          if (reopenGuard.current) {
            reopenGuard.current = false;
            return;
          }
          show();
        }}
        onpointerdown={() => {
          reopenGuard.current = open;
        }}
        onpointermove={(e: PointerEvent) => {
          const option = e.composedPath().find((n) => (n as Element).localName === "st-option") as
            | OptionEl
            | undefined;
          if (option && !option.disabled && option !== active.current) activate(option);
        }}
      >
        <input
          ref={input}
          part="input"
          value={text}
          placeholder={placeholder ?? ""}
          disabled={disabled}
          autocomplete="off"
          spellcheck={false}
          oninput={(e: Event) => {
            e.stopPropagation();
            const q = (e.target as HTMLInputElement).value;
            setQuery(q);
            filter(q);
            show();
            requestAnimationFrame(() => activate(usable(optionsOf(el))[0] ?? null));
          }}
          onchange={(e: Event) => e.stopPropagation()}
          onblur={() => {
            if (!listbox.current?.matches(":popover-open")) commitText();
          }}
          onkeydown={onkeydown}
        />
        <span class="chevron" aria-hidden="true">
          <ChevronDown />
        </span>
        <div
          ref={listbox}
          class="listbox"
          part="listbox"
          popover="auto"
          ontoggle={(e: ToggleEvent) => {
            const isOpen = e.newState === "open";
            setOpen(isOpen);
            if (!isOpen && input.current !== (host.current.shadowRoot as ShadowRoot).activeElement)
              commitText();
          }}
        >
          <slot onslotchange={() => rerender((n) => n + 1)} />
          {visible === 0 && <div class="empty">{emptyText ?? "No results"}</div>}
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
      allowCustom: { type: Boolean, reflect: true },
      emptyText: { type: String, reflect: true },
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
        }
        .chevron {
          display: inline-grid;
          flex: none;
          width: 14px;
          height: 14px;
          margin-inline-end: var(--st-space-1);
          color: var(--st-text-muted);
        }
      `,
    ],
  },
);
