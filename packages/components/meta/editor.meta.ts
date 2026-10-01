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

const INPUT: EventMeta = { name: "input", description: "Changing (drag, keys)." };
const CHANGE: EventMeta = { name: "change", description: "Committed." };
const ORIENTATION = (d: "horizontal" | "vertical") =>
  a("orientation", ["horizontal", "vertical"], "Layout direction.", { default: d });

export const editor: ElementMeta[] = [
  {
    tag: "st-split",
    module: "@station/components/split",
    className: "Split",
    description:
      'Resizable panes. Fixed panes have a size; the rest fill. Drag, arrow keys, or double-click a divider. kind="cards" lays panes out as rounded cards with gaps on the backdrop.',
    attributes: [
      a("orientation", ["horizontal", "vertical"], "horizontal = side by side.", { default: "horizontal" }),
      a(
        "kind",
        ["cards"],
        "cards = rounded panes with gaps on --st-bg-backdrop. Omit for edge-to-edge panes with dividers.",
      ),
      a("autosave", "string", "Remember sizes and collapsed state in localStorage under this key."),
    ],
    events: [INPUT, { name: "change", description: "A resize or collapse was committed." }],
    slots: [{ name: "", description: "st-pane elements." }],
    parts: [{ name: "handle", description: "Each divider." }],
    cssProperties: [
      { name: "--st-split-gap", description: "Gap around and between cards. Default space-3." },
      { name: "--st-split-card-radius", description: "Card corner radius. Default radius-5." },
    ],
  },
  {
    tag: "st-pane",
    module: "@station/components/pane",
    className: "Pane",
    description: "One pane of st-split.",
    attributes: [
      a("size", "number", "Fixed size in px. Omit to fill."),
      a("min", "number", "Smallest size."),
      a("max", "number", "Largest size."),
      a("collapsible", "boolean", "Double-click / Enter on the divider collapses it."),
      a("collapsed", "boolean", "Collapsed state."),
      a("collapsed-size", "number", "Size when collapsed. Default 40 with a label (rail), else 0."),
      a("label", "string", "Pane name: shown on the collapsed rail and used by st-pane-toggle."),
      a("icon", "string", "Icon on the collapsed rail."),
      a(
        "collapse",
        ["rail", "hide"],
        "Collapsed look: a labeled rail you can click to expand, or hidden entirely.",
        {
          default: "rail",
        },
      ),
    ],
    methods: [
      {
        name: "toggle",
        signature: "(force?: boolean): void",
        description: "Collapse or expand (force: true = expand).",
      },
    ],
    events: [
      { name: "openchange", type: "CustomEvent<{ open: boolean }>", description: "Expanded or collapsed." },
    ],
    slots: [{ name: "", description: "Pane content." }],
    parts: [{ name: "rail", description: "The collapsed rail button." }],
  },
  {
    tag: "st-pane-toggle",
    module: "@station/components/pane-toggle",
    className: "PaneToggle",
    description:
      'Button that collapses or expands a pane. Inside a pane (e.g. its header) it toggles that pane; elsewhere set for="pane-id".',
    attributes: [
      { name: "for", type: "string", description: "Id of the st-pane to toggle. Default: the closest pane." },
      a("label", "string", "Accessible name. Default: Collapse/Expand + the pane's label."),
    ],
    parts: [{ name: "button", description: "The button." }],
  },
  {
    tag: "st-tree",
    module: "@station/components/tree",
    className: "Tree",
    description:
      "Virtualized tree for layers, files and scene graphs. Set `items` (and optional `toggles`) as properties; it fires events and never mutates your data. Helpers: moveItems(), updateItem().",
    attributes: [
      a("selection-mode", ["single", "multiple", "none"], "Selection behavior.", { default: "multiple" }),
      a("renamable", "boolean", "F2 / double-click the label to rename."),
      a("reorderable", "boolean", "Drag rows to reorder or nest."),
      a("label", "string", "Accessible name."),
    ],
    properties: [
      {
        name: "items",
        type: "TreeItem[]",
        description:
          "Nodes: { id, label, icon?, thumbnail?, description?, children?, expanded?, muted?, disabled? }.",
      },
      {
        name: "toggles",
        type: "TreeToggle[]",
        description:
          "Per-row on/off columns (visibility, lock): { key, label, icon, offIcon?, default?, position?, show? }.",
      },
      { name: "selection", type: "string[]", description: "Selected ids." },
    ],
    methods: [
      { name: "expand", signature: "(id: string): void", description: "Expand a node and its ancestors." },
      { name: "collapse", signature: "(id: string): void", description: "Collapse a node." },
      { name: "expandAll", description: "Expand everything." },
      { name: "collapseAll", description: "Collapse everything." },
      { name: "scrollToItem", signature: "(id: string): void", description: "Reveal and scroll to a node." },
      { name: "rename", signature: "(id: string): void", description: "Start renaming a node." },
    ],
    events: [
      { name: "change", type: "CustomEvent<{ selection: string[] }>", description: "Selection changed." },
      {
        name: "expandchange",
        type: "CustomEvent<{ id: string; expanded: boolean }>",
        description: "A node opened or closed.",
      },
      {
        name: "itemchange",
        type: "CustomEvent<{ id: string; key: string; value: boolean }>",
        description: "A toggle column was clicked.",
      },
      {
        name: "rename",
        type: "CustomEvent<{ id: string; label: string }>",
        description: "Rename committed.",
      },
      {
        name: "move",
        type: 'CustomEvent<{ ids: string[]; target: string; position: "before" | "after" | "inside" }>',
        description: "Rows dropped.",
      },
      { name: "action", type: "CustomEvent<{ id: string }>", description: "Enter or double-click on a row." },
    ],
    slots: [{ name: "empty", description: "Shown when there are no items." }],
    parts: [{ name: "viewport", description: "The scrolling tree." }],
    cssProperties: [
      { name: "--st-tree-row-height", description: "Row height. Default control height + 4px." },
      { name: "--st-tree-indent", description: "Indent per level. Default 16px." },
      { name: "--st-tree-row-inset", description: "Gap between rows and the tree's edges. Default space-1." },
      { name: "--st-tree-row-radius", description: "Row corner radius (999px for pills). Default radius-2." },
    ],
  },
  {
    tag: "st-menubar",
    module: "@station/components/menubar",
    className: "Menubar",
    description: "Application menubar. Each child st-menu becomes an entry named by its `label`.",
    attributes: [a("label", "string", "Accessible name.")],
    slots: [{ name: "", description: "st-menu elements with a label." }],
  },
  {
    tag: "st-toolbox",
    module: "@station/components/toolbox",
    className: "Toolbox",
    description:
      "Tool palette (Photoshop / Illustrator). One tool is active. `hotkeys` enables single-key tool shortcuts.",
    attributes: [
      a("value", "string", "Active tool value."),
      a("label", "string", "Accessible name."),
      ORIENTATION("vertical"),
      a("columns", "number", "Grid columns.", { default: 1 }),
      a("hotkeys", "boolean", "Press a tool's shortcut to select it; repeat to cycle its group."),
      a("tone", ["accent"], "Inverted active tool."),
      SIZE,
    ],
    events: [{ name: "change", type: "CustomEvent<{ value: string }>", description: "Active tool changed." }],
    slots: [{ name: "", description: "st-tool, st-tool-group, st-divider." }],
  },
  {
    tag: "st-tool",
    module: "@station/components/tool",
    className: "Tool",
    description: "A tool: a button in st-toolbox, or an alternate inside st-tool-group.",
    attributes: [
      a("value", "string", "Tool id."),
      a("icon", "string", "Icon name."),
      a("label", "string", "Name and tooltip."),
      a("shortcut", "string", 'Shortcut, e.g. "V" or "Shift+M".'),
      a("selected", "boolean", "Set by st-toolbox."),
      a("disabled", "boolean", "Not selectable."),
    ],
  },
  {
    tag: "st-tool-group",
    module: "@station/components/tool-group",
    className: "ToolGroup",
    description: "Related tools behind one button. Long-press, right-click, Alt+click or → opens the flyout.",
    attributes: [
      a("label", "string", "Group name."),
      a("current", "string", "Tool shown on the button (last used)."),
      a("selected", "boolean", "Set by st-toolbox."),
    ],
    slots: [{ name: "", description: "st-tool alternates." }],
  },
  {
    tag: "st-color-swatch",
    module: "@station/components/color-swatch",
    className: "ColorSwatch",
    description: "Color chip with alpha checkerboard. An option inside st-swatches.",
    attributes: [
      a("color", "string", "Any CSS color."),
      a("label", "string", "Accessible name."),
      a("selected", "boolean", "Set by st-swatches."),
    ],
    parts: [{ name: "chip", description: "The chip." }],
    cssProperties: [{ name: "--st-swatch-size", description: "Width and height." }],
  },
  {
    tag: "st-swatches",
    module: "@station/components/swatches",
    className: "Swatches",
    description: "Palette of st-color-swatch options.",
    attributes: [a("value", "string", "Selected color."), a("label", "string", "Accessible name.")],
    events: [INPUT, CHANGE],
    slots: [{ name: "", description: "st-color-swatch elements." }],
  },
  {
    tag: "st-color-picker",
    module: "@station/components/color-picker",
    className: "ColorPicker",
    description: "Saturation/brightness area, hue and alpha strips, eyedropper, HEX/RGB/HSB fields.",
    attributes: [
      a("value", "string", "Hex color (#rrggbb or #rrggbbaa)."),
      a("alpha", "boolean", "Allow transparency."),
    ],
    events: [INPUT, CHANGE],
    parts: [
      { name: "area", description: "Saturation/brightness area." },
      { name: "hue", description: "Hue strip." },
      { name: "alpha", description: "Alpha strip." },
    ],
  },
  {
    tag: "st-color-field",
    module: "@station/components/color-field",
    className: "ColorField",
    description: "Swatch + hex + opacity. The swatch opens a color picker.",
    attributes: [
      a("value", "string", "Hex color."),
      a("label", "string", "Accessible name."),
      a("alpha", "boolean", "Show opacity."),
      a("kind", ["filled", "outline", "ghost"], "Field chrome.", { default: "filled" }),
      SIZE,
      a("disabled", "boolean", "Not editable."),
    ],
    events: [INPUT, CHANGE],
    parts: [{ name: "input", description: "Hex input." }],
  },
  {
    tag: "st-ruler",
    module: "@station/components/ruler",
    className: "Ruler",
    description:
      "Canvas ruler for canvases and timelines. `zoom` = screen px per unit, `offset` = value at the start.",
    attributes: [
      ORIENTATION("horizontal"),
      a("zoom", "number", "Screen pixels per unit.", { default: 1 }),
      a("offset", "number", "Value at the ruler's start.", { default: 0 }),
      a("marker", "number", "Cursor position line."),
      a("range-start", "number", "Highlighted range start (selection)."),
      a("range-end", "number", "Highlighted range end."),
      a("format", ["number", "time"], "Label format. time = m:ss.", { default: "number" }),
      a("fps", "number", "Frames per second for sub-second time labels."),
    ],
    methods: [
      {
        name: "valueAt",
        signature: "(client: number): number",
        description: "Unit value at a clientX (or clientY) — e.g. for dragging out guides.",
      },
    ],
    parts: [{ name: "canvas", description: "The canvas." }],
  },
  {
    tag: "st-knob",
    module: "@station/components/knob",
    className: "Knob",
    description:
      "Rotary control. Drag up/down, scroll when focused, or use keys. Shift = fine. Double-click resets.",
    attributes: [
      a("value", "number", "Current value."),
      a("min", "number", "Minimum.", { default: 0 }),
      a("max", "number", "Maximum.", { default: 100 }),
      a("step", "number", "Key step. Default 1% of the range."),
      a("default", "number", "Value restored on double-click."),
      a("label", "string", "Accessible name."),
      a("unit", "string", "Unit shown in the value text."),
      a("bipolar", "boolean", "Fill from the center (pan, gain)."),
      a("show-value", "boolean", "Show the value under the dial."),
      a("size", ["small", "medium", "large"], "24 / 32 / 44px.", { default: "medium" }),
      a("disabled", "boolean", "Not interactive."),
    ],
    events: [INPUT, CHANGE],
    slots: [{ name: "", description: "Caption under the knob." }],
    parts: [{ name: "dial", description: "The SVG dial." }],
  },
  {
    tag: "st-meter",
    module: "@station/components/meter",
    className: "Meter",
    description: "Level meter with warn/danger zones and a peak hold line. dB by default.",
    attributes: [
      a("value", "number", "Current level."),
      a("peak", "number", "Peak hold level."),
      a("min", "number", "Bottom of the scale.", { default: -60 }),
      a("max", "number", "Top of the scale.", { default: 6 }),
      a("warn", "number", "Start of the warning zone.", { default: -12 }),
      a("danger", "number", "Start of the danger zone.", { default: -3 }),
      a("label", "string", "Accessible name."),
      ORIENTATION("vertical"),
    ],
    parts: [
      { name: "track", description: "Background." },
      { name: "level", description: "The fill." },
    ],
  },
  {
    tag: "st-command-palette",
    module: "@station/components/command-palette",
    className: "CommandPalette",
    description: "Fuzzy command launcher. Set `commands` as a property. Fires `select`.",
    attributes: [
      a("open", "boolean", "Open state."),
      a("placeholder", "string", "Search placeholder."),
      a("hotkey", "string", 'Global shortcut that toggles it, e.g. "Mod+K".'),
      a("empty-text", "string", "Shown when nothing matches."),
    ],
    properties: [
      {
        name: "commands",
        type: "Command[]",
        description: "{ id, label, group?, icon?, shortcut?, keywords?, disabled? }.",
      },
    ],
    methods: [
      { name: "show", description: "Open." },
      { name: "close", description: "Close." },
    ],
    events: [
      { name: "select", type: "CustomEvent<{ id: string }>", description: "A command was chosen." },
      { name: "openchange", type: "CustomEvent<{ open: boolean }>", description: "Opened or closed." },
    ],
  },
];
