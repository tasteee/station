import type { MoveDetail, TreeItem, TreeToggle } from "../data-types.ts";

export type { MoveDetail, TreeItem, TreeToggle };

export interface FlatRow {
  item: TreeItem;
  depth: number;
  parentId: string | null;
  index: number;
  hasChildren: boolean;
  expanded: boolean;
  /** Position among siblings, for aria-posinset/setsize. */
  posinset: number;
  setsize: number;
}

/** Visible rows in display order. */
export function flatten(items: TreeItem[], expanded: Set<string>): FlatRow[] {
  const rows: FlatRow[] = [];
  const walk = (list: TreeItem[], depth: number, parentId: string | null) => {
    list.forEach((item, i) => {
      const hasChildren = Array.isArray(item.children);
      const isOpen = hasChildren && expanded.has(item.id);
      rows.push({
        item,
        depth,
        parentId,
        index: rows.length,
        hasChildren,
        expanded: isOpen,
        posinset: i + 1,
        setsize: list.length,
      });
      if (isOpen) walk(item.children!, depth + 1, item.id);
    });
  };
  walk(items, 0, null);
  return rows;
}

export function findPath(items: TreeItem[], id: string, path: TreeItem[] = []): TreeItem[] | null {
  for (const item of items) {
    if (item.id === id) return [...path, item];
    if (item.children) {
      const found = findPath(item.children, id, [...path, item]);
      if (found) return found;
    }
  }
  return null;
}

export function initialExpanded(items: TreeItem[], into = new Set<string>()) {
  for (const item of items) {
    if (item.expanded) into.add(item.id);
    if (item.children) initialExpanded(item.children, into);
  }
  return into;
}

/**
 * Apply a `move` event to your data. Pure: returns a new array.
 *   tree.addEventListener("move", (e) => (tree.items = moveItems(tree.items, e.detail)));
 */
export function moveItems(items: TreeItem[], { ids, target, position }: MoveDetail): TreeItem[] {
  const moving: TreeItem[] = [];
  const idSet = new Set(ids);
  const remove = (list: TreeItem[]): TreeItem[] =>
    list.flatMap((item) => {
      if (idSet.has(item.id)) {
        moving.push(item);
        return [];
      }
      return item.children ? [{ ...item, children: remove(item.children) }] : [item];
    });
  const pruned = remove(items);
  // Keep the moved items in their original display order.
  const order = new Map(flatten(items, new Set(allIds(items))).map((r, i) => [r.item.id, i]));
  moving.sort((a, b) => order.get(a.id)! - order.get(b.id)!);

  const insert = (list: TreeItem[]): TreeItem[] =>
    list.flatMap((item) => {
      if (item.id === target) {
        if (position === "inside") return [{ ...item, children: [...moving, ...(item.children ?? [])] }];
        return position === "before" ? [...moving, item] : [item, ...moving];
      }
      return item.children ? [{ ...item, children: insert(item.children) }] : [item];
    });
  return insert(pruned);
}

function allIds(items: TreeItem[]): string[] {
  return items.flatMap((i) => [i.id, ...(i.children ? allIds(i.children) : [])]);
}

/** Change one field on one item. Pure. */
export function updateItem(items: TreeItem[], id: string, patch: Partial<TreeItem>): TreeItem[] {
  return items.map((item) => {
    if (item.id === id) return { ...item, ...patch };
    return item.children ? { ...item, children: updateItem(item.children, id, patch) } : item;
  });
}
