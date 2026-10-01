import { c, css, useEffect, useHost, useProp, useRef } from "atomico";
import { fire } from "../shared/events.ts";
import { hostReset } from "../shared/styles.ts";

/**
 * Text you rename in place: double-click, Enter or F2 to edit; Enter commits, Escape cancels.
 * Inherits the surrounding font, so it fits in tabs, rows and headings.
 *
 * <st-inline-edit value="Frame 12" label="Layer name"></st-inline-edit>
 */
export const InlineEdit = c(
  ({ placeholder, label, disabled }) => {
    const host = useHost<HTMLElement & { value?: string }>();
    const [value, setValue] = useProp<string>("value");
    const [editing, setEditing] = useProp<boolean>("editing");
    const input = useRef<HTMLInputElement>();
    // True while an edit is open; cleared before the input's blur can commit it twice.
    const active = useRef(false);

    useEffect(() => {
      const el = host.current;
      if (!el.hasAttribute("tabindex") && !disabled) el.tabIndex = 0;
      if (disabled) el.removeAttribute("tabindex");
      el.setAttribute("role", "button");
      el.setAttribute("aria-label", `${label ?? "Edit"}: ${value ?? ""}`);
      el.setAttribute("aria-description", "Press Enter to edit");
    }, [label, value, disabled]);

    useEffect(() => {
      if (!editing) return;
      const i = input.current!;
      i.value = value ?? "";
      i.focus();
      i.select();
    }, [editing]);

    const start = () => {
      if (disabled) return;
      active.current = true;
      setEditing(true);
    };
    const finish = (commit: boolean) => {
      if (!active.current) return;
      active.current = false;
      const next = input.current!.value.trim();
      setEditing(false);
      host.current.focus();
      if (commit && next && next !== value) {
        setValue(next);
        fire(host.current, "change", { value: next });
      } else if (!commit) fire(host.current, "cancel");
    };

    return (
      <host
        shadowDom
        ondblclick={start}
        onkeydown={(e: KeyboardEvent) => {
          if (e.target !== host.current || editing) return;
          if (e.key === "Enter" || e.key === "F2") {
            e.preventDefault();
            start();
          }
        }}
      >
        {editing ? (
          <input
            ref={input}
            part="input"
            aria-label={label ?? "Edit"}
            onkeydown={(e: KeyboardEvent) => {
              e.stopPropagation();
              if (e.key === "Enter") finish(true);
              if (e.key === "Escape") finish(false);
            }}
            onblur={() => finish(true)}
          />
        ) : (
          <span class={value ? "text" : "text placeholder"} part="text">
            {value || placeholder || ""}
          </span>
        )}
      </host>
    );
  },
  {
    props: {
      value: { type: String, reflect: true },
      placeholder: { type: String, reflect: true },
      label: { type: String, reflect: true },
      editing: { type: Boolean, reflect: true },
      disabled: { type: Boolean, reflect: true },
    },
    styles: [
      hostReset,
      css`
        :host {
          display: inline-flex;
          min-width: 0;
          max-width: 100%;
          border-radius: var(--st-radius-1);
          outline: none;
          cursor: default;
        }
        :host(:focus-visible) {
          outline: var(--st-focus-ring-width) solid var(--st-border-focus);
          outline-offset: 1px;
        }
        .text {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .placeholder {
          color: var(--st-text-faint);
        }
        input {
          all: unset;
          font: inherit;
          color: var(--st-text-strong);
          min-width: 4ch;
          width: 100%;
          padding-inline: 2px;
          margin-inline: -2px;
          border-radius: var(--st-radius-1);
          background: var(--st-bg-panel);
          box-shadow: 0 0 0 1px var(--st-border-focus);
          field-sizing: content;
        }
      `,
    ],
  },
);
