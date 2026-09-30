import { c, css, useProp } from "atomico";
import { fire } from "../shared/events.ts";
import { controlBase, fieldBase, hostReset } from "../shared/styles.ts";
import { useTextValue } from "./use-field.ts";

/**
 * Multi-line text. Grows with its content (field-sizing) from `rows` up to `max-rows`.
 * <st-textarea label="Description" rows="3"></st-textarea>
 */
export const Textarea = c(
  ({ placeholder, name, disabled, readonly, required, label, rows, maxRows }) => {
    const [value, setValue] = useProp<string>("value");
    const { host, input } = useTextValue<HTMLTextAreaElement>({ value, required, label });
    return (
      <host shadowDom={{ delegatesFocus: true }} style={`--_rows:${rows ?? 3};--_max-rows:${maxRows ?? 12}`}>
        <textarea
          ref={input}
          part="input"
          name={name}
          placeholder={placeholder ?? ""}
          disabled={disabled}
          readOnly={readonly}
          required={required}
          rows={rows ?? 3}
          oninput={(e: Event) => setValue((e.target as HTMLTextAreaElement).value)}
          onchange={() => fire(host.current, "change")}
        />
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
      rows: { type: Number, reflect: true },
      maxRows: { type: Number, reflect: true },
      disabled: { type: Boolean, reflect: true },
      readonly: { type: Boolean, reflect: true },
      required: { type: Boolean, reflect: true },
      invalid: { type: Boolean, reflect: true },
    },
    styles: [
      hostReset,
      controlBase,
      fieldBase,
      css`
        :host {
          display: flex;
          height: auto;
          align-items: stretch;
          line-height: var(--st-leading);
        }
        textarea {
          display: block;
          height: auto;
          padding-block: calc((var(--_height) - 1lh) / 2 - 1px);
          field-sizing: content;
          min-height: calc(var(--_rows) * 1lh + var(--_height) - 1lh - 2px);
          max-height: calc(var(--_max-rows) * 1lh + var(--_height) - 1lh - 2px);
          overflow: auto;
          resize: none;
          white-space: pre-wrap;
          scrollbar-width: thin;
        }
      `,
    ],
  },
);
