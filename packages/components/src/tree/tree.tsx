import { createTypeahead } from "@station/behaviors";
import { c, css, type, useEffect, useHost, useProp, useRef, useState } from "atomico";
import { fire } from "../shared/events.ts";
import { hostReset } from "../shared/styles.ts";
import { type FlatRow, findPath, flatten, initialExpanded, type TreeItem, type TreeToggle } from "./model.ts";

type TreeEl = HTMLElement & {
  items?: TreeItem[];
  toggles?: TreeToggle[];
  selection?: string[];
  selectionMode?: "single" | "multiple" | "none";
  renamable?: boolean;
  reorderable?: boolean;
  label?: string;
};

const OVERSCAN = 8;
const EDGE = 24;

interface DropTarget {
  index: number;
  position: "before" | "after" | "inside";
}

/**
 * Virtualized tree for layers, files and scene graphs. Data goes in `items`
 * (a property); the tree never mutates it — it fires events and you update.
 *
 * tree.items = [{ id: "a", label: "Frame", icon: "frame", children: [...] }]
 * tree.toggles = [{ key: "visible", icon: "eye", offIcon: "eye-off", label: "Visibility", default: true }]
 *
 * Events: change (selection), expandchange, itemchange (toggle), rename, move, action (Enter / double-click).
 */
export const Tree = c(
  ({ items, toggles, selectionMode, renamable, reorderable, label }) => {
    const host = useHost<TreeEl>();
    const [selection, setSelection] = useProp<string[]>("selection");
    const expanded = useRef<Set<string> | null>(null);
    const [, setVersion] = useState(0);
    const [active, setActive] = useState<string | null>(null);
    const [scrollTop, setScrollTop] = useState(0);
    const [viewportHeight, setViewportHeight] = useState(400);
    const [rowHeight, setRowHeight] = useState(28);
    const [renaming, setRenaming] = useState<string | null>(null);
    const [drop, setDrop] = useState<DropTarget | null>(null);
    const viewport = useRef<HTMLDivElement>();
    const probe = useRef<HTMLDivElement>();
    const anchor = useRef<string | null>(null);
    const typeahead = useRef(createTypeahead());
    const dragState = useRef<{ ids: string[]; startY: number; active: boolean; pointerId: number } | null>(
      null,
    );

    const data = items ?? [];
    if (!expanded.current) expanded.current = initialExpanded(data);
    const rows = flatten(data, expanded.current);
    const selected = new Set(selection ?? []);
    const mode = selectionMode ?? "multiple";
    const bump = () => setVersion((v) => v + 1);

    // ---- measuring ----
    useEffect(() => {
      const vp = viewport.current!;
      const measure = () => {
        setViewportHeight(vp.clientHeight);
        setRowHeight(probe.current!.getBoundingClientRect().height || 28);
      };
      const observer = new ResizeObserver(measure);
      observer.observe(vp);
      observer.observe(probe.current!);
      measure();
      return () => observer.disconnect();
    }, []);

    // New item arrays can bring new `expanded: true` flags.
    useEffect(() => {
      initialExpanded(data, expanded.current!);
      bump();
    }, [items]);

    const first = Math.max(0, Math.floor(scrollTop / rowHeight) - OVERSCAN);
    const last = Math.min(rows.length, Math.ceil((scrollTop + viewportHeight) / rowHeight) + OVERSCAN);
    const activeRow =
      rows.find((r) => r.item.id === active) ?? rows.find((r) => selected.has(r.item.id)) ?? rows[0];

    // ---- helpers ----
    // Methods defined once still need the current row height.
    const rowHeightRef = useRef(rowHeight);
    rowHeightRef.current = rowHeight;
    const scrollToIndex = (index: number) => {
      const vp = viewport.current!;
      const h = rowHeightRef.current;
      const top = index * h;
      if (top < vp.scrollTop) vp.scrollTop = top;
      else if (top + h > vp.scrollTop + vp.clientHeight) vp.scrollTop = top + h - vp.clientHeight;
    };

    const focusRow = (row: FlatRow | undefined) => {
      if (!row) return;
      setActive(row.item.id);
      scrollToIndex(row.index);
    };

    const commitSelection = (next: string[]) => {
      if (mode === "none") return;
      const same = next.length === selected.size && next.every((id) => selected.has(id));
      if (same) return;
      setSelection(next);
      fire(host.current, "change", { selection: next });
    };

    const select = (row: FlatRow, e: { shiftKey: boolean; metaKey: boolean; ctrlKey: boolean }) => {
      if (row.item.disabled) return;
      const id = row.item.id;
      if (mode === "multiple" && e.shiftKey && anchor.current) {
        const from = rows.findIndex((r) => r.item.id === anchor.current);
        const [a, b] = from < row.index ? [from, row.index] : [row.index, from];
        commitSelection(
          rows
            .slice(a, b + 1)
            .filter((r) => !r.item.disabled)
            .map((r) => r.item.id),
        );
      } else if (mode === "multiple" && (e.metaKey || e.ctrlKey)) {
        anchor.current = id;
        commitSelection(selected.has(id) ? [...selected].filter((s) => s !== id) : [...selected, id]);
      } else {
        anchor.current = id;
        commitSelection([id]);
      }
    };

    const setExpanded = (row: FlatRow, open: boolean) => {
      if (!row.hasChildren || row.expanded === open) return;
      if (open) expanded.current!.add(row.item.id);
      else expanded.current!.delete(row.item.id);
      bump();
      fire(host.current, "expandchange", { id: row.item.id, expanded: open });
    };

    const toggleValue = (item: TreeItem, t: TreeToggle) =>
      (item[t.key] as boolean | undefined) ?? t.default ?? false;

    const flipToggle = (row: FlatRow, t: TreeToggle) => {
      fire(host.current, "itemchange", { id: row.item.id, key: t.key, value: !toggleValue(row.item, t) });
    };

    const canRename = (item: TreeItem) => !!renamable && item.renamable !== false && !item.disabled;

    // Public methods.
    useEffect(() => {
      const el = host.current as TreeEl & Record<string, unknown>;
      el.expand = (id: string) => {
        for (const item of findPath(el.items ?? [], id) ?? [])
          if (item.children) expanded.current!.add(item.id);
        bump();
      };
      el.collapse = (id: string) => {
        expanded.current!.delete(id);
        bump();
      };
      el.expandAll = () => {
        const walk = (list: TreeItem[]) => {
          for (const i of list) {
            if (!i.children) continue;
            expanded.current!.add(i.id);
            walk(i.children);
          }
        };
        walk(el.items ?? []);
        bump();
      };
      el.collapseAll = () => {
        expanded.current!.clear();
        bump();
      };
      el.scrollToItem = (id: string) => {
        (el.expand as (id: string) => void)(findPath(el.items ?? [], id)?.at(-2)?.id ?? id);
        requestAnimationFrame(() => {
          const index = flatten(el.items ?? [], expanded.current!).findIndex((r) => r.item.id === id);
          if (index >= 0) scrollToIndex(index);
        });
      };
      el.rename = (id: string) => setRenaming(id);
    }, []);

    // ---- keyboard ----
    const onkeydown = (e: KeyboardEvent) => {
      if (renaming) return;
      const row = activeRow;
      if (!row) return;
      const page = Math.max(1, Math.floor(viewportHeight / rowHeight) - 1);
      const move = (to: number, extend = e.shiftKey) => {
        const target = rows[Math.max(0, Math.min(rows.length - 1, to))];
        if (!target) return;
        focusRow(target);
        if (mode !== "none") {
          if (extend && mode === "multiple")
            select(target, { shiftKey: true, metaKey: false, ctrlKey: false });
          else if (!(e.metaKey || e.ctrlKey))
            select(target, { shiftKey: false, metaKey: false, ctrlKey: false });
        }
      };
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          move(row.index + 1);
          break;
        case "ArrowUp":
          e.preventDefault();
          move(row.index - 1);
          break;
        case "PageDown":
          e.preventDefault();
          move(row.index + page);
          break;
        case "PageUp":
          e.preventDefault();
          move(row.index - page);
          break;
        case "Home":
          e.preventDefault();
          move(0);
          break;
        case "End":
          e.preventDefault();
          move(rows.length - 1);
          break;
        case "ArrowRight":
          e.preventDefault();
          if (row.hasChildren && !row.expanded) setExpanded(row, true);
          else if (row.expanded) move(row.index + 1, false);
          break;
        case "ArrowLeft":
          e.preventDefault();
          if (row.expanded) setExpanded(row, false);
          else if (row.parentId)
            move(
              rows.findIndex((r) => r.item.id === row.parentId),
              false,
            );
          break;
        case "Enter":
          e.preventDefault();
          fire(host.current, "action", { id: row.item.id });
          break;
        case "F2":
          if (canRename(row.item)) {
            e.preventDefault();
            setRenaming(row.item.id);
          }
          break;
        case " ":
          e.preventDefault();
          if (mode === "multiple" && (e.metaKey || e.ctrlKey))
            select(row, { shiftKey: false, metaKey: true, ctrlKey: true });
          else select(row, { shiftKey: false, metaKey: false, ctrlKey: false });
          break;
        case "*":
          e.preventDefault();
          for (const r of rows)
            if (r.parentId === row.parentId && r.hasChildren) expanded.current!.add(r.item.id);
          bump();
          break;
        default:
          if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "a" && mode === "multiple") {
            e.preventDefault();
            commitSelection(rows.filter((r) => !r.item.disabled).map((r) => r.item.id));
          } else if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
            const i = typeahead.current(
              e.key,
              rows.map((r) => r.item.label),
              row.index,
            );
            if (i >= 0) move(i, false);
          }
      }
    };

    // ---- pointer: select, drag to reorder ----
    const rowFromEvent = (e: Event) => {
      const el = e.composedPath().find((n) => (n as HTMLElement).dataset?.index != null) as
        | HTMLElement
        | undefined;
      return el ? rows[Number(el.dataset.index)] : undefined;
    };

    const dropAt = (clientY: number): DropTarget | null => {
      const vp = viewport.current!;
      const y = clientY - vp.getBoundingClientRect().top + vp.scrollTop;
      const index = Math.floor(y / rowHeight);
      const row = rows[index];
      if (!row) return rows.length ? { index: rows.length - 1, position: "after" } : null;
      const f = (y - index * rowHeight) / rowHeight;
      const position = row.hasChildren && f > 0.25 && f < 0.75 ? "inside" : f < 0.5 ? "before" : "after";
      // Can't drop onto itself or into its own descendants.
      const ids = dragState.current?.ids ?? [];
      const path = findPath(data, row.item.id)?.map((i) => i.id) ?? [];
      if (path.some((id) => ids.includes(id))) return null;
      return { index, position };
    };

    const onpointerdown = (e: PointerEvent) => {
      if (e.button !== 0 || renaming) return;
      const row = rowFromEvent(e);
      if (!row) return;
      const target = e.composedPath()[0] as HTMLElement;
      if (target.closest?.(".chevron, .toggle")) return;
      focusRow(row);
      viewport.current!.focus({ preventScroll: true });
      // Keep a multi-selection when pressing on it, so it can be dragged.
      if (!(selected.has(row.item.id) && !e.shiftKey && !e.metaKey && !e.ctrlKey && selected.size > 1))
        select(row, e);
      if (reorderable && !row.item.disabled) {
        const ids = selected.has(row.item.id) ? [...selected] : [row.item.id];
        dragState.current = { ids, startY: e.clientY, active: false, pointerId: e.pointerId };
      }
    };

    const onpointermove = (e: PointerEvent) => {
      const d = dragState.current;
      if (!d) return;
      if (!d.active) {
        if (Math.abs(e.clientY - d.startY) < 4) return;
        d.active = true;
        viewport.current!.setPointerCapture(d.pointerId);
        host.current.dataset.dragging = "";
      }
      const vp = viewport.current!;
      const r = vp.getBoundingClientRect();
      if (e.clientY < r.top + EDGE) vp.scrollTop -= 8;
      else if (e.clientY > r.bottom - EDGE) vp.scrollTop += 8;
      setDrop(dropAt(e.clientY));
    };

    const onpointerup = (e: PointerEvent) => {
      const d = dragState.current;
      dragState.current = null;
      if (!d?.active) {
        // A plain click on an already-selected row in a multi-selection selects just it.
        const row = rowFromEvent(e);
        if (row && selected.size > 1 && selected.has(row.item.id) && !e.shiftKey && !e.metaKey && !e.ctrlKey)
          select(row, e);
        return;
      }
      delete host.current.dataset.dragging;
      const target = dropAt(e.clientY);
      setDrop(null);
      if (!target) return;
      fire(host.current, "move", {
        ids: d.ids,
        target: rows[target.index]!.item.id,
        position: target.position,
      });
    };

    const cancelDrag = () => {
      if (!dragState.current?.active) return;
      dragState.current = null;
      delete host.current.dataset.dragging;
      setDrop(null);
    };

    // ---- rendering ----
    const renderToggle = (row: FlatRow, t: TreeToggle) => {
      const on = toggleValue(row.item, t);
      return (
        <button
          type="button"
          class="toggle"
          tabindex="-1"
          data-show={t.show ?? "always"}
          data-on={on ? "" : null}
          aria-label={t.label}
          aria-pressed={on ? "true" : "false"}
          onclick={(e: MouseEvent) => {
            e.stopPropagation();
            flipToggle(row, t);
          }}
        >
          <st-icon name={on ? t.icon : (t.offIcon ?? t.icon)} />
        </button>
      );
    };

    const renderRow = (row: FlatRow) => {
      const { item } = row;
      const isSelected = selected.has(item.id);
      const isActive = activeRow?.item.id === item.id;
      const starts = (toggles ?? []).filter((t) => t.position === "start");
      const ends = (toggles ?? []).filter((t) => t.position !== "start");
      return (
        <div
          class="row"
          id={`row-${row.index}`}
          role="treeitem"
          aria-level={String(row.depth + 1)}
          aria-posinset={String(row.posinset)}
          aria-setsize={String(row.setsize)}
          aria-expanded={row.hasChildren ? (row.expanded ? "true" : "false") : null}
          aria-selected={mode === "none" ? null : isSelected ? "true" : "false"}
          aria-disabled={item.disabled ? "true" : null}
          data-index={String(row.index)}
          data-selected={isSelected ? "" : null}
          data-active={isActive ? "" : null}
          data-muted={item.muted ? "" : null}
          data-drop={drop?.index === row.index ? drop.position : null}
          style={`transform:translateY(${row.index * rowHeight}px)`}
          ondblclick={(e: MouseEvent) => {
            if ((e.composedPath()[0] as Element).closest?.(".chevron, .toggle")) return;
            if (canRename(item) && (e.composedPath()[0] as Element).closest?.(".label")) setRenaming(item.id);
            else fire(host.current, "action", { id: item.id });
          }}
          oncontextmenu={() => {
            if (!selected.has(item.id)) select(row, { shiftKey: false, metaKey: false, ctrlKey: false });
            focusRow(row);
          }}
        >
          {starts.length > 0 && <span class="toggles start">{starts.map((t) => renderToggle(row, t))}</span>}
          <span class="indent" style={`width:calc(${row.depth} * var(--st-tree-indent, 16px))`} />
          <span
            class="chevron"
            data-open={row.expanded ? "" : null}
            onclick={(e: MouseEvent) => {
              e.stopPropagation();
              setExpanded(row, !row.expanded);
            }}
          >
            {row.hasChildren && (
              <svg viewBox="0 0 16 16" aria-hidden="true">
                <path
                  d="M6 4l4 4-4 4"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.75"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            )}
          </span>
          {item.thumbnail ? (
            <img class="thumb" src={item.thumbnail} alt="" loading="lazy" />
          ) : (
            item.icon && <st-icon class="icon" name={item.icon} />
          )}
          {renaming === item.id ? (
            <input
              class="rename"
              value={item.label}
              aria-label="Rename"
              onkeydown={(e: KeyboardEvent) => {
                e.stopPropagation();
                if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                if (e.key === "Escape") {
                  (e.target as HTMLInputElement).value = item.label;
                  (e.target as HTMLInputElement).blur();
                }
              }}
              onblur={(e: FocusEvent) => {
                const value = (e.target as HTMLInputElement).value.trim();
                setRenaming(null);
                viewport.current?.focus({ preventScroll: true });
                if (value && value !== item.label)
                  fire(host.current, "rename", { id: item.id, label: value });
              }}
            />
          ) : (
            <span class="label">{item.label}</span>
          )}
          {item.description && <span class="description">{item.description}</span>}
          {ends.length > 0 && <span class="toggles end">{ends.map((t) => renderToggle(row, t))}</span>}
        </div>
      );
    };

    useEffect(() => {
      if (!renaming) return;
      const input = viewport.current?.querySelector(".rename") as HTMLInputElement | null;
      input?.focus();
      input?.select();
    }, [renaming]);

    return (
      <host shadowDom>
        <div ref={probe} class="probe" aria-hidden="true" />
        <div
          ref={viewport}
          class="viewport"
          part="viewport"
          role="tree"
          tabindex="0"
          aria-label={label}
          aria-multiselectable={mode === "multiple" ? "true" : null}
          aria-activedescendant={
            activeRow && activeRow.index >= first && activeRow.index < last ? `row-${activeRow.index}` : null
          }
          onscroll={(e: Event) => setScrollTop((e.target as HTMLElement).scrollTop)}
          onkeydown={(e: KeyboardEvent) => {
            if (e.key === "Escape") cancelDrag();
            onkeydown(e);
          }}
          onpointerdown={onpointerdown}
          onpointermove={onpointermove}
          onpointerup={onpointerup}
          onpointercancel={cancelDrag}
        >
          <div class="spacer" style={`height:${rows.length * rowHeight}px`}>
            {rows.slice(first, last).map(renderRow)}
          </div>
          {rows.length === 0 && (
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
      items: type<TreeItem[]>(Array),
      toggles: type<TreeToggle[]>(Array),
      selection: type<string[]>(Array),
      selectionMode: { type: String, reflect: true },
      renamable: { type: Boolean, reflect: true },
      reorderable: { type: Boolean, reflect: true },
      label: { type: String, reflect: true },
    },
    styles: [
      hostReset,
      css`
        :host {
          --_row: var(--st-tree-row-height, calc(var(--st-control-height) + 4px));
          display: flex;
          flex-direction: column;
          min-height: 0;
          font-family: var(--st-font-sans);
          font-size: var(--st-text-2);
          color: var(--st-text);
        }
        .probe {
          position: absolute;
          height: var(--_row);
          visibility: hidden;
          pointer-events: none;
        }
        .viewport {
          flex: 1;
          min-height: 0;
          overflow: auto;
          outline: none;
          overscroll-behavior: contain;
          scrollbar-width: thin;
          scrollbar-color: var(--st-gray-a7) transparent;
        }
        .spacer {
          position: relative;
          min-width: 100%;
        }
        .row {
          position: absolute;
          top: 0;
          left: var(--st-tree-row-inset, 0);
          right: var(--st-tree-row-inset, 0);
          border-radius: var(--st-tree-row-radius, 0);
          display: flex;
          align-items: center;
          gap: var(--st-space-1);
          height: var(--_row);
          padding-inline: var(--st-space-2) var(--st-space-2);
          white-space: nowrap;
          cursor: default;
          user-select: none;
          --st-icon-size: 14px;
        }
        .row:hover {
          background: var(--st-bg-hover);
        }
        .row[data-selected] {
          background: var(--st-bg-selected);
          color: var(--st-text-selected);
        }
        .row[data-selected] .label {
          font-weight: var(--st-weight-medium);
        }
        .viewport:focus-visible .row[data-active] {
          box-shadow: inset 0 0 0 var(--st-focus-ring-width) var(--st-border-focus);
        }
        .viewport:focus-within .row[data-selected] {
          background: var(--st-bg-selected-strong);
          color: var(--st-text-selected);
        }
        /* Dimmed (e.g. hidden layer): muted ink keeps text readable; artwork fades. */
        .row[data-muted] .label {
          color: var(--st-text-muted);
        }
        .row[data-muted] .icon,
        .row[data-muted] .thumb {
          opacity: 0.5;
        }
        .row[aria-disabled] {
          opacity: 0.45;
        }
        .indent {
          flex: none;
        }
        .chevron {
          display: inline-grid;
          place-items: center;
          flex: none;
          width: 14px;
          height: 14px;
          color: var(--st-text-muted);
        }
        .chevron svg {
          width: 12px;
          height: 12px;
          transition: rotate var(--st-duration-fast) var(--st-ease);
        }
        .chevron[data-open] svg {
          rotate: 90deg;
        }
        .icon {
          color: var(--st-text-muted);
        }
        .thumb {
          flex: none;
          width: calc(var(--_row) - 8px);
          height: calc(var(--_row) - 8px);
          object-fit: cover;
          border-radius: var(--st-radius-1);
          box-shadow: 0 0 0 1px var(--st-border-subtle);
          background: repeating-conic-gradient(var(--st-gray-4) 0 25%, var(--st-gray-1) 0 50%) 0 0 / 8px 8px;
        }
        .label {
          flex: 1 1 auto;
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .description {
          flex: none;
          color: var(--st-text-muted);
          font-size: var(--st-text-1);
        }
        .rename {
          all: unset;
          flex: 1;
          min-width: 0;
          height: calc(var(--_row) - 6px);
          padding-inline: var(--st-space-1);
          margin-inline-start: calc(var(--st-space-1) * -1);
          border-radius: var(--st-radius-1);
          background: var(--st-bg-panel);
          color: var(--st-text-strong);
          box-shadow: 0 0 0 1px var(--st-border-focus);
          user-select: text;
        }
        .toggles {
          display: flex;
          align-items: center;
          flex: none;
        }
        .toggles.start {
          margin-inline-start: calc(var(--st-space-1) * -1);
          margin-inline-end: var(--st-space-1);
        }
        .toggle {
          all: unset;
          display: inline-grid;
          place-items: center;
          width: 22px;
          height: 22px;
          border-radius: var(--st-radius-1);
          color: var(--st-text-muted);
        }
        .toggle:not([data-on]) {
          color: var(--st-text-faint);
        }
        .toggle:hover {
          color: var(--st-text-strong);
          background: var(--st-bg-hover);
        }
        .toggle[data-show="active"]:not([data-on]),
        .toggle[data-show="inactive"][data-on] {
          visibility: hidden;
        }
        .row:hover .toggle {
          visibility: visible;
        }
        /* Drop indicators */
        .row[data-drop="before"]::before,
        .row[data-drop="after"]::after {
          content: "";
          position: absolute;
          left: 0;
          right: 0;
          height: 2px;
          background: var(--st-border-focus);
          pointer-events: none;
        }
        .row[data-drop="before"]::before {
          top: -1px;
        }
        .row[data-drop="after"]::after {
          bottom: -1px;
        }
        .row[data-drop="inside"] {
          box-shadow: inset 0 0 0 2px var(--st-border-focus);
        }
        :host([data-dragging]) .viewport {
          cursor: grabbing;
        }
        .empty {
          padding: var(--st-space-4);
        }
      `,
    ],
  },
);
