import "@station/tokens";
import "@station/tokens/fonts.css";
import "@station/components";
import "./playground.css";
import "./paint.css";
import "./icons.ts";
import "./nav.ts";
import { monotoneSpline } from "@station/behaviors";
import { type Command, confirm, moveItems, type TreeItem, toast, updateItem } from "@station/components";

// biome-ignore lint/suspicious/noExplicitAny: demo page reads many element props.
type El = HTMLElement & Record<string, any>;
const $ = (sel: string) => document.querySelector(sel) as El;

// ---------- Layer thumbnails (tiny inline SVGs) ----------
const thumb = (body: string, bg = "transparent") =>
  `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 40"><rect width="30" height="40" fill="${bg}"/>${body}</svg>`,
  )}`;

let layers: TreeItem[] = [
  {
    id: "title",
    label: "STATION",
    thumbnail: thumb(
      '<text x="15" y="12" font-size="7" text-anchor="middle" fill="#fff" font-family="sans-serif" font-weight="700">T</text>',
    ),
    visible: true,
  },
  {
    id: "subtitle",
    label: "Summer Sessions",
    thumbnail: thumb('<rect x="6" y="12" width="18" height="2" fill="#fff"/>'),
    visible: true,
  },
  {
    id: "scene",
    label: "Scene",
    icon: "folder",
    expanded: true,
    visible: true,
    children: [
      {
        id: "front",
        label: "Mountains front",
        thumbnail: thumb('<path d="M0 32 L8 28 L15 31 L22 28 L30 32 L30 40 L0 40Z" fill="#150d24"/>'),
        visible: true,
      },
      {
        id: "back",
        label: "Mountains back",
        thumbnail: thumb('<path d="M0 28 L6 23 L11 27 L17 22 L23 26 L30 23 L30 40 L0 40Z" fill="#2a1a3f"/>'),
        visible: true,
      },
      {
        id: "sun",
        label: "Sun",
        thumbnail: thumb('<circle cx="15" cy="21" r="7" fill="#ffd27a"/>'),
        visible: true,
        locked: true,
      },
      {
        id: "curves",
        label: "Curves 1",
        icon: "adjustments",
        description: "Adjustment",
        visible: false,
        muted: true,
      },
    ],
  },
  {
    id: "background",
    label: "Background",
    thumbnail: thumb("", "#b3386b"),
    visible: true,
    locked: true,
  },
];

const tree = $("#layers");
tree.toggles = [
  {
    key: "visible",
    label: "Toggle visibility",
    icon: "eye",
    offIcon: "eye-off",
    default: true,
    position: "start",
  },
  { key: "locked", label: "Lock layer", icon: "lock", offIcon: "lock-open", position: "end", show: "active" },
];
const render = () => {
  tree.items = layers;
};
render();
tree.selection = ["sun"];

tree.addEventListener("itemchange", (e: Event) => {
  const { id, key, value } = (e as CustomEvent).detail;
  layers = updateItem(layers, id, { [key]: value, ...(key === "visible" ? { muted: !value } : {}) });
  render();
});
tree.addEventListener("move", (e: Event) => {
  layers = moveItems(layers, (e as CustomEvent).detail);
  render();
});
tree.addEventListener("rename", (e: Event) => {
  const { id, label } = (e as CustomEvent).detail;
  layers = updateItem(layers, id, { label });
  render();
});

let counter = 1;
$("#new-layer").addEventListener("click", () => {
  layers = [
    {
      id: `layer-${counter}`,
      label: `Layer ${counter++}`,
      thumbnail: thumb("", "transparent"),
      visible: true,
    },
    ...layers,
  ];
  render();
  tree.selection = [layers[0]!.id];
});
$("#new-group").addEventListener("click", () => {
  layers = [
    { id: `group-${counter}`, label: `Group ${counter++}`, icon: "folder", children: [], visible: true },
    ...layers,
  ];
  render();
});

async function deleteSelection() {
  const ids: string[] = tree.selection ?? [];
  if (!ids.length) return;
  const ok = await confirm({
    heading: ids.length > 1 ? `Delete ${ids.length} layers?` : "Delete this layer?",
    confirmLabel: "Delete",
    tone: "danger",
  });
  if (!ok) return;
  const before = layers;
  const drop = (list: TreeItem[]): TreeItem[] =>
    list
      .filter((i) => !ids.includes(i.id))
      .map((i) => (i.children ? { ...i, children: drop(i.children) } : i));
  layers = drop(layers);
  render();
  toast(ids.length > 1 ? `Deleted ${ids.length} layers` : "Deleted layer", {
    action: {
      label: "Undo",
      onClick: () => {
        layers = before;
        render();
      },
    },
  });
}
$("#delete-layer").addEventListener("click", deleteSelection);
$("#layer-menu").addEventListener("select", (e: Event) => {
  const { value } = (e as CustomEvent).detail;
  const id = (tree.selection ?? [])[0];
  if (value === "delete") deleteSelection();
  else if (value === "rename" && id) tree.rename(id);
  else toast(`${(e.target as HTMLElement).textContent?.trim()}`);
});

// ---------- Options bar follows the tool ----------
const TOOL_OPTIONS: Record<string, string> = {
  brush: `
    <st-number-field size="small" label="Brush size" abbr="Size" value="45" min="1" max="5000" unit="px" style="width:96px"></st-number-field>
    <st-row gap="1.5"><st-text size="small" tone="muted">Hardness</st-text><st-slider size="small" label="Hardness" value="80" style="width:96px"></st-slider></st-row>
    <st-divider></st-divider>
    <st-row gap="1.5"><st-text size="small" tone="muted">Mode</st-text>
      <st-select size="small" value="normal" label="Brush mode" style="width:112px"><st-option value="normal">Normal</st-option><st-option value="multiply">Multiply</st-option><st-option value="screen">Screen</st-option><st-option value="behind">Behind</st-option></st-select></st-row>
    <st-number-field size="small" label="Opacity" abbr="Opacity" value="100" min="0" max="100" unit="%" style="width:112px"></st-number-field>
    <st-number-field size="small" label="Flow" abbr="Flow" value="60" min="0" max="100" unit="%" style="width:96px"></st-number-field>
    <st-number-field size="small" label="Smoothing" abbr="Smooth" value="10" min="0" max="100" unit="%" style="width:112px"></st-number-field>
    <st-toggle-button size="small" icon="wand" label="Pressure controls size"></st-toggle-button>`,
  move: `
    <st-checkbox size="small" checked>Auto-Select</st-checkbox>
    <st-select size="small" value="layer" label="Auto-select target" style="width:88px"><st-option value="layer">Layer</st-option><st-option value="group">Group</st-option></st-select>
    <st-checkbox size="small">Show Transform Controls</st-checkbox>
    <st-divider></st-divider>
    <st-toolbar size="small" label="Align">
      <st-icon-button icon="align-left" label="Align left edges"></st-icon-button>
      <st-icon-button icon="align-center" label="Align horizontal centers"></st-icon-button>
      <st-icon-button icon="align-right" label="Align right edges"></st-icon-button>
    </st-toolbar>`,
  gradient: `
    <st-button size="small" kind="outline" id="grad-btn" class="grad-btn"><span class="grad-chip" slot="start"></span>Edit gradient</st-button>
    <st-segmented-control size="small" value="linear" label="Gradient type">
      <st-segment value="linear">Linear</st-segment><st-segment value="radial">Radial</st-segment><st-segment value="angle">Angle</st-segment>
    </st-segmented-control>
    <st-number-field size="small" label="Opacity" abbr="Opacity" value="100" min="0" max="100" unit="%" style="width:112px"></st-number-field>
    <st-checkbox size="small" checked>Dither</st-checkbox>
    <st-checkbox size="small">Reverse</st-checkbox>`,
  shape: `
    <st-select size="small" value="shape" label="Tool mode" style="width:88px"><st-option value="shape">Shape</st-option><st-option value="path">Path</st-option><st-option value="pixels">Pixels</st-option></st-select>
    <st-row gap="1.5"><st-text size="small" tone="muted">Fill</st-text><st-color-field size="small" label="Fill" value="#ffd27a" style="width:112px"></st-color-field></st-row>
    <st-row gap="1.5"><st-text size="small" tone="muted">Stroke</st-text><st-color-field size="small" label="Stroke" value="#150d24" style="width:112px"></st-color-field></st-row>
    <st-number-field size="small" label="Stroke width" value="1" min="0" unit="px" style="width:72px"></st-number-field>
    <st-divider></st-divider>
    <st-vector-field size="small" label="Size" axes="w h" value="200 120" unit="px" min="0" linkable style="width:200px"></st-vector-field>`,
  type: `
    <st-combobox size="small" label="Font family" value="dm-sans" allow-custom style="width:140px">
      <st-option value="dm-sans">DM Sans</st-option><st-option value="dm-mono">DM Mono</st-option><st-option value="inter">Inter</st-option><st-option value="garamond">EB Garamond</st-option>
    </st-combobox>
    <st-select size="small" value="bold" label="Font style" style="width:96px"><st-option value="regular">Regular</st-option><st-option value="medium">Medium</st-option><st-option value="bold">Bold</st-option></st-select>
    <st-number-field size="small" label="Font size" value="64" min="1" unit="pt" style="width:72px"></st-number-field>
    <st-segmented-control size="small" value="center" label="Paragraph alignment">
      <st-segment value="left" icon="align-left" label="Left align"></st-segment>
      <st-segment value="center" icon="align-center" label="Center"></st-segment>
      <st-segment value="right" icon="align-right" label="Right align"></st-segment>
    </st-segmented-control>
    <st-color-field size="small" label="Text color" value="#ffffff" style="width:112px"></st-color-field>`,
  crop: `
    <st-select size="small" value="ratio" label="Crop preset" style="width:120px"><st-option value="ratio">Ratio</st-option><st-option value="wxh">W × H × Resolution</st-option><st-option value="original">Original Ratio</st-option><st-divider></st-divider><st-option value="1:1">1 : 1 (Square)</st-option><st-option value="4:5">4 : 5 (8 : 10)</st-option><st-option value="16:9">16 : 9</st-option></st-select>
    <st-number-field size="small" label="Ratio width" value="4" style="width:56px"></st-number-field>
    <st-icon-button size="small" icon="arrows-exchange" label="Swap"></st-icon-button>
    <st-number-field size="small" label="Ratio height" value="5" style="width:56px"></st-number-field>
    <st-divider></st-divider>
    <st-checkbox size="small" checked>Delete Cropped Pixels</st-checkbox>
    <st-checkbox size="small">Content-Aware</st-checkbox>`,
};
const CATEGORY: Record<string, string> = {
  brush: "brush",
  pencil: "brush",
  eraser: "brush",
  heal: "brush",
  clone: "brush",
  blur: "brush",
  dodge: "brush",
  move: "move",
  rect: "shape",
  ellipse: "shape",
  polygon: "shape",
  line: "shape",
  pen: "shape",
  type: "type",
  crop: "crop",
};

const toolbox = $("#tools");
const options = $("#options");
function renderOptions() {
  const value: string = toolbox.value;
  const tool = document.querySelector<El>(`st-tool[value="${value}"]`);
  options.innerHTML = `
    <st-row gap="1.5" class="tool-name"><st-icon name="${tool?.icon ?? "brush"}"></st-icon><st-text size="small" weight="medium" tone="strong">${tool?.label ?? value}</st-text></st-row>
    <st-divider></st-divider>
    ${TOOL_OPTIONS[CATEGORY[value] ?? ""] ?? `<st-text size="small" tone="muted">No options for this tool.</st-text>`}`;
}
toolbox.addEventListener("change", renderOptions);
renderOptions();

// ---------- Gradient tool ----------
const gradient = $("#gradient");
gradient.stops = [
  { offset: 0, color: "#1b1446" },
  { offset: 0.55, color: "#b3386b" },
  { offset: 1, color: "#f6a55a" },
];
const paintGradientChip = () => {
  for (const chip of document.querySelectorAll<HTMLElement>(".grad-chip"))
    chip.style.background = gradient.toCSS(90);
};
gradient.addEventListener("input", paintGradientChip);
options.addEventListener("click", (e: Event) => {
  const btn = (e.target as Element).closest("#grad-btn");
  if (btn) $("#gradient-popover").show(btn);
});
toolbox.addEventListener("change", () => requestAnimationFrame(paintGradientChip));

// ---------- Rulers + cursor ----------
const canvas = $("#canvas");
const doc = $("#document");
const rulerX = $("#ruler-x");
const rulerY = $("#ruler-y");
let zoom = 0.667;
function layoutRulers() {
  doc.style.width = `${600 * zoom}px`;
  doc.style.height = `${800 * zoom}px`;
  const c = canvas.getBoundingClientRect();
  const d = doc.getBoundingClientRect();
  rulerX.zoom = zoom;
  rulerY.zoom = zoom;
  rulerX.offset = (c.left - d.left) / zoom;
  rulerY.offset = (c.top - d.top) / zoom;
}
new ResizeObserver(layoutRulers).observe(canvas);
canvas.addEventListener("scroll", layoutRulers);
const zoomControl = $("#zoom");
zoomControl.addEventListener("change", () => {
  zoom = zoomControl.value / 100;
  layoutRulers();
});
zoomControl.addEventListener("fit", () => {
  const c = canvas.getBoundingClientRect();
  zoom = Math.min((c.width - 96) / 600, (c.height - 96) / 800);
  zoomControl.value = Math.round(zoom * 10000) / 100;
  layoutRulers();
});
canvas.addEventListener("pointermove", (e: PointerEvent) => {
  const x = rulerX.valueAt(e.clientX);
  const y = rulerY.valueAt(e.clientY);
  rulerX.marker = x;
  rulerY.marker = y;
  $("#cursor-pos").textContent = `X ${Math.round(x)}  Y ${Math.round(y)}`;
});
canvas.addEventListener("pointerleave", () => {
  rulerX.marker = null;
  rulerY.marker = null;
  $("#cursor-pos").textContent = "";
});
$("#toggle-rulers").addEventListener("select", (e: Event) => {
  $("#rulers").toggleAttribute("data-no-rulers", !(e as CustomEvent).detail.checked);
  requestAnimationFrame(layoutRulers);
});

// ---------- Foreground / background colors ----------
let fg = "#ffd27a";
let bg = "#150d24";
const paintChips = () => {
  $("#fg").style.background = fg;
  $("#bg").style.background = bg;
};
paintChips();
const picker = $("#picker");
const fgPicker = $("#fg-picker");
const setFg = (value: string) => {
  fg = value;
  picker.value = value;
  fgPicker.value = value;
  paintChips();
};
picker.addEventListener("input", () => setFg(picker.value));
fgPicker.addEventListener("input", () => setFg(fgPicker.value));
$("#fg").addEventListener("click", () => $("#fg-popover").show($("#fg")));
const swap = () => {
  [fg, bg] = [bg, fg];
  setFg(fg);
};
$("#swap").addEventListener("click", swap);
document.addEventListener("keydown", (e) => {
  const typing = e.composedPath().some((n) => ["input", "textarea"].includes((n as Element).localName));
  if (!typing && !e.metaKey && !e.ctrlKey && e.key.toLowerCase() === "x") swap();
});

const swatches = $("#swatches");
const hues = [0, 25, 45, 60, 120, 170, 200, 230, 270, 320];
swatches.innerHTML = [
  ...["#000000", "#404040", "#808080", "#bfbfbf", "#ffffff"],
  ...hues.flatMap((h) => [`hsl(${h} 90% 35%)`, `hsl(${h} 90% 55%)`, `hsl(${h} 90% 75%)`]),
]
  .map((c) => `<st-color-swatch color="${c}"></st-color-swatch>`)
  .join("");
// Swatches take hex; convert hsl() through the browser.
for (const s of swatches.querySelectorAll<El>("st-color-swatch")) {
  const probe = document.createElement("span");
  probe.style.color = s.color;
  document.body.append(probe);
  const [r, g, b] = getComputedStyle(probe).color.match(/\d+/g)!.map(Number);
  probe.remove();
  s.color = `#${[r, g, b].map((n) => n!.toString(16).padStart(2, "0")).join("")}`;
}
swatches.addEventListener("change", () => setFg(swatches.value));

// ---------- Command palette: every menu command + every tool ----------
const commands: Command[] = [];
for (const menu of document.querySelectorAll<El>("st-menubar > st-menu")) {
  const walk = (m: Element, path: string) => {
    for (const item of m.querySelectorAll<El>(":scope > st-menu-item")) {
      const text = [...item.childNodes]
        .filter((n) => n.nodeType === 3)
        .map((n) => n.textContent)
        .join("")
        .trim();
      const sub = item.querySelector(":scope > st-menu");
      if (sub) walk(sub, `${path} › ${text}`);
      else commands.push({ id: `menu:${path}:${text}`, label: text, group: path, shortcut: item.shortcut });
    }
  };
  walk(menu, menu.label);
}
for (const tool of document.querySelectorAll<El>("st-tool")) {
  commands.push({
    id: `tool:${tool.value}`,
    label: `${tool.label} Tool`,
    group: "Tools",
    icon: tool.icon,
    shortcut: tool.shortcut,
  });
}
const palette = $("#palette");
palette.commands = commands;
palette.addEventListener("select", (e: Event) => {
  const { id } = (e as CustomEvent).detail as { id: string };
  if (id.startsWith("tool:")) toolbox.value = id.slice(5);
  else toast(commands.find((c) => c.id === id)?.label ?? id);
});
$("#open-palette").addEventListener("click", () => (palette.open = true));

// ---------- Curves: live on the artwork, histogram follows ----------
type Pt = { x: number; y: number };
const curves = $("#curves");
const identity = (): Pt[] => [
  { x: 0, y: 0 },
  { x: 1, y: 1 },
];
const curveSets: Record<string, Pt[]> = {
  rgb: identity(),
  red: identity(),
  green: identity(),
  blue: identity(),
};
let channel = "rgb";
const evalWith = (pts: Pt[], x: number) =>
  Math.min(1, Math.max(0, monotoneSpline([...pts].sort((a, b) => a.x - b.x))(x)));
function applyCurves() {
  const table = (ch: string) =>
    Array.from({ length: 33 }, (_, i) =>
      evalWith(curveSets[ch]!, evalWith(curveSets.rgb!, i / 32)).toFixed(4),
    ).join(" ");
  $("#func-r").setAttribute("tableValues", table("red"));
  $("#func-g").setAttribute("tableValues", table("green"));
  $("#func-b").setAttribute("tableValues", table("blue"));
  updateHistogram();
}
curves.color = "";
curves.addEventListener("input", () => {
  curveSets[channel] = curves.points;
  applyCurves();
});
$("#curve-channel").addEventListener("change", (e: Event) => {
  channel = (e.target as El).value;
  curves.points = curveSets[channel];
  curves.color = { red: "#ef4444", green: "#22c55e", blue: "#3b82f6" }[channel] ?? "";
});
$("#curve-reset").addEventListener("click", () => {
  for (const k of Object.keys(curveSets)) curveSets[k] = identity();
  curves.points = curveSets[channel];
  applyCurves();
});

// Histogram from the artwork's real pixels, remapped through the curves.
let base: { red: number[]; green: number[]; blue: number[]; lum: number[] } | null = null;
async function measure() {
  const svg = doc.querySelector("svg")!.cloneNode(true) as SVGSVGElement;
  svg.querySelector("#art")?.removeAttribute("filter");
  svg.setAttribute("width", "150");
  svg.setAttribute("height", "200");
  const url = URL.createObjectURL(
    new Blob([new XMLSerializer().serializeToString(svg)], { type: "image/svg+xml" }),
  );
  const img = new Image();
  img.src = url;
  await img.decode();
  const cv = Object.assign(document.createElement("canvas"), { width: 150, height: 200 });
  const ctx = cv.getContext("2d")!;
  ctx.drawImage(img, 0, 0);
  URL.revokeObjectURL(url);
  const data = ctx.getImageData(0, 0, 150, 200).data;
  base = {
    red: new Array(256).fill(0),
    green: new Array(256).fill(0),
    blue: new Array(256).fill(0),
    lum: new Array(256).fill(0),
  };
  const inc = (bins: number[], v: number) => {
    bins[v] = (bins[v] ?? 0) + 1;
  };
  for (let i = 0; i < data.length; i += 4) {
    const [r, g, b] = [data[i]!, data[i + 1]!, data[i + 2]!];
    inc(base.red, r);
    inc(base.green, g);
    inc(base.blue, b);
    inc(base.lum, Math.round(0.2126 * r + 0.7152 * g + 0.0722 * b));
  }
  updateHistogram();
}
const histogram = $("#histogram");
let histMode = "colors";
function updateHistogram() {
  if (!base) return;
  const current = curves.points;
  const remap = (bins: number[], ch: string) => {
    const out = new Array(256).fill(0);
    bins.forEach((n, i) => {
      out[Math.round(evalWith(curveSets[ch]!, evalWith(curveSets.rgb!, i / 255)) * 255)] += n;
    });
    return out;
  };
  if (histMode === "colors") {
    histogram.bins = null;
    histogram.channels = {
      red: remap(base.red, "red"),
      green: remap(base.green, "green"),
      blue: remap(base.blue, "blue"),
    };
  } else {
    histogram.channels = null;
    histogram.bins = remap(base.lum, "rgb");
  }
  curves.points = current;
  curves.histogram = histMode === "colors" ? remap(base.lum, "rgb") : histogram.bins;
}
$("#hist-mode").addEventListener("change", (e: Event) => {
  histMode = (e.target as El).value;
  updateHistogram();
});
measure();

// ---------- Dock: roomier default layout until the user saves their own ----------
customElements.whenDefined("st-dock").then(async () => {
  if (localStorage.getItem("st-dock:paint-dock-v2")) return;
  const dock = $("#dock");
  await dock.updated;
  dock.layout = {
    ...dock.layout,
    groups: dock.layout.groups.map((g: { panels: string[] }) => ({
      ...g,
      size: g.panels.includes("adjust") ? 1.25 : 1,
    })),
  };
});
