import "@station/tokens";
import "@station/tokens/fonts.css";
import "@station/components";
import "./playground.css";
import { registerIcons } from "@station/icons";
import * as I from "@station/icons/tabler";

// Only these icons end up in the bundle.
registerIcons({
  "align-center": I.IconAlignCenter,
  "align-left": I.IconAlignLeft,
  "align-right": I.IconAlignRight,
  angle: I.IconAngle,
  bold: I.IconBold,
  "border-radius": I.IconBorderRadius,
  "chevron-right": I.IconChevronRight,
  components: I.IconComponents,
  download: I.IconDownload,
  eye: I.IconEye,
  "eye-off": I.IconEyeOff,
  folder: I.IconFolder,
  frame: I.IconFrame,
  "hand-stop": I.IconHandStop,
  italic: I.IconItalic,
  "letter-t": I.IconLetterT,
  link: I.IconLink,
  lock: I.IconLock,
  message: I.IconMessage,
  moon: I.IconMoon,
  photo: I.IconPhoto,
  plus: I.IconPlus,
  pointer: I.IconPointer,
  rotate: I.IconRotate,
  square: I.IconSquare,
  stack: I.IconStack2,
  sun: I.IconSun,
  trash: I.IconTrash,
  typography: I.IconTypography,
  underline: I.IconUnderline,
  "vector-bezier-2": I.IconVectorBezier2,
});

type Station = HTMLElement & { value: number & string; pressed: boolean };
const $ = <T extends Element = Station>(sel: string) => document.querySelector(sel) as T;
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

$("st-search-field").addEventListener("input", (e) => {
  const q = ((e.currentTarget as HTMLElement & { value: string }).value ?? "").toLowerCase();
  for (const row of document.querySelectorAll<HTMLElement>(".layer")) {
    row.hidden = !!q && !row.textContent!.toLowerCase().includes(q);
  }
});

// ---------- Swatches ----------
for (const el of document.querySelectorAll<HTMLElement>(".swatches")) {
  const scale = el.dataset.scale!;
  el.innerHTML = Array.from(
    { length: 12 },
    (_, i) =>
      `<div class="swatch" style="background: var(--st-${scale}-${i + 1})"><span>${i + 1}</span></div>`,
  ).join("");
}

// ---------- Theme + density ----------
$("#theme").addEventListener("change", (e) => html.setAttribute("theme", (e.currentTarget as Station).value));
$("#density").addEventListener("change", (e) =>
  html.setAttribute("density", (e.currentTarget as Station).value),
);

// ---------- Tools: exactly one pressed ----------
$("#tools").addEventListener("change", (e) => {
  const picked = e.target as HTMLElement & { pressed: boolean };
  for (const t of $("#tools").querySelectorAll<HTMLElement & { pressed: boolean }>("st-toggle-button"))
    t.pressed = t === picked;
});

// ---------- Opacity: slider ↔ field ----------
const opacity = $("#opacity");
const opacityField = $("#opacity-field");
opacity.addEventListener("input", () => (opacityField.value = opacity.value));
opacityField.addEventListener("input", () => (opacity.value = opacityField.value));

// ---------- Knobs ----------
interface Knob {
  label: string;
  prefix: string;
  variable: string;
  min: number;
  max: number;
  step: number;
  value: number;
  unit?: string;
}
const KNOBS: Knob[] = [
  {
    label: "Gray hue",
    prefix: "H",
    variable: "--st-gray-hue",
    min: 0,
    max: 360,
    step: 1,
    value: 255,
    unit: "°",
  },
  {
    label: "Gray chroma",
    prefix: "C",
    variable: "--st-gray-chroma",
    min: 0,
    max: 0.04,
    step: 0.001,
    value: 0.006,
  },
  {
    label: "Accent hue",
    prefix: "H",
    variable: "--st-accent-hue",
    min: 0,
    max: 360,
    step: 1,
    value: 255,
    unit: "°",
  },
  {
    label: "Accent chroma",
    prefix: "C",
    variable: "--st-accent-chroma",
    min: 0,
    max: 0.3,
    step: 0.005,
    value: 0,
  },
  {
    label: "Space unit",
    prefix: "U",
    variable: "--st-unit",
    min: 3,
    max: 6,
    step: 0.5,
    value: 4,
    unit: "px",
  },
  { label: "Radius", prefix: "R", variable: "--st-radius", min: 0, max: 10, step: 1, value: 4, unit: "px" },
  {
    label: "Font size",
    prefix: "F",
    variable: "--st-font-size",
    min: 10,
    max: 15,
    step: 0.5,
    value: 12,
    unit: "px",
  },
  {
    label: "Type ratio",
    prefix: "×",
    variable: "--st-type-ratio",
    min: 1.05,
    max: 1.33,
    step: 0.005,
    value: 1.125,
  },
];

const knobs = $("#knobs");
knobs.insertAdjacentHTML(
  "beforeend",
  KNOBS.map(
    (k, i) => `
    <st-row class="prop" gap="2" data-knob="${i}">
      <st-text tone="muted" class="prop-label" size="small">${k.label}</st-text>
      <st-slider grow label="${k.label}" min="${k.min}" max="${k.max}" step="${k.step}" value="${k.value}"></st-slider>
      <st-number-field class="narrow" label="${k.label}" min="${k.min}" max="${k.max}" step="${k.step}" precision="3" value="${k.value}" ${k.unit ? `unit="${k.unit}"` : ""}></st-number-field>
    </st-row>`,
  ).join(""),
);

knobs.addEventListener("input", (e) => {
  const row = (e.target as Element).closest<HTMLElement>("[data-knob]");
  if (!row) return;
  const knob = KNOBS[Number(row.dataset.knob)]!;
  const value = (e.target as HTMLElement & { value: number }).value;
  html.style.setProperty(knob.variable, `${value}${knob.unit === "px" ? "px" : ""}`);
  for (const el of row.querySelectorAll<HTMLElement & { value: number }>("st-slider, st-number-field")) {
    if (el !== e.target) el.value = value;
  }
});

$("#reset").addEventListener("click", () => {
  for (const [i, k] of KNOBS.entries()) {
    html.style.removeProperty(k.variable);
    for (const el of document.querySelectorAll<HTMLElement & { value: number }>(
      `[data-knob="${i}"] st-slider, [data-knob="${i}"] st-number-field`,
    )) {
      el.value = k.value;
    }
  }
});
