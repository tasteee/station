import { fuzzyMatch, matchesShortcut } from "@station/behaviors";
import { c, css, type, useEffect, useHost, useProp, useRef, useState } from "atomico";
import type { Command } from "../data-types.ts";
import { fire, fireOpenChange } from "../shared/events.ts";
import { hostReset } from "../shared/styles.ts";

export type { Command };

const LIMIT = 50;

function highlight(text: string, indices: number[]) {
  if (!indices.length) return text;
  const set = new Set(indices);
  return [...text].map((ch, i) => (set.has(i) ? <mark>{ch}</mark> : ch));
}

/**
 * Search-everything command launcher. `hotkey` opens it from anywhere.
 * Fires `select` with the chosen command's id.
 *
 * palette.commands = [{ id: "flatten", label: "Flatten Image", group: "Layer", shortcut: "Mod+Shift+E" }]
 * <st-command-palette hotkey="Mod+K" placeholder="Search commands"></st-command-palette>
 */
export const CommandPalette = c(
  ({ commands, placeholder, hotkey, emptyText }) => {
    const host = useHost<HTMLElement & { open?: boolean; show(): void; close(): void }>();
    const [open, setOpen] = useProp<boolean>("open");
    const [query, setQuery] = useState("");
    const [active, setActive] = useState(0);
    const dialog = useRef<HTMLDialogElement>();
    const input = useRef<HTMLInputElement>();
    const list = useRef<HTMLElement>();

    const all = (commands ?? []).filter((cmd) => !cmd.disabled);
    const results = query.trim()
      ? all
          .map((cmd) => {
            const main = fuzzyMatch(query, cmd.label);
            const extra = Math.max(-1, ...(cmd.keywords ?? []).map((k) => fuzzyMatch(query, k)?.score ?? -1));
            const score = Math.max(main?.score ?? -1, extra - 2);
            return { cmd, score, indices: main?.indices ?? [] };
          })
          .filter((r) => r.score >= 0)
          .sort((a, b) => b.score - a.score)
          .slice(0, LIMIT)
      : all.slice(0, LIMIT).map((cmd) => ({ cmd, score: 0, indices: [] as number[] }));

    useEffect(() => {
      const d = dialog.current!;
      if (open && !d.open) {
        setQuery("");
        setActive(0);
        d.showModal();
        requestAnimationFrame(() => input.current?.focus());
      } else if (!open && d.open) d.close();
    }, [open]);

    useEffect(() => {
      const el = host.current;
      el.show = () => (el.open = true);
      el.close = () => (el.open = false);
    }, []);

    useEffect(() => {
      if (!hotkey) return;
      const onKey = (e: KeyboardEvent) => {
        if (!matchesShortcut(e, hotkey)) return;
        e.preventDefault();
        host.current.open = !host.current.open;
      };
      document.addEventListener("keydown", onKey);
      return () => document.removeEventListener("keydown", onKey);
    }, [hotkey]);

    useEffect(() => {
      list.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
    }, [active, query]);

    const run = (cmd: Command | undefined) => {
      if (!cmd) return;
      dialog.current!.close();
      fire(host.current, "select", { id: cmd.id });
    };

    let lastGroup: string | undefined;
    const searching = !!query.trim();

    return (
      <host shadowDom>
        <dialog
          ref={dialog}
          part="dialog"
          aria-label="Command palette"
          onclose={() => {
            if (open) {
              setOpen(false);
              fireOpenChange(host.current, false);
            }
          }}
          onclick={(e: MouseEvent) => e.target === dialog.current && dialog.current!.close()}
        >
          <div class="search">
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path
                d="M7 12A5 5 0 1 0 7 2a5 5 0 0 0 0 10zM14 14l-3.5-3.5"
                fill="none"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
              />
            </svg>
            <input
              ref={input}
              part="input"
              role="combobox"
              aria-expanded="true"
              aria-controls="results"
              aria-activedescendant={results.length ? `cmd-${active}` : null}
              placeholder={placeholder ?? "Search commands…"}
              value={query}
              autocomplete="off"
              spellcheck={false}
              oninput={(e: Event) => {
                e.stopPropagation();
                setQuery((e.target as HTMLInputElement).value);
                setActive(0);
              }}
              onkeydown={(e: KeyboardEvent) => {
                if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                  e.preventDefault();
                  const n = results.length;
                  if (n) setActive((active + (e.key === "ArrowDown" ? 1 : -1) + n) % n);
                } else if (e.key === "Enter") {
                  e.preventDefault();
                  run(results[active]?.cmd);
                }
              }}
            />
          </div>
          <div ref={list} class="results" id="results" role="listbox" part="results">
            {results.map(({ cmd, indices }, i) => {
              const header = !searching && cmd.group && cmd.group !== lastGroup ? cmd.group : null;
              lastGroup = cmd.group;
              return [
                header && (
                  <div class="group" role="presentation">
                    {header}
                  </div>
                ),
                <div
                  class="item"
                  id={`cmd-${i}`}
                  role="option"
                  data-index={String(i)}
                  aria-selected={i === active ? "true" : "false"}
                  onpointermove={() => i !== active && setActive(i)}
                  onclick={() => run(cmd)}
                >
                  <span class="icon">{cmd.icon && <st-icon name={cmd.icon} />}</span>
                  <span class="label">{highlight(cmd.label, indices)}</span>
                  {searching && cmd.group && <span class="where">{cmd.group}</span>}
                  {cmd.shortcut && <st-kbd shortcut={cmd.shortcut} />}
                </div>,
              ];
            })}
            {results.length === 0 && <div class="empty">{emptyText ?? "No matching commands"}</div>}
          </div>
        </dialog>
      </host>
    );
  },
  {
    props: {
      commands: type<Command[]>(Array),
      open: { type: Boolean, reflect: true },
      placeholder: { type: String, reflect: true },
      hotkey: { type: String, reflect: true },
      emptyText: { type: String, reflect: true },
    },
    styles: [
      hostReset,
      css`
        :host {
          display: contents;
        }
        dialog {
          box-sizing: border-box;
          width: min(560px, calc(100vw - 32px));
          max-height: min(440px, calc(100vh - 120px));
          margin: 12vh auto auto;
          padding: 0;
          border: 0;
          border-radius: var(--st-radius-5);
          background: var(--st-bg-panel);
          color: var(--st-text);
          box-shadow: var(--st-shadow-dialog);
          font-family: var(--st-font-sans);
          font-size: var(--st-text-2);
          overflow: hidden;
        }
        dialog[open] {
          display: flex;
          flex-direction: column;
          animation: in var(--st-duration) var(--st-ease);
        }
        dialog::backdrop {
          background: oklch(0% 0 0 / 0.2);
        }
        @keyframes in {
          from {
            opacity: 0;
            translate: 0 -4px;
          }
        }
        .search {
          display: flex;
          align-items: center;
          gap: var(--st-space-2);
          flex: none;
          height: 44px;
          padding-inline: var(--st-space-4);
          border-bottom: 1px solid var(--st-border-subtle);
          color: var(--st-text-muted);
        }
        .search svg {
          width: 16px;
          height: 16px;
          flex: none;
        }
        input {
          all: unset;
          flex: 1;
          font-size: var(--st-text-3);
          color: var(--st-text-strong);
        }
        input::placeholder {
          color: var(--st-text-faint);
        }
        .results {
          flex: 1;
          min-height: 0;
          overflow: auto;
          padding: var(--st-space-1);
          scrollbar-width: thin;
        }
        .group {
          padding: var(--st-space-2) var(--st-space-2) var(--st-space-1);
          font-size: var(--st-text-1);
          font-weight: var(--st-weight-medium);
          color: var(--st-text-muted);
        }
        .item {
          display: flex;
          align-items: center;
          gap: var(--st-space-2);
          height: 32px;
          padding-inline: var(--st-space-2);
          border-radius: var(--st-radius-2);
          color: var(--st-text-strong);
          cursor: default;
          --st-icon-size: 16px;
        }
        .item[aria-selected="true"] {
          background: var(--st-bg-selected-strong);
          color: var(--st-text-selected);
        }
        .icon {
          display: inline-grid;
          width: 16px;
          flex: none;
          color: var(--st-text-muted);
        }
        .label {
          flex: 1;
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        mark {
          background: none;
          color: inherit;
          font-weight: var(--st-weight-strong);
          text-decoration: underline;
          text-underline-offset: 2px;
        }
        .where {
          color: var(--st-text-muted);
          font-size: var(--st-text-1);
        }
        .empty {
          padding: var(--st-space-6) var(--st-space-4);
          text-align: center;
          color: var(--st-text-muted);
        }
      `,
    ],
  },
);
