import "@station/tokens";
import "@station/tokens/fonts.css";
import "@station/components";
import "./studio.css";
import "./icons.ts";
import "./nav.ts";
import type { TreeItem } from "@station/components";

// biome-ignore lint/suspicious/noExplicitAny: demo page reads element props.
type El = HTMLElement & Record<string, any>;
const $ = (sel: string) => document.querySelector(sel) as El;

const studio = $("#studio");
const theme = $("#theme");
const prefersDark = matchMedia("(prefers-color-scheme: dark)").matches;
studio.setAttribute("theme", prefersDark ? "dark" : "light");
theme.value = prefersDark ? "dark" : "light";
theme.addEventListener("change", () => studio.setAttribute("theme", theme.value));

const layers = $("#layers");
layers.toggles = [
  {
    key: "visible",
    label: "Visibility",
    icon: "eye",
    offIcon: "eye-off",
    default: true,
    position: "end",
    show: "inactive",
  },
  { key: "locked", label: "Lock", icon: "lock", position: "end", show: "active" },
];
const items: TreeItem[] = [
  {
    id: "landing",
    label: "Landing",
    icon: "frame",
    expanded: true,
    children: [
      {
        id: "hero",
        label: "Hero",
        icon: "layout-grid",
        expanded: true,
        children: [
          { id: "kicker", label: "Kicker", icon: "letter-t" },
          { id: "headline", label: "Headline", icon: "letter-t" },
          { id: "cta", label: "Get tickets", icon: "square" },
          { id: "art", label: "Sunset art", icon: "photo" },
        ],
      },
      {
        id: "tiles",
        label: "Stat tiles",
        icon: "layout-grid",
        expanded: true,
        children: [
          { id: "tickets", label: "Tickets tile", icon: "square" },
          { id: "artists", label: "Artists tile", icon: "square" },
          { id: "nights", label: "Nights tile", icon: "square", visible: false, muted: true },
        ],
      },
    ],
  },
  { id: "bg", label: "Background", icon: "square", locked: true },
];
layers.items = items;
layers.selection = ["tickets"];
layers.addEventListener("itemchange", (e: Event) => {
  const { id, key, value } = (e as CustomEvent).detail;
  const walk = (list: TreeItem[]): TreeItem[] =>
    list.map((i) =>
      i.id === id ? { ...i, [key]: value } : i.children ? { ...i, children: walk(i.children) } : i,
    );
  layers.items = walk(layers.items);
});

for (const pill of document.querySelectorAll<HTMLElement>(".page-pill")) {
  pill.addEventListener("click", () => {
    for (const p of document.querySelectorAll(".page-pill")) p.removeAttribute("aria-current");
    pill.setAttribute("aria-current", "page");
  });
}

// One active tool at a time.
const tools = [...document.querySelectorAll<El>(".dock st-toggle-button")];
for (const tool of tools) {
  tool.addEventListener("change", () => {
    for (const t of tools) t.pressed = t === tool;
  });
}

// ---------- Canvas: data-driven layers on st-viewport ----------
// The app owns the data; st-viewport, st-transform-box and the inspector
// report changes and the app writes them back here.
type Layer = {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
};
const ARTBOARD = { x: 0, y: 0 }; // the artboard's document position
const doc: Layer[] = [
  { id: "hero", name: "Hero", x: 18, y: 18, width: 604, height: 190, rotation: 0 },
  { id: "tickets", name: "Tickets tile", x: 18, y: 226, width: 194, height: 120, rotation: 0 },
  { id: "artists", name: "Artists tile", x: 223, y: 226, width: 194, height: 120, rotation: 0 },
  { id: "nights", name: "Nights tile", x: 428, y: 226, width: 194, height: 120, rotation: 0 },
];
const canvas = $("#canvas");
const box = $("#selection");
const spacing = $("#spacing");
let selected: string[] = ["tickets"];

const layerEl = (id: string) => document.querySelector<HTMLElement>(`.layer[data-id="${id}"]`);
const byId = (id: string) => doc.find((l) => l.id === id);
const bounds = (ls: Layer[]) => {
  const x = Math.min(...ls.map((l) => l.x));
  const y = Math.min(...ls.map((l) => l.y));
  return {
    x,
    y,
    width: Math.max(...ls.map((l) => l.x + l.width)) - x,
    height: Math.max(...ls.map((l) => l.y + l.height)) - y,
  };
};

function render() {
  for (const l of doc) {
    const el = layerEl(l.id);
    if (!el) continue;
    Object.assign(el.style, {
      left: `${l.x}px`,
      top: `${l.y}px`,
      width: `${l.width}px`,
      height: `${l.height}px`,
      rotate: l.rotation ? `${l.rotation}deg` : "",
    });
  }
  // Snapping, marquee, fit and the minimap read objects in document coordinates.
  canvas.objects = doc.map((l) => ({
    id: l.id,
    x: l.x + ARTBOARD.x,
    y: l.y + ARTBOARD.y,
    width: l.width,
    height: l.height,
  }));
  const sel = selected.map(byId).filter(Boolean) as Layer[];
  box.hidden = !sel.length;
  if (sel.length) {
    const single = sel.length === 1 ? sel[0] : null;
    const b = bounds(sel);
    Object.assign(box, {
      x: b.x + ARTBOARD.x,
      y: b.y + ARTBOARD.y,
      width: b.width,
      height: b.height,
      rotation: single?.rotation ?? 0,
      rotatable: !!single,
      targets: selected.join(" "),
      label: single ? single.name : `${sel.length} layers`,
    });
    $("#sel-name").textContent = single ? single.name : `${sel.length} layers`;
    $("#ro-w").textContent = String(Math.round(b.width));
    $("#ro-h").textContent = String(Math.round(b.height));
    $("#ro-r").textContent = `${Math.round(single?.rotation ?? 0)}°`;
    for (const f of document.querySelectorAll<El>(".geo")) {
      f.value = Math.round((b as Record<string, number>)[f.dataset.key!]!);
    }
  }
}

function select(ids: string[], add = false) {
  const valid = ids.filter((id) => byId(id));
  selected = add ? [...new Set([...selected, ...valid])] : valid;
  layers.selection = selected;
  render();
}

// The box reports a new rect; map every selected layer from the old bounds to the new.
function applyBox(e: Event) {
  const d = (e as CustomEvent).detail;
  const sel = selected.map(byId).filter(Boolean) as Layer[];
  if (!sel.length) return;
  const from = bounds(sel);
  const sx = d.width / (from.width || 1);
  const sy = d.height / (from.height || 1);
  for (const l of sel) {
    l.x = d.x - ARTBOARD.x + (l.x - from.x) * sx;
    l.y = d.y - ARTBOARD.y + (l.y - from.y) * sy;
    l.width *= sx;
    l.height *= sy;
    if (sel.length === 1) l.rotation = d.rotation;
  }
  render();
}
box.addEventListener("transform", applyBox);
box.addEventListener("change", applyBox);

// Click a layer to select it (Shift adds); marquee and empty clicks come from the viewport.
for (const l of doc) {
  layerEl(l.id)?.addEventListener("pointerdown", (e: PointerEvent) => {
    if (e.button !== 0 || canvas.tool === "hand" || canvas.hasAttribute("data-space")) return;
    e.stopPropagation();
    select([l.id], e.shiftKey);
  });
}
canvas.addEventListener("select", (e: Event) => {
  const { ids, add } = (e as CustomEvent).detail;
  if (e.target === canvas) select(ids, add);
  else if ((e.target as Element).localName === "st-artboard") select([], false);
});
canvas.addEventListener("marquee", (e: Event) => {
  layers.selection = (e as CustomEvent).detail.ids;
});
layers.addEventListener("change", (e: Event) => select((e as CustomEvent).detail.selection));

// Inspector geometry fields edit the selection.
for (const f of document.querySelectorAll<El>(".geo")) {
  f.addEventListener("change", () => {
    const sel = selected.map(byId).filter(Boolean) as Layer[];
    if (sel.length !== 1) return;
    (sel[0] as unknown as Record<string, number>)[f.dataset.key!] = Number(f.value);
    render();
  });
}

// Hold Alt over another layer to measure the gap (Figma-style red lines).
let hoverId: string | null = null;
const measure = (alt: boolean) => {
  const a = selected.length === 1 ? byId(selected[0]!) : null;
  const b = hoverId && hoverId !== a?.id ? byId(hoverId) : null;
  spacing.hidden = !(alt && a && b);
  if (!alt || !a || !b) return;
  const ay = a.y + a.height / 2;
  const ax = a.x + a.width / 2;
  if (b.x >= a.x + a.width || b.x + b.width <= a.x) {
    const [x1, x2] = b.x >= a.x + a.width ? [a.x + a.width, b.x] : [b.x + b.width, a.x];
    Object.assign(spacing, { x1, x2, y1: ay, y2: ay });
  } else {
    const [y1, y2] = b.y >= a.y + a.height ? [a.y + a.height, b.y] : [b.y + b.height, a.y];
    Object.assign(spacing, { x1: ax, x2: ax, y1, y2 });
  }
};
for (const l of doc) {
  const el = layerEl(l.id);
  el?.addEventListener("pointerenter", (e: PointerEvent) => {
    hoverId = l.id;
    measure(e.altKey);
  });
  el?.addEventListener("pointerleave", () => {
    hoverId = null;
    measure(false);
  });
}
addEventListener("keydown", (e) => e.key === "Alt" && measure(true));
addEventListener("keyup", (e) => e.key === "Alt" && measure(false));

// The dock's Hand tool pans; Move selects.
for (const tool of tools) {
  tool.addEventListener("change", () => {
    canvas.tool = tool.label === "Hand" && tool.pressed ? "hand" : null;
  });
}

canvas.updated.then(() => {
  render();
  requestAnimationFrame(() => canvas.fit(undefined, 64));
});
