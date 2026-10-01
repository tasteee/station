import { c, css, type, useEffect, useHost, useProp, useRef, useState } from "atomico";
import type { TableColumn, TableRow, TableSort } from "../data-types.ts";
import { fire } from "../shared/events.ts";
import { hostReset } from "../shared/styles.ts";

export type { TableColumn, TableRow, TableSort };

type TableEl = HTMLElement & {
  rows?: TableRow[];
  columns?: TableColumn[];
  selection?: string[];
  sort?: TableSort | null;
};

const OVERSCAN = 6;
const DEFAULT_WIDTH = 140;

/** Replace fields on one row. Pure. */
export function updateRow(rows: TableRow[], id: string, patch: Record<string, unknown>): TableRow[] {
  return rows.map((r) => (r.id === id ? { ...r, ...patch } : r));
}

function compare(a: unknown, b: unknown) {
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a ?? "").localeCompare(String(b ?? ""), undefined, { numeric: true, sensitivity: "base" });
}

/**
 * Virtualized data grid for asset browsers, database tools and property sheets.
 * `columns` and `rows` are properties; the table never mutates them.
 *
 * Events: change (selection), sortchange, cellchange ({ id, key, value }), columnresize, action (Enter / double-click on a read-only cell).
 */
export const DataTable = c(
  ({ rows, columns, selectionMode, manualSort, label }) => {
    const host = useHost<TableEl>();
    const [selection, setSelection] = useProp<string[]>("selection");
    const [sort, setSort] = useProp<TableSort | null>("sort");
    const [widths, setWidths] = useState<Record<string, number>>({});
    const [active, setActive] = useState<{ row: number; col: number }>({ row: 0, col: 0 });
    const [editing, setEditing] = useState<{ row: number; col: number; initial?: string } | null>(null);
    const [scrollTop, setScrollTop] = useState(0);
    const [viewportHeight, setViewportHeight] = useState(300);
    const [rowHeight, setRowHeight] = useState(28);
    const viewport = useRef<HTMLDivElement>();
    const probe = useRef<HTMLDivElement>();
    const anchor = useRef<number | null>(null);
    const resizing = useRef<{ key: string; startX: number; start: number; width: number } | null>(null);

    const cols = columns ?? [];
    const mode = selectionMode ?? "multiple";
    const selected = new Set(selection ?? []);
    const data = (() => {
      const list = rows ?? [];
      if (!sort || manualSort) return list;
      const factor = sort.direction === "descending" ? -1 : 1;
      return [...list].sort((a, b) => compare(a[sort.key], b[sort.key]) * factor);
    })();
    const widthOf = (col: TableColumn) => widths[col.key] ?? col.width ?? DEFAULT_WIDTH;
    const template = `${cols.map((col) => `${widthOf(col)}px`).join(" ")} minmax(0, 1fr)`;
    const totalWidth = cols.reduce((sum, col) => sum + widthOf(col), 0);

    // A custom property, not the style attribute, so user styles survive.
    useEffect(() => host.current.style.setProperty("--_cols", template), [template]);

    useEffect(() => {
      const vp = viewport.current!;
      const measure = () => {
        setViewportHeight(vp.clientHeight);
        setRowHeight(probe.current!.getBoundingClientRect().height || 28);
      };
      const ro = new ResizeObserver(measure);
      ro.observe(vp);
      ro.observe(probe.current!);
      measure();
      return () => ro.disconnect();
    }, []);

    const header = rowHeight;
    const first = Math.max(0, Math.floor(scrollTop / rowHeight) - OVERSCAN);
    const last = Math.min(data.length, Math.ceil((scrollTop + viewportHeight) / rowHeight) + OVERSCAN);
    const act = {
      row: Math.min(active.row, Math.max(0, data.length - 1)),
      col: Math.min(active.col, Math.max(0, cols.length - 1)),
    };

    const scrollIntoView = (row: number, col: number) => {
      const vp = viewport.current!;
      const top = row * rowHeight;
      const bodyHeight = vp.clientHeight - header;
      if (top < vp.scrollTop) vp.scrollTop = top;
      else if (top + rowHeight > vp.scrollTop + bodyHeight) vp.scrollTop = top + rowHeight - bodyHeight;
      const left = cols.slice(0, col).reduce((s, c2) => s + widthOf(c2), 0);
      const w = cols[col] ? widthOf(cols[col]!) : 0;
      if (left < vp.scrollLeft) vp.scrollLeft = left;
      else if (left + w > vp.scrollLeft + vp.clientWidth) vp.scrollLeft = left + w - vp.clientWidth;
    };

    const commitSelection = (next: string[]) => {
      if (mode === "none") return;
      if (next.length === selected.size && next.every((id) => selected.has(id))) return;
      setSelection(next);
      fire(host.current, "change", { selection: next });
    };

    const selectRow = (index: number, e: { shiftKey?: boolean; metaKey?: boolean; ctrlKey?: boolean }) => {
      const row = data[index];
      if (!row) return;
      if (mode === "multiple" && e.shiftKey && anchor.current != null) {
        const [a, b] = anchor.current < index ? [anchor.current, index] : [index, anchor.current];
        commitSelection(data.slice(a, b + 1).map((r) => r.id));
      } else if (mode === "multiple" && (e.metaKey || e.ctrlKey)) {
        anchor.current = index;
        commitSelection(
          selected.has(row.id) ? [...selected].filter((id) => id !== row.id) : [...selected, row.id],
        );
      } else {
        anchor.current = index;
        commitSelection([row.id]);
      }
    };

    const moveTo = (row: number, col: number, e: KeyboardEvent | null) => {
      const r = Math.max(0, Math.min(data.length - 1, row));
      const cIdx = Math.max(0, Math.min(cols.length - 1, col));
      setActive({ row: r, col: cIdx });
      scrollIntoView(r, cIdx);
      if (e && r !== act.row) {
        if (e.shiftKey && mode === "multiple") selectRow(r, { shiftKey: true });
        else if (!(e.metaKey || e.ctrlKey)) selectRow(r, {});
      }
    };

    const startEdit = (row: number, col: number, initial?: string) => {
      if (!cols[col]?.editable || !data[row]) return false;
      setEditing({ row, col, initial });
      return true;
    };

    const commitEdit = (raw: string, move: "down" | "right" | "none") => {
      const e = editing;
      if (!e) return;
      setEditing(null);
      viewport.current?.focus({ preventScroll: true });
      const col = cols[e.col]!;
      const row = data[e.row]!;
      const value = col.type === "number" ? Number(raw) : raw;
      if (!(col.type === "number" && Number.isNaN(value)) && value !== row[col.key]) {
        fire(host.current, "cellchange", { id: row.id, key: col.key, value });
      }
      if (move === "down") moveTo(e.row + 1, e.col, null);
      if (move === "right") moveTo(e.row, e.col + 1, null);
    };

    const onkeydown = (e: KeyboardEvent) => {
      if (editing) return;
      const page = Math.max(1, Math.floor((viewportHeight - header) / rowHeight) - 1);
      const mod = e.metaKey || e.ctrlKey;
      const keys: Record<string, () => void> = {
        ArrowDown: () => moveTo(act.row + 1, act.col, e),
        ArrowUp: () => moveTo(act.row - 1, act.col, e),
        ArrowRight: () => moveTo(act.row, act.col + 1, null),
        ArrowLeft: () => moveTo(act.row, act.col - 1, null),
        PageDown: () => moveTo(act.row + page, act.col, e),
        PageUp: () => moveTo(act.row - page, act.col, e),
        Home: () => (mod ? moveTo(0, 0, e) : moveTo(act.row, 0, null)),
        End: () =>
          mod ? moveTo(data.length - 1, cols.length - 1, e) : moveTo(act.row, cols.length - 1, null),
        Enter: () => {
          if (!startEdit(act.row, act.col)) fire(host.current, "action", { id: data[act.row]?.id });
        },
        F2: () => startEdit(act.row, act.col),
        // Space toggles the row in a multi-selection, or selects it.
        " ": () => selectRow(act.row, mode === "multiple" ? { metaKey: true } : {}),
      };
      if (keys[e.key]) {
        e.preventDefault();
        keys[e.key]!();
      } else if (mod && e.key.toLowerCase() === "a" && mode === "multiple") {
        e.preventDefault();
        commitSelection(data.map((r) => r.id));
      } else if (e.key.length === 1 && !mod && !e.altKey && cols[act.col]?.editable) {
        // Spreadsheet behavior: typing replaces the cell.
        e.preventDefault();
        startEdit(act.row, act.col, e.key);
      }
    };

    const cycleSort = (col: TableColumn) => {
      if (!col.sortable) return;
      const next: TableSort | null =
        sort?.key !== col.key
          ? { key: col.key, direction: "ascending" }
          : sort.direction === "ascending"
            ? { key: col.key, direction: "descending" }
            : null;
      setSort(next);
      fire(host.current, "sortchange", next ?? { key: col.key, direction: null });
    };

    useEffect(() => {
      if (!editing) return;
      const input = viewport.current?.querySelector(".editor") as HTMLInputElement | null;
      if (!input) return;
      input.focus();
      if (editing.initial != null) {
        input.value = editing.initial;
        input.setSelectionRange(input.value.length, input.value.length);
      } else input.select();
    }, [editing]);

    const cellId = (r: number, col: number) => `cell-${r}-${col}`;

    return (
      <host shadowDom>
        <div ref={probe} class="probe" aria-hidden="true" />
        <div
          ref={viewport}
          class="viewport"
          part="viewport"
          role="grid"
          tabindex="0"
          aria-label={label}
          aria-rowcount={String(data.length + 1)}
          aria-colcount={String(cols.length)}
          aria-multiselectable={mode === "multiple" ? "true" : null}
          aria-activedescendant={
            data.length && act.row >= first && act.row < last && !editing ? cellId(act.row, act.col) : null
          }
          onscroll={(e: Event) => setScrollTop((e.target as HTMLElement).scrollTop)}
          onkeydown={onkeydown}
        >
          <div class="header" role="row" aria-rowindex="1" style={`min-width:${totalWidth}px`}>
            {cols.map((col) => {
              const dir = sort?.key === col.key ? sort.direction : null;
              return (
                <div
                  class="th"
                  role="columnheader"
                  data-align={col.align ?? (col.type === "number" ? "end" : "start")}
                  data-sortable={col.sortable ? "" : null}
                  aria-sort={dir ?? (col.sortable ? "none" : null)}
                  onclick={() => cycleSort(col)}
                >
                  <span class="th-label">{col.label}</span>
                  {dir && (
                    <svg class="sort" viewBox="0 0 16 16" aria-hidden="true">
                      <path
                        d={dir === "ascending" ? "M5 10l3-3 3 3" : "M5 6l3 3 3-3"}
                        fill="none"
                        stroke="currentColor"
                        stroke-width="1.5"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      />
                    </svg>
                  )}
                  <span
                    class="resize"
                    onclick={(e: Event) => e.stopPropagation()}
                    onpointerdown={(e: PointerEvent) => {
                      e.stopPropagation();
                      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
                      resizing.current = {
                        key: col.key,
                        startX: e.clientX,
                        start: widthOf(col),
                        width: widthOf(col),
                      };
                    }}
                    onpointermove={(e: PointerEvent) => {
                      const r = resizing.current;
                      if (!r || r.key !== col.key) return;
                      const w = Math.max(col.minWidth ?? 48, Math.round(r.start + e.clientX - r.startX));
                      r.width = w;
                      setWidths({ ...widths, [col.key]: w });
                    }}
                    onpointerup={() => {
                      const r = resizing.current;
                      resizing.current = null;
                      if (r) fire(host.current, "columnresize", { key: r.key, width: r.width });
                    }}
                  />
                </div>
              );
            })}
          </div>
          <div
            class="body"
            role="rowgroup"
            style={`height:${data.length * rowHeight}px;min-width:${totalWidth}px`}
          >
            {data.slice(first, last).map((row, i) => {
              const r = first + i;
              return (
                <div
                  class="tr"
                  role="row"
                  aria-rowindex={String(r + 2)}
                  aria-selected={mode === "none" ? null : selected.has(row.id) ? "true" : "false"}
                  data-selected={selected.has(row.id) ? "" : null}
                  style={`transform:translateY(${r * rowHeight}px)`}
                >
                  {cols.map((col, ci) => {
                    const isEditing = editing && editing.row === r && editing.col === ci;
                    const value = row[col.key];
                    return (
                      <div
                        class="td"
                        id={cellId(r, ci)}
                        role="gridcell"
                        aria-colindex={String(ci + 1)}
                        data-align={col.align ?? (col.type === "number" ? "end" : "start")}
                        data-number={col.type === "number" ? "" : null}
                        data-active={act.row === r && act.col === ci ? "" : null}
                        data-editable={col.editable ? "" : null}
                        onpointerdown={(e: PointerEvent) => {
                          if (isEditing || e.button !== 0) return;
                          setActive({ row: r, col: ci });
                          selectRow(r, e);
                          viewport.current!.focus({ preventScroll: true });
                          e.preventDefault();
                        }}
                        ondblclick={() => {
                          if (!startEdit(r, ci)) fire(host.current, "action", { id: row.id });
                        }}
                      >
                        {isEditing ? (
                          <input
                            class="editor"
                            aria-label={col.label}
                            value={String(value ?? "")}
                            inputMode={col.type === "number" ? "decimal" : "text"}
                            onkeydown={(e: KeyboardEvent) => {
                              e.stopPropagation();
                              const t = e.target as HTMLInputElement;
                              if (e.key === "Enter") commitEdit(t.value, "down");
                              else if (e.key === "Tab") {
                                e.preventDefault();
                                commitEdit(t.value, "right");
                              } else if (e.key === "Escape") {
                                setEditing(null);
                                viewport.current?.focus({ preventScroll: true });
                              }
                            }}
                            onblur={(e: FocusEvent) =>
                              editing && commitEdit((e.target as HTMLInputElement).value, "none")
                            }
                          />
                        ) : (
                          <span class="text">
                            {col.format ? col.format(value, row) : String(value ?? "")}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
          {data.length === 0 && (
            <div class="empty">
              <slot name="empty" />
            </div>
          )}
        </div>
      </host>
    );
  },
  {
    props: {
      rows: type<TableRow[]>(Array),
      columns: type<TableColumn[]>(Array),
      selection: type<string[]>(Array),
      sort: type<TableSort | null>(Object),
      selectionMode: { type: String, reflect: true },
      manualSort: { type: Boolean, reflect: true },
      label: { type: String, reflect: true },
    },
    styles: [
      hostReset,
      css`
        :host {
          --_row: var(--st-table-row-height, calc(var(--st-control-height) + 4px));
          display: flex;
          flex-direction: column;
          min-height: 0;
          font-family: var(--st-font-sans);
          font-size: var(--st-text-2);
          color: var(--st-text);
          background: var(--st-bg-panel);
        }
        .probe {
          position: absolute;
          height: var(--_row);
          visibility: hidden;
        }
        .viewport {
          position: relative;
          flex: 1;
          min-height: 0;
          overflow: auto;
          outline: none;
          overscroll-behavior: contain;
          scrollbar-width: thin;
          scrollbar-color: var(--st-gray-a7) transparent;
        }
        .header,
        .tr {
          display: grid;
          grid-template-columns: var(--_cols);
        }
        .header {
          position: sticky;
          top: 0;
          z-index: 1;
          height: var(--_row);
          background: var(--st-bg-panel);
          box-shadow: inset 0 -1px 0 var(--st-border-subtle);
        }
        .th {
          position: relative;
          display: flex;
          align-items: center;
          gap: var(--st-space-1);
          min-width: 0;
          padding-inline: var(--st-space-2);
          font-size: var(--st-text-1);
          font-weight: var(--st-weight-medium);
          color: var(--st-text-muted);
          user-select: none;
        }
        .th[data-sortable] {
          cursor: default;
        }
        .th[data-sortable]:hover {
          color: var(--st-text-strong);
        }
        .th[aria-sort="ascending"],
        .th[aria-sort="descending"] {
          color: var(--st-text-strong);
        }
        .th[data-align="end"] {
          justify-content: flex-end;
        }
        .th-label {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .sort {
          width: 12px;
          height: 12px;
          flex: none;
        }
        .resize {
          position: absolute;
          top: 4px;
          bottom: 4px;
          right: -3px;
          width: 7px;
          cursor: col-resize;
          z-index: 1;
          touch-action: none;
        }
        .resize::after {
          content: "";
          position: absolute;
          left: 3px;
          top: 0;
          bottom: 0;
          width: 1px;
          background: var(--st-border-subtle);
        }
        .resize:hover::after {
          background: var(--st-border-focus);
          width: 2px;
          left: 2.5px;
        }
        .body {
          position: relative;
        }
        .tr {
          position: absolute;
          left: 0;
          right: 0;
          top: 0;
          height: var(--_row);
          box-shadow: inset 0 -1px 0 var(--st-gray-a2);
        }
        .tr:hover {
          background: var(--st-bg-hover);
        }
        .tr[data-selected] {
          background: var(--st-bg-selected);
          color: var(--st-text-strong);
        }
        .viewport:focus-within .tr[data-selected] {
          background: var(--st-bg-selected-strong);
          color: var(--st-text-selected);
        }
        .td {
          display: flex;
          align-items: center;
          min-width: 0;
          padding-inline: var(--st-space-2);
          overflow: hidden;
          white-space: nowrap;
          user-select: none;
          cursor: default;
        }
        .td[data-align="end"] {
          justify-content: flex-end;
        }
        .td[data-align="center"] {
          justify-content: center;
        }
        .td[data-number] {
          font-family: var(--st-font-numeric);
          letter-spacing: -0.02em;
        }
        .text {
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .viewport:focus-visible .td[data-active] {
          box-shadow: inset 0 0 0 var(--st-focus-ring-width) var(--st-border-focus);
        }
        .editor {
          all: unset;
          width: 100%;
          height: calc(var(--_row) - 4px);
          padding-inline: var(--st-space-1);
          margin-inline: calc(var(--st-space-1) * -1);
          border-radius: var(--st-radius-1);
          background: var(--st-bg-panel);
          color: var(--st-text-strong);
          box-shadow: 0 0 0 1px var(--st-border-focus);
          font: inherit;
          text-align: inherit;
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
