import { type AttributeMeta, type ElementMeta, type EventMeta, SIZE } from "./types.ts";

const a = (
  name: string,
  type: AttributeMeta["type"],
  description: string,
  extra: Partial<AttributeMeta> = {},
): AttributeMeta => ({
  name,
  property: name.replace(/-([a-z])/g, (_, ch: string) => ch.toUpperCase()),
  type,
  description,
  ...extra,
});

const INPUT: EventMeta = { name: "input", description: "Changing." };
const CHANGE: EventMeta = { name: "change", description: "Committed." };

export const kits: ElementMeta[] = [
  {
    tag: "st-vector-field",
    module: "@station/components/vector-field",
    className: "VectorField",
    description: "Several numbers edited together (X Y, W H, X Y Z). `linkable` adds an aspect-ratio lock.",
    attributes: [
      a("value", "string", 'Space-separated numbers, e.g. "120 80".'),
      a("axes", "string", 'Axis names, also the scrub labels. Default "x y".'),
      a("label", "string", "Accessible name prefix."),
      a("unit", "string", "Unit suffix."),
      a("step", "number", "Step."),
      a("min", "number", "Minimum for every axis."),
      a("max", "number", "Maximum for every axis."),
      a("precision", "number", "Decimals kept."),
      a("linkable", "boolean", "Show the ratio lock."),
      a("linked", "boolean", "Ratio locked: changing one axis scales the others."),
      SIZE,
      a("disabled", "boolean", "Not editable."),
    ],
    properties: [{ name: "values", type: "number[]", description: "The value as numbers.", accessor: true }],
    events: [
      { name: "input", type: "CustomEvent<{ values: number[] }>", description: "Changing." },
      { name: "change", type: "CustomEvent<{ values: number[] }>", description: "Committed." },
    ],
  },
  {
    tag: "st-inline-edit",
    module: "@station/components/inline-edit",
    className: "InlineEdit",
    description: "Text renamed in place: double-click, Enter or F2 to edit; Enter commits, Escape cancels.",
    attributes: [
      a("value", "string", "Text."),
      a("placeholder", "string", "Shown when empty."),
      a("label", "string", "Accessible name."),
      a("editing", "boolean", "Edit mode."),
      a("disabled", "boolean", "Not editable."),
    ],
    events: [
      { name: "change", type: "CustomEvent<{ value: string }>", description: "Renamed." },
      { name: "cancel", description: "Edit cancelled." },
    ],
    parts: [
      { name: "text", description: "Display text." },
      { name: "input", description: "Editor." },
    ],
  },
  {
    tag: "st-breadcrumbs",
    module: "@station/components/breadcrumbs",
    className: "Breadcrumbs",
    description: "Path navigation. The last st-crumb is current; middle crumbs fold into “…” when narrow.",
    attributes: [a("label", "string", "Accessible name.", { default: "Breadcrumb" })],
    slots: [{ name: "", description: "st-crumb elements." }],
  },
  {
    tag: "st-crumb",
    module: "@station/components/crumb",
    className: "Crumb",
    description: "One step in st-breadcrumbs. Fires `select`.",
    attributes: [
      a("value", "string", "Reported in select. Defaults to the text."),
      a("icon", "string", "Icon name."),
      a("current", "boolean", "Set by st-breadcrumbs on the last crumb."),
    ],
    events: [{ name: "select", type: "CustomEvent<{ value: string }>", description: "Chosen." }],
    slots: [{ name: "", description: "Label." }],
  },
  {
    tag: "st-zoom-control",
    module: "@station/components/zoom-control",
    className: "ZoomControl",
    description: "Zoom: −/+ step through presets, type a percentage, or pick from the menu.",
    attributes: [
      a("value", "number", "Zoom in percent.", { default: 100 }),
      a("min", "number", "Minimum percent.", { default: 1 }),
      a("max", "number", "Maximum percent.", { default: 6400 }),
      a("no-fit", "boolean", "Hide the Fit menu item."),
      SIZE,
    ],
    events: [
      { name: "change", type: "CustomEvent<{ value: number }>", description: "Zoom changed." },
      { name: "fit", description: "Fit was chosen; the app decides the zoom." },
    ],
  },
  {
    tag: "st-curve-editor",
    module: "@station/components/curve-editor",
    className: "CurveEditor",
    description:
      "Curves (Photoshop Curves, easing, automation). Click to add, drag, drag off or Delete to remove; PageUp/Down pick, arrows nudge.",
    attributes: [
      a("interpolation", ["smooth", "linear"], "smooth = monotone spline (no overshoot).", {
        default: "smooth",
      }),
      a("color", "string", "Curve color (e.g. a channel color)."),
      a("label", "string", "Accessible name."),
    ],
    properties: [
      { name: "points", type: "CurvePoint[]", description: "Points, 0–1 on both axes." },
      { name: "histogram", type: "number[]", description: "Bins drawn behind the curve." },
    ],
    methods: [
      {
        name: "evaluate",
        signature: "(x: number): number",
        description: "Curve output (0–1) for an input (0–1).",
      },
    ],
    events: [INPUT, CHANGE],
    parts: [
      { name: "graph", description: "The SVG graph." },
      { name: "readout", description: "Input/output numbers." },
    ],
  },
  {
    tag: "st-gradient-editor",
    module: "@station/components/gradient-editor",
    className: "GradientEditor",
    description:
      "Gradient stops: click the bar to add, drag to move, drag down or Delete to remove; edit color and location below.",
    attributes: [a("label", "string", "Accessible name.")],
    properties: [
      { name: "stops", type: "GradientStop[]", description: "Stops: { offset 0–1, color }." },
      { name: "css", type: "string", description: "Read-only linear-gradient() at 90°.", accessor: true },
    ],
    methods: [
      {
        name: "toCSS",
        signature: "(angle?: number): string",
        description: "CSS linear-gradient() at an angle.",
      },
    ],
    events: [INPUT, CHANGE],
    parts: [
      { name: "bar", description: "Gradient preview." },
      { name: "stop", description: "Each stop handle." },
    ],
  },
  {
    tag: "st-histogram",
    module: "@station/components/histogram",
    className: "Histogram",
    description: "Canvas histogram: one channel (`bins`) or red/green/blue (`channels`).",
    attributes: [
      a("scale", ["linear", "log"], "Vertical scale.", { default: "linear" }),
      a("label", "string", "Accessible name."),
    ],
    properties: [
      { name: "bins", type: "number[]", description: "Counts per bin (often 256)." },
      { name: "channels", type: "HistogramChannels", description: "{ red?, green?, blue? } bins, overlaid." },
    ],
    parts: [{ name: "canvas", description: "The canvas." }],
  },
  {
    tag: "st-data-table",
    module: "@station/components/data-table",
    className: "DataTable",
    description:
      "Virtualized data grid: sticky header, resizable columns, sorting, spreadsheet-style keyboard and editing. Never mutates `rows`; use updateRow().",
    attributes: [
      a("selection-mode", ["single", "multiple", "none"], "Row selection.", { default: "multiple" }),
      a("manual-sort", "boolean", "Don't sort locally; just fire sortchange."),
      a("label", "string", "Accessible name."),
    ],
    properties: [
      {
        name: "columns",
        type: "TableColumn[]",
        description: "{ key, label, width?, minWidth?, align?, sortable?, editable?, type?, format? }.",
      },
      { name: "rows", type: "TableRow[]", description: "{ id, ...cells }." },
      { name: "selection", type: "string[]", description: "Selected row ids." },
      { name: "sort", type: "TableSort | null", description: "{ key, direction }." },
    ],
    events: [
      { name: "change", type: "CustomEvent<{ selection: string[] }>", description: "Selection changed." },
      {
        name: "sortchange",
        type: 'CustomEvent<{ key: string; direction: "ascending" | "descending" | null }>',
        description: "Sort changed.",
      },
      {
        name: "cellchange",
        type: "CustomEvent<{ id: string; key: string; value: unknown }>",
        description: "A cell edit was committed.",
      },
      {
        name: "columnresize",
        type: "CustomEvent<{ key: string; width: number }>",
        description: "A column was resized.",
      },
      {
        name: "action",
        type: "CustomEvent<{ id: string }>",
        description: "Enter or double-click on a read-only cell.",
      },
    ],
    slots: [{ name: "empty", description: "Shown with no rows." }],
    parts: [{ name: "viewport", description: "The scrolling grid." }],
    cssProperties: [{ name: "--st-table-row-height", description: "Row height." }],
  },
  {
    tag: "st-timeline",
    module: "@station/components/timeline",
    className: "Timeline",
    description:
      "Multi-track timeline (video, audio, animation): move/trim clips, drag between tracks, keyframes, playhead scrubbing, snapping (Alt disables), Mod+wheel zoom.",
    attributes: [
      a("zoom", "number", "Pixels per unit.", { default: 24 }),
      a("playhead", "number", "Playhead time.", { default: 0 }),
      a("duration", "number", "Minimum content length."),
      a("snap", "number", "Grid step for snapping (also snaps to clip edges and the playhead)."),
      a("format", ["number", "time"], "Ruler labels.", { default: "time" }),
      a("fps", "number", "Frames per second for labels and nudging."),
      a("track-height", "number", "Track height in px.", { default: 40 }),
      a("label", "string", "Accessible name."),
    ],
    properties: [
      {
        name: "tracks",
        type: "TimelineTrack[]",
        description: "{ id, label, color?, clips?, keyframes?, ...toggleValues }.",
      },
      {
        name: "trackToggles",
        type: "TimelineToggle[]",
        description: "Header buttons: { key, label, text }.",
      },
      { name: "selection", type: "string[]", description: "Selected clip and keyframe ids." },
    ],
    events: [
      { name: "seek", type: "CustomEvent<{ time: number }>", description: "Playhead moved by the user." },
      {
        name: "clipchange",
        type: "CustomEvent<{ id: string; trackId: string; start: number; end: number }>",
        description: "A clip moved or was trimmed.",
      },
      {
        name: "keyframechange",
        type: "CustomEvent<{ id: string; trackId: string; time: number }>",
        description: "A keyframe moved.",
      },
      { name: "change", type: "CustomEvent<{ selection: string[] }>", description: "Selection changed." },
      {
        name: "trackchange",
        type: "CustomEvent<{ id: string; key: string; value: boolean }>",
        description: "A track toggle was clicked.",
      },
      { name: "zoomchange", type: "CustomEvent<{ zoom: number }>", description: "Zoomed with Mod+wheel." },
      {
        name: "delete",
        type: "CustomEvent<{ ids: string[] }>",
        description: "Delete pressed with a selection.",
      },
    ],
    slots: [{ name: "corner", description: "Top-left corner above the track headers." }],
    parts: [
      { name: "headers", description: "Track headers." },
      { name: "lanes", description: "Scrolling lanes." },
      { name: "clip", description: "Each clip." },
    ],
    cssProperties: [{ name: "--st-timeline-header-width", description: "Track header column width." }],
  },
  {
    tag: "st-dock",
    module: "@station/components/dock",
    className: "Dock",
    description:
      "Docked panel groups (Photoshop/After Effects): tabs, drag tabs between groups, resize, minimize, collapse to an icon strip with flyouts. Arranges without moving your DOM.",
    attributes: [
      a("label", "string", "Accessible name.", { default: "Panels" }),
      a("side", ["right", "left"], "Which screen edge it sits on (flyout direction).", { default: "right" }),
      a("collapsed", "boolean", "Icon strip mode."),
      a("autosave", "string", "Remember the layout in localStorage under this key."),
    ],
    properties: [
      {
        name: "layout",
        type: "DockLayout",
        description: "Current arrangement; set it to restore one.",
        accessor: true,
      },
    ],
    events: [
      {
        name: "layoutchange",
        type: "CustomEvent<{ layout: DockLayout }>",
        description: "Panels moved, resized, minimized or collapsed.",
      },
      { name: "openchange", type: "CustomEvent<{ open: boolean }>", description: "Expanded or collapsed." },
    ],
    slots: [{ name: "", description: "st-dock-panel elements." }],
  },
  {
    tag: "st-dock-panel",
    module: "@station/components/dock-panel",
    className: "DockPanel",
    description: "One panel in st-dock.",
    attributes: [
      a("name", "string", "Stable id (used in layouts)."),
      a("label", "string", "Tab text."),
      a("icon", "string", "Icon in the collapsed strip."),
      a("group", "string", "Initial group; panels with the same value share tabs."),
    ],
    slots: [{ name: "", description: "Panel content." }],
  },
];
