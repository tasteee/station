import { c, css, useProp } from "atomico";
import { fire } from "../shared/events.ts";
import { Close, Search } from "../shared/glyphs.tsx";
import { controlBase, fieldBase, hostReset } from "../shared/styles.ts";
import { useSlotFilled, useTextValue } from "./use-field.ts";

const clearStyles = css`
  .clear {
    all: unset;
    display: grid;
    place-items: center;
    width: calc(var(--_height) - 8px);
    height: calc(var(--_height) - 8px);
    border-radius: var(--st-radius-1);
    color: var(--st-text-faint);
    cursor: default;
  }
  .clear:hover {
    color: var(--st-text-strong);
    background: var(--st-bg-hover);
  }
  .clear svg,
  .glyph svg {
    width: 12px;
    height: 12px;
  }
  .glyph {
    display: inline-grid;
    color: var(--st-text-muted);
  }
  .glyph svg {
    width: var(--st-icon-size);
    height: var(--st-icon-size);
  }
`;

function createTextField(search: boolean) {
  return c(
    ({
      placeholder,
      name,
      disabled,
      readonly,
      required,
      type,
      icon,
      label,
      clearable,
      autocomplete,
      maxlength,
    }) => {
      const [value, setValue] = useProp<string>("value");
      const { host, internals, input } = useTextValue<HTMLInputElement>({ value, required, label });
      const [hasStart, onStart] = useSlotFilled();
      const [hasEnd, onEnd] = useSlotFilled();
      const canClear = (search || clearable) && !!value && !disabled && !readonly;

      const clear = () => {
        setValue("");
        if (input.current) input.current.value = "";
        fire(host.current, "input");
        fire(host.current, "change");
        input.current?.focus();
      };

      return (
        <host
          shadowDom={{ delegatesFocus: true }}
          onclick={(e: Event) => e.target === host.current && input.current?.focus()}
        >
          <span class="affix start" hidden={!(icon || search || hasStart)}>
            {search && (
              <span class="glyph">
                <Search />
              </span>
            )}
            {icon && <st-icon name={icon} />}
            <slot name="start" onslotchange={onStart} />
          </span>
          <input
            ref={input}
            part="input"
            type={search ? "search" : (type ?? "text")}
            name={name}
            placeholder={placeholder ?? (search ? "Search" : "")}
            disabled={disabled}
            readOnly={readonly}
            required={required}
            autocomplete={(autocomplete ?? (search ? "off" : null)) as AutoFill | null}
            maxLength={maxlength ?? null}
            spellcheck={false}
            oninput={(e: Event) => setValue((e.target as HTMLInputElement).value)}
            onchange={() => fire(host.current, "change")}
            onkeydown={(e: KeyboardEvent) => {
              if (e.key === "Enter" && internals.form) internals.form.requestSubmit();
              if (e.key === "Escape" && search && value) {
                e.preventDefault();
                clear();
              }
            }}
          />
          <span class="affix end" hidden={!(canClear || hasEnd)}>
            <slot name="end" onslotchange={onEnd} />
            {canClear && (
              <button type="button" class="clear" tabindex="-1" aria-label="Clear" onclick={clear}>
                <Close />
              </button>
            )}
          </span>
        </host>
      );
    },
    {
      form: true,
      props: {
        value: { type: String, reflect: false },
        placeholder: { type: String, reflect: true },
        name: { type: String, reflect: true },
        label: { type: String, reflect: true },
        kind: { type: String, reflect: true },
        size: { type: String, reflect: true },
        icon: { type: String, reflect: true },
        type: { type: String, reflect: true },
        disabled: { type: Boolean, reflect: true },
        readonly: { type: Boolean, reflect: true },
        required: { type: Boolean, reflect: true },
        invalid: { type: Boolean, reflect: true },
        clearable: { type: Boolean, reflect: true },
        autocomplete: { type: String, reflect: true },
        maxlength: { type: Number, reflect: true },
      },
      styles: [
        hostReset,
        controlBase,
        fieldBase,
        clearStyles,
        css`
          input::-webkit-search-cancel-button {
            display: none;
          }
          [hidden] {
            display: none !important;
          }
        `,
      ],
    },
  );
}

/**
 * Single-line text input.
 * <st-text-field label="Layer name" value="Frame 12"></st-text-field>
 */
export const TextField = createTextField(false);

/**
 * Search input: leading search glyph, clear button, Escape clears.
 * <st-search-field label="Search layers"></st-search-field>
 */
export const SearchField = createTextField(true);
