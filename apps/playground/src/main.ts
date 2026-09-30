import "@station/tokens";
import "@station/tokens/fonts.css";
import "@station/components";
import "./playground.css";
import { registerIcons } from "@station/icons";
import {
  IconChevronRight,
  IconComponents,
  IconEye,
  IconEyeOff,
  IconFolder,
  IconFrame,
  IconLetterT,
  IconLock,
  IconMessage,
  IconMoon,
  IconPhoto,
  IconPlus,
  IconPointer,
  IconSquare,
  IconStack2,
  IconSun,
  IconTrash,
  IconTypography,
  IconVectorBezier2,
} from "@station/icons/tabler";

// Only these icons end up in the bundle.
registerIcons({
  "chevron-right": IconChevronRight,
  components: IconComponents,
  eye: IconEye,
  "eye-off": IconEyeOff,
  folder: IconFolder,
  frame: IconFrame,
  "letter-t": IconLetterT,
  lock: IconLock,
  message: IconMessage,
  moon: IconMoon,
  photo: IconPhoto,
  plus: IconPlus,
  pointer: IconPointer,
  square: IconSquare,
  stack: IconStack2,
  sun: IconSun,
  trash: IconTrash,
  typography: IconTypography,
  "vector-bezier-2": IconVectorBezier2,
});

const $ = <T extends Element = HTMLElement>(sel: string) => document.querySelector<T>(sel)!;
const html = document.documentElement;

// ---------- Layers ----------
const LAYERS: [depth: number, icon: string, name: string, flags?: string][] = [
  [0, "frame", "Inspector panel"],
  [1, "folder", "Header"],
  [2, "letter-t", "Title"],
  [2, "components", "Close button", "lock"],
  [1, "folder", "Properties"],
  [2, "square", "Position row"],
  [2, "square", "Size row"],
  [2, "square", "Fill row", "hidden"],
  [1, "photo", "Preview thumbnail"],
  [0, "frame", "Layers panel"],
  [1, "letter-t", "Panel title"],
  [1, "components", "Footer actions"],
];

$("#layers").innerHTML = LAYERS.map(
  ([depth, icon, name, flags], i) => `
  <st-row class="layer" gap="1.5" padding-x="3" style="--depth:${depth}" ${i === 3 ? 'aria-selected="true"' : ""} ${flags === "hidden" ? "data-hidden" : ""}>
    <st-icon class="caret" name="chevron-right" ${icon === "frame" || icon === "folder" ? "" : 'style="visibility:hidden"'}></st-icon>
    <st-icon class="kind" name="${icon}"></st-icon>
    <st-text truncate grow>${name}</st-text>
    ${flags === "lock" ? '<st-icon class="flag" name="lock" label="Locked"></st-icon>' : ""}
    <st-icon class="flag vis" name="${flags === "hidden" ? "eye-off" : "eye"}"></st-icon>
  </st-row>`,
).join("");
$("#layer-count").textContent = `${LAYERS.length} layers`;

$("#layers").addEventListener("click", (e) => {
  const row = (e.target as Element).closest(".layer");
  if (!row) return;
  for (const r of document.querySelectorAll(".layer")) r.removeAttribute("aria-selected");
  row.setAttribute("aria-selected", "true");
});

// ---------- Swatches ----------
for (const el of document.querySelectorAll<HTMLElement>(".swatches")) {
  const scale = el.dataset.scale!;
  el.innerHTML = Array.from(
    { length: 12 },
    (_, i) =>
      `<div class="swatch" style="background: var(--st-${scale}${scale.endsWith("-a") ? "" : "-"}${i + 1})"><span>${i + 1}</span></div>`,
  ).join("");
}

// ---------- Type scale ----------
$(".type-scale").innerHTML = [6, 5, 4, 3, 2, 1]
  .map(
    (n) => `<st-row gap="2" y-align="baseline">
      <st-text size="small" tone="faint" style="width:40px">text-${n}</st-text>
      <span style="font-size: var(--st-text-${n}); color: var(--st-text-strong); font-weight: 500">Layers</span>
    </st-row>`,
  )
  .join("");

// ---------- Segmented toggles ----------
function segmented(attr: "theme" | "density", apply: (value: string) => void) {
  for (const btn of document.querySelectorAll<HTMLButtonElement>(`[data-${attr}]`)) {
    btn.addEventListener("click", () => {
      for (const b of document.querySelectorAll(`[data-${attr}]`)) b.setAttribute("aria-pressed", "false");
      btn.setAttribute("aria-pressed", "true");
      apply(btn.dataset[attr]!);
    });
  }
}
segmented("theme", (v) => html.setAttribute("theme", v));
segmented("density", (v) => html.setAttribute("density", v));

// ---------- Knobs ----------
interface Knob {
  label: string;
  variable: string;
  min: number;
  max: number;
  step: number;
  value: number;
  unit?: string;
}
const GROUPS: [string, Knob[]][] = [
  [
    "Gray",
    [
      { label: "Hue", variable: "--st-gray-hue", min: 0, max: 360, step: 1, value: 255 },
      { label: "Chroma", variable: "--st-gray-chroma", min: 0, max: 0.04, step: 0.001, value: 0.006 },
    ],
  ],
  [
    "Accent",
    [
      { label: "Hue", variable: "--st-accent-hue", min: 0, max: 360, step: 1, value: 255 },
      { label: "Chroma", variable: "--st-accent-chroma", min: 0, max: 0.3, step: 0.005, value: 0 },
    ],
  ],
  [
    "Space",
    [
      { label: "Unit", variable: "--st-unit", min: 3, max: 6, step: 0.5, value: 4, unit: "px" },
      { label: "Density", variable: "--st-density", min: 0.75, max: 1.25, step: 0.025, value: 1 },
    ],
  ],
  ["Shape", [{ label: "Radius", variable: "--st-radius", min: 0, max: 10, step: 1, value: 4, unit: "px" }]],
  [
    "Type",
    [
      { label: "Size", variable: "--st-font-size", min: 10, max: 15, step: 0.5, value: 12, unit: "px" },
      { label: "Ratio", variable: "--st-type-ratio", min: 1.05, max: 1.33, step: 0.005, value: 1.125 },
    ],
  ],
];

$("#knobs").innerHTML = GROUPS.map(
  ([title, knobs], g) => `
  ${g ? "<st-divider></st-divider>" : ""}
  <st-column padding-x="3" padding-y="2.5" gap="1">
    <st-row class="section-title"><st-heading>${title}</st-heading></st-row>
    ${knobs
      .map(
        (k) => `
      <st-row class="prop" gap="2">
        <st-text tone="muted" class="prop-label">${k.label}</st-text>
        <input type="range" min="${k.min}" max="${k.max}" step="${k.step}" value="${k.value}" data-var="${k.variable}" data-unit="${k.unit ?? ""}" />
        <st-text numeric class="prop-value">${k.value}</st-text>
      </st-row>`,
      )
      .join("")}
  </st-column>`,
).join("");

$("#knobs").addEventListener("input", (e) => {
  const input = e.target as HTMLInputElement;
  html.style.setProperty(input.dataset.var!, input.value + input.dataset.unit);
  (input.nextElementSibling as HTMLElement).textContent = input.value;
});
