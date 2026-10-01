import "@station/tokens";
import "@station/tokens/fonts.css";
import "@station/components";
import "./playground.css";
import "./assets.css";
import "./icons.ts";
import "./nav.ts";
import { type TableRow, type TreeItem, toast, updateRow } from "@station/components";

// biome-ignore lint/suspicious/noExplicitAny: demo page reads many element props.
type El = HTMLElement & Record<string, any>;
const $ = (sel: string) => document.querySelector(sel) as El;

// ---------- Fake project data ----------
const FOLDERS: TreeItem[] = [
  {
    id: "projects",
    label: "Projects",
    icon: "folder",
    expanded: true,
    children: [
      {
        id: "summer",
        label: "Summer Sessions",
        icon: "folder",
        expanded: true,
        children: [
          { id: "images", label: "Images", icon: "folder", children: [] },
          { id: "audio", label: "Audio", icon: "folder", children: [] },
          { id: "video", label: "Video", icon: "folder", children: [] },
          { id: "docs", label: "Documents", icon: "folder", children: [] },
        ],
      },
      { id: "archive", label: "Archive", icon: "folder", children: [] },
    ],
  },
];
const KINDS: Record<string, { ext: string[]; kind: string; hue: number; dims?: boolean }> = {
  images: { ext: ["png", "jpg", "psd", "svg"], kind: "Image", hue: 200, dims: true },
  audio: { ext: ["wav", "mp3", "aif"], kind: "Audio", hue: 280 },
  video: { ext: ["mov", "mp4"], kind: "Video", hue: 20, dims: true },
  docs: { ext: ["pdf", "md", "txt"], kind: "Document", hue: 140 },
  archive: { ext: ["zip"], kind: "Archive", hue: 60 },
};
const WORDS = [
  "hero",
  "poster",
  "cover",
  "loop",
  "stem",
  "intro",
  "outro",
  "draft",
  "final",
  "promo",
  "teaser",
  "logo",
  "banner",
  "mix",
  "take",
];
let seed = 7;
const rand = () => {
  seed = (seed * 16807) % 2147483647;
  return seed / 2147483647;
};

let files: (TableRow & { folder: string })[] = [];
for (const [folder, k] of Object.entries(KINDS)) {
  const n = folder === "images" ? 240 : 40;
  for (let i = 0; i < n; i++) {
    const ext = k.ext[Math.floor(rand() * k.ext.length)]!;
    const w = [640, 1080, 1920, 2048, 3840][Math.floor(rand() * 5)]!;
    files.push({
      id: `${folder}-${i}`,
      folder,
      name: `${WORDS[Math.floor(rand() * WORDS.length)]}-${String(i + 1).padStart(3, "0")}.${ext}`,
      kind: k.kind,
      size: Math.round(rand() * 48000 + 4),
      modified: new Date(
        2026,
        8,
        Math.floor(rand() * 30) + 1,
        Math.floor(rand() * 24),
        Math.floor(rand() * 60),
      ).getTime(),
      width: k.dims ? w : null,
      height: k.dims ? Math.round((w * 9) / 16) : null,
      hue: k.hue + Math.floor(rand() * 40),
    });
  }
}

const formatSize = (kb: unknown) => {
  const n = Number(kb);
  return n >= 1024 ? `${(n / 1024).toFixed(1)} MB` : `${n} KB`;
};
const formatDate = (t: unknown) =>
  new Date(Number(t)).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

// ---------- Folders + breadcrumbs ----------
const folders = $("#folders");
folders.items = FOLDERS;
let current = "images";
folders.selection = [current];
const pathTo = (id: string, list: TreeItem[] = FOLDERS, path: TreeItem[] = []): TreeItem[] | null => {
  for (const item of list) {
    if (item.id === id) return [...path, item];
    const hit = item.children && pathTo(id, item.children, [...path, item]);
    if (hit) return hit;
  }
  return null;
};
function openFolder(id: string) {
  current = id;
  folders.selection = [id];
  $("#crumbs").innerHTML = (pathTo(id) ?? [])
    .map((f, i) => `<st-crumb value="${f.id}" ${i === 0 ? 'icon="home"' : ""}>${f.label}</st-crumb>`)
    .join("");
  renderFiles();
}
folders.addEventListener("change", () => openFolder(folders.selection[0]));
$("#crumbs").addEventListener("select", (e: Event) => openFolder((e as CustomEvent).detail.value));
$("#back").addEventListener("click", () => {
  const path = pathTo(current);
  if (path && path.length > 1) openFolder(path[path.length - 2]!.id);
});

// ---------- Files table ----------
const table = $("#files");
table.columns = [
  { key: "name", label: "Name", width: 260, sortable: true, editable: true },
  { key: "kind", label: "Kind", width: 100, sortable: true },
  { key: "size", label: "Size", width: 96, type: "number", sortable: true, format: formatSize },
  { key: "modified", label: "Modified", width: 150, sortable: true, format: formatDate },
];
table.sort = { key: "modified", direction: "descending" };
let query = "";
function renderFiles() {
  const q = query.toLowerCase();
  const inFolder = (f: (typeof files)[number]) =>
    current === "projects" || current === "summer" ? true : f.folder === current;
  table.rows = files.filter((f) => inFolder(f) && (!q || String(f.name).toLowerCase().includes(q)));
  $("#count").textContent =
    `${table.rows.length} items${table.selection?.length ? ` · ${table.selection.length} selected` : ""}`;
}
$("#search").addEventListener("input", (e: Event) => {
  query = String((e.currentTarget as El).value ?? "");
  renderFiles();
});
table.addEventListener("cellchange", (e: Event) => {
  const { id, key, value } = (e as CustomEvent).detail;
  files = updateRow(files, id, { [key]: value }) as typeof files;
  renderFiles();
  showDetails();
  toast(`Renamed to ${value}`);
});
table.addEventListener("change", () => {
  renderFiles();
  showDetails();
});
table.addEventListener("action", (e: Event) =>
  toast(`Open ${files.find((f) => f.id === (e as CustomEvent).detail.id)?.name}`),
);

// ---------- Details ----------
function showDetails() {
  const ids: string[] = table.selection ?? [];
  const file = files.find((f) => f.id === ids[ids.length - 1]);
  $("#details").toggleAttribute("data-empty", !file);
  if (!file) return;
  $("#preview").style.background =
    `linear-gradient(135deg, hsl(${file.hue} 70% 55%), hsl(${Number(file.hue) + 60} 70% 35%))`;
  $("#name").value = file.name;
  $("#kind").textContent = `${file.kind} (.${String(file.name).split(".").pop()})`;
  $("#size").textContent = formatSize(file.size);
  $("#modified").textContent = formatDate(file.modified);
  const dims = $("#dims");
  dims.hidden = !file.width;
  dims.value = file.width ? `${file.width} ${file.height}` : "";
}
$("#name").addEventListener("change", (e: Event) => {
  const id = (table.selection ?? []).at(-1);
  if (!id) return;
  files = updateRow(files, id, { name: (e as CustomEvent).detail.value }) as typeof files;
  renderFiles();
});

openFolder(current);
const newest = [...table.rows].sort((a, b) => Number(b.modified) - Number(a.modified))[0];
table.selection = newest ? [newest.id] : [];
showDetails();
renderFiles();
