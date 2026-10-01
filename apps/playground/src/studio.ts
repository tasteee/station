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
