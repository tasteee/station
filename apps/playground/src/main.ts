import "@station/tokens";
import "@station/tokens/fonts.css";
import "@station/components";
import "./playground.css";
import { confirm, toast } from "@station/components";

import "./icons.ts";
import "./nav.ts";

type Station = HTMLElement & { value: number; open: boolean; pressed: boolean };
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

const layerList = $("#layers");
let selected = 3;

function renderLayers() {
  layerList.innerHTML = LAYERS.map(
    ([depth, icon, name, flags], i) => `
    <st-row class="layer" gap="1.5" padding-x="3" data-index="${i}" style="--depth:${depth}" ${i === selected ? 'aria-selected="true"' : ""} ${flags === "hidden" ? "data-hidden" : ""}>
      <st-icon class="caret" name="chevron-right" ${icon === "frame" || icon === "folder" ? "" : 'style="visibility:hidden"'}></st-icon>
      <st-icon class="kind" name="${icon}"></st-icon>
      <st-text truncate grow>${name}</st-text>
      ${flags === "lock" ? '<st-icon class="flag" name="lock" label="Locked"></st-icon>' : ""}
      <st-icon class="flag vis" name="${flags === "hidden" ? "eye-off" : "eye"}"></st-icon>
    </st-row>`,
  ).join("");
  $("#layer-count").textContent = String(LAYERS.length);
}
renderLayers();

const selectRow = (target: EventTarget | null) => {
  const row = (target as Element | null)?.closest<HTMLElement>(".layer");
  if (!row) return;
  selected = Number(row.dataset.index);
  for (const r of layerList.querySelectorAll(".layer")) r.removeAttribute("aria-selected");
  row.setAttribute("aria-selected", "true");
};
layerList.addEventListener("click", (e) => selectRow(e.target));
// The context menu opens on the scroll area; select the row that was right-clicked.
layerList.addEventListener("contextmenu", (e) => selectRow(e.target));
layerList.id = "layers";

async function deleteSelected() {
  const layer = LAYERS[selected];
  if (!layer) return;
  const ok = await confirm({
    heading: `Delete “${layer[2]}”?`,
    body: "The layer and everything inside it will be removed.",
    confirmLabel: "Delete",
    tone: "danger",
  });
  if (!ok) return;
  const [removed] = LAYERS.splice(selected, 1);
  const at = selected;
  selected = Math.min(selected, LAYERS.length - 1);
  renderLayers();
  toast(`Deleted “${removed![2]}”`, {
    action: {
      label: "Undo",
      onClick: () => {
        LAYERS.splice(at, 0, removed!);
        selected = at;
        renderLayers();
      },
    },
  });
}

$("#layer-menu").addEventListener("select", (e) => {
  const { value } = (e as CustomEvent<{ value: string }>).detail;
  const name = LAYERS[selected]?.[2] ?? "layer";
  if (value === "delete") deleteSelected();
  else if (value === "duplicate") toast(`Duplicated “${name}”`, { tone: "success" });
  else if (value !== "visible") toast(`${(e.target as HTMLElement).textContent?.trim()} · ${name}`);
});
$("#delete-layer").addEventListener("click", deleteSelected);

$("st-search-field").addEventListener("input", (e) => {
  const q = String((e.currentTarget as Station).value ?? "").toLowerCase();
  let visible = 0;
  for (const row of layerList.querySelectorAll<HTMLElement>(".layer")) {
    row.hidden = !!q && !row.textContent!.toLowerCase().includes(q);
    if (!row.hidden) visible++;
  }
  $("#no-results").hidden = visible > 0;
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
$("#theme").addEventListener("change", (e) =>
  html.setAttribute("theme", String((e.currentTarget as Station).value)),
);
$("#density").addEventListener("change", (e) =>
  html.setAttribute("density", String((e.currentTarget as Station).value)),
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
    value: 0,
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
  { label: "Radius", prefix: "R", variable: "--st-radius", min: 0, max: 12, step: 1, value: 6, unit: "px" },
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
    <st-property-row label="${k.label}" data-knob="${i}">
      <st-slider min="${k.min}" max="${k.max}" step="${k.step}" value="${k.value}"></st-slider>
      <st-number-field class="narrow" shrink="none" min="${k.min}" max="${k.max}" step="${k.step}" precision="3" value="${k.value}" ${k.unit ? `unit="${k.unit}"` : ""}></st-number-field>
    </st-property-row>`,
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

// ---------- Export dialog ----------
const exportDialog = $("#export-dialog");
for (const b of document.querySelectorAll(".open-export"))
  b.addEventListener("click", () => (exportDialog.open = true));
$("#export-cancel").addEventListener("click", () => (exportDialog.open = false));
$("#export-go").addEventListener("click", () => {
  const progress = $("#export-progress");
  const status = $("#export-status");
  progress.hidden = false;
  status.hidden = false;
  let n = 0;
  const tick = setInterval(() => {
    n += 20;
    progress.value = n;
    if (n >= 100) {
      clearInterval(tick);
      exportDialog.open = false;
      progress.hidden = true;
      progress.value = 0;
      status.hidden = true;
      toast("Exported 3 frames", { tone: "success", action: { label: "Show", onClick: () => {} } });
    }
  }, 180);
});
