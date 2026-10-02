/**
 * Live examples, one or more per element. Used by the docs site, the axe
 * accessibility suite and the render smoke test, so every example must be
 * valid, labeled markup. `setup` sets JS-only data (rows, tracks…).
 */
import type { ElementMeta } from "./types.ts";

type Tag = ElementMeta["tag"];
// biome-ignore lint/suspicious/noExplicitAny: examples poke element properties freely.
type Any = HTMLElement & Record<string, any>;

export interface Example {
  id: string;
  title: string;
  /** Elements this example demonstrates. Every tag must be covered at least once. */
  covers: Tag[];
  html: string;
  setup?: (root: HTMLElement) => void;
}

/** Icon names the examples use. Hosts register these (docs, tests). */
export const exampleIcons = [
  "adjustments",
  "align-center",
  "align-left",
  "align-right",
  "arrows-move",
  "bold",
  "brush",
  "copy",
  "download",
  "eye",
  "eye-off",
  "file",
  "folder",
  "grid-dots",
  "history",
  "home",
  "italic",
  "lock",
  "palette",
  "pencil",
  "photo",
  "plus",
  "search",
  "settings",
  "square",
  "square-dashed",
  "circle-dashed",
  "stack",
  "trash",
  "typography",
  "underline",
  "zoom-in",
] as const;

const $ = (root: HTMLElement, sel: string) => root.querySelector(sel) as Any;
const bump = (n: number, center: number, spread: number) =>
  Array.from({ length: n }, (_, i) => Math.round(1000 * Math.exp(-(((i - center) / spread) ** 2))));

export const examples: Example[] = [
  // ---------- Foundations ----------
  {
    id: "layout",
    title: "Box, row, column, spacer",
    covers: ["st-box", "st-row", "st-column", "st-spacer"],
    html: `<st-column gap="2">
  <st-row gap="2">
    <st-text>Left</st-text>
    <st-spacer></st-spacer>
    <st-text tone="muted">Right</st-text>
  </st-row>
  <st-row x-align="between" padding="2" style="border:1px dashed var(--st-border)">
    <st-box padding="2" style="background:var(--st-bg-hover)">A</st-box>
    <st-box padding="2" style="background:var(--st-bg-hover)">B</st-box>
    <st-box padding="2" style="background:var(--st-bg-hover)">C</st-box>
  </st-row>
</st-column>`,
  },
  {
    id: "type",
    title: "Text, heading, divider",
    covers: ["st-text", "st-heading", "st-divider"],
    html: `<st-column gap="2">
  <st-heading size="large">Layer properties</st-heading>
  <st-text>Body text uses the default contrast.</st-text>
  <st-text tone="muted" size="small">Muted helper text.</st-text>
  <st-divider></st-divider>
  <st-row gap="2"><st-text numeric>1,280 × 720</st-text><st-divider></st-divider><st-text mono>#3366CC</st-text></st-row>
</st-column>`,
  },
  {
    id: "surfaces",
    title: "Surfaces and scroll area",
    covers: ["st-surface", "st-scroll-area"],
    html: `<st-row gap="2" y-align="stretch">
  <st-surface level="canvas" padding="3" bordered rounded><st-text>Canvas</st-text></st-surface>
  <st-surface level="panel" padding="3" bordered rounded><st-text>Panel</st-text></st-surface>
  <st-surface level="well" padding="3" bordered rounded><st-text>Well</st-text></st-surface>
  <st-scroll-area axis="y" tabindex="0" role="region" aria-label="Notes" style="height:64px;width:140px" padding="2">
    <st-text>Scrolls when content is taller than the area. Line two. Line three. Line four. Line five.</st-text>
  </st-scroll-area>
</st-row>`,
  },
  {
    id: "icon-kbd",
    title: "Icon and keyboard shortcut",
    covers: ["st-icon", "st-kbd"],
    html: `<st-row gap="3">
  <st-icon name="brush"></st-icon>
  <st-icon name="trash" label="Delete"></st-icon>
  <st-kbd shortcut="Mod+Shift+Z"></st-kbd>
  <st-kbd shortcut="Mod+K" kind="boxed"></st-kbd>
</st-row>`,
  },

  // ---------- Controls ----------
  {
    id: "buttons",
    title: "Buttons",
    covers: ["st-button", "st-icon-button", "st-toggle-button"],
    html: `<st-row gap="2" wrap>
  <st-button kind="solid" tone="accent">Export</st-button>
  <st-button kind="outline" icon="plus">Add layer</st-button>
  <st-button kind="ghost">Cancel</st-button>
  <st-button tone="danger" kind="outline">Delete</st-button>
  <st-button loading>Saving</st-button>
  <st-icon-button icon="copy" label="Duplicate" shortcut="Mod+D"></st-icon-button>
  <st-toggle-button icon="lock" label="Lock layer" pressed></st-toggle-button>
</st-row>`,
  },
  {
    id: "groups",
    title: "Button group and toolbar",
    covers: ["st-button-group", "st-toolbar"],
    html: `<st-column gap="3">
  <st-button-group attached label="Text style">
    <st-toggle-button icon="bold" label="Bold"></st-toggle-button>
    <st-toggle-button icon="italic" label="Italic"></st-toggle-button>
    <st-toggle-button icon="underline" label="Underline"></st-toggle-button>
  </st-button-group>
  <st-toolbar label="Canvas tools" kind="ghost">
    <st-icon-button icon="arrows-move" label="Move"></st-icon-button>
    <st-icon-button icon="brush" label="Brush"></st-icon-button>
    <st-divider></st-divider>
    <st-icon-button icon="zoom-in" label="Zoom in"></st-icon-button>
  </st-toolbar>
  <st-toolbar label="Tool dock" floating>
    <st-toggle-button tone="accent" icon="arrows-move" label="Move" pressed></st-toggle-button>
    <st-toggle-button tone="accent" icon="square" label="Rectangle"></st-toggle-button>
    <st-toggle-button tone="accent" icon="typography" label="Text"></st-toggle-button>
    <st-divider></st-divider>
    <st-toggle-button tone="accent" icon="pencil" label="Draw"></st-toggle-button>
  </st-toolbar>
</st-column>`,
  },
  {
    id: "segmented",
    title: "Segmented control",
    covers: ["st-segmented-control", "st-segment"],
    html: `<st-segmented-control value="left" label="Text alignment">
  <st-segment value="left" icon="align-left" label="Align left"></st-segment>
  <st-segment value="center" icon="align-center" label="Align center"></st-segment>
  <st-segment value="right" icon="align-right" label="Align right"></st-segment>
</st-segmented-control>`,
  },
  {
    id: "tooltip",
    title: "Tooltip",
    covers: ["st-tooltip"],
    html: `<st-tooltip label="Show grid" shortcut="Mod+'">
  <st-icon-button icon="grid-dots" label="Grid"></st-icon-button>
</st-tooltip>`,
  },
  {
    id: "text-fields",
    title: "Text, search and multi-line fields",
    covers: ["st-text-field", "st-search-field", "st-textarea"],
    html: `<st-column gap="2" style="width:260px">
  <st-text-field label="Layer name" value="Background"></st-text-field>
  <st-search-field label="Search layers" placeholder="Search"></st-search-field>
  <st-textarea label="Notes" rows="2" placeholder="Add a note"></st-textarea>
</st-column>`,
  },
  {
    id: "number-field",
    title: "Number field (drag the label, type math)",
    covers: ["st-number-field"],
    html: `<st-row gap="2" style="width:260px">
  <st-number-field label="X" abbr="X" value="120" unit="px"></st-number-field>
  <st-number-field label="Opacity" abbr="Op" value="80" min="0" max="100" unit="%"></st-number-field>
</st-row>`,
  },
  {
    id: "choices",
    title: "Checkbox, switch, radio",
    covers: ["st-checkbox", "st-switch", "st-radio-group", "st-radio"],
    html: `<st-column gap="2">
  <st-checkbox checked>Snap to grid</st-checkbox>
  <st-checkbox indeterminate>Some layers visible</st-checkbox>
  <st-switch checked>Auto-save</st-switch>
  <st-radio-group label="Units" value="px" orientation="horizontal">
    <st-radio value="px">Pixels</st-radio>
    <st-radio value="pt">Points</st-radio>
    <st-radio value="mm">Millimeters</st-radio>
  </st-radio-group>
</st-column>`,
  },
  {
    id: "sliders",
    title: "Sliders",
    covers: ["st-slider", "st-range-slider"],
    html: `<st-column gap="3" style="width:240px">
  <st-slider label="Hardness" value="60"></st-slider>
  <st-range-slider label="Input levels" start="20" end="230" max="255"></st-range-slider>
</st-column>`,
  },
  {
    id: "select",
    title: "Select and combobox",
    covers: ["st-select", "st-option", "st-combobox"],
    html: `<st-column gap="2" style="width:220px">
  <st-select label="Blend mode" value="multiply">
    <st-option value="normal">Normal</st-option>
    <st-option value="multiply">Multiply</st-option>
    <st-option value="screen">Screen</st-option>
  </st-select>
  <st-combobox label="Font" placeholder="Choose a font" allow-custom>
    <st-option value="dm-sans">DM Sans</st-option>
    <st-option value="inter">Inter</st-option>
    <st-option value="ibm-plex">IBM Plex Sans</st-option>
  </st-combobox>
</st-column>`,
  },

  // ---------- Structure ----------
  {
    id: "panel",
    title: "Panel with header and footer",
    covers: ["st-panel", "st-panel-header", "st-panel-footer", "st-badge"],
    html: `<st-panel style="width:280px;height:160px;border:1px solid var(--st-border-subtle)">
  <st-panel-header divided><st-heading>Layers</st-heading><st-spacer></st-spacer><st-badge tone="accent">3</st-badge></st-panel-header>
  <st-column padding="3" grow><st-text tone="muted">Panel content</st-text></st-column>
  <st-panel-footer><st-badge dot tone="success">Saved</st-badge><st-spacer></st-spacer><st-icon-button icon="plus" label="New layer" size="small"></st-icon-button></st-panel-footer>
</st-panel>`,
  },
  {
    id: "empty-state",
    title: "Empty state",
    covers: ["st-empty-state"],
    html: `<st-empty-state style="height:140px">
  <st-icon name="photo"></st-icon>
  <st-heading>No image open</st-heading>
  <st-text size="small">Drop a file or choose Open.</st-text>
</st-empty-state>`,
  },
  {
    id: "inspector",
    title: "Section and property rows",
    covers: ["st-section", "st-property-row"],
    html: `<st-column style="width:280px">
  <st-section heading="Layout" collapsible divided>
    <st-column gap="1.5">
      <st-property-row label="Position"><st-row gap="1.5"><st-number-field label="X" abbr="X" value="0"></st-number-field><st-number-field label="Y" abbr="Y" value="24"></st-number-field></st-row></st-property-row>
      <st-property-row label="Opacity"><st-slider label="Opacity" value="100"></st-slider></st-property-row>
    </st-column>
  </st-section>
</st-column>`,
  },
  {
    id: "tabs",
    title: "Tabs",
    covers: ["st-tabs", "st-tab", "st-tab-panel"],
    html: `<st-tabs value="design" label="Inspector" divided style="width:280px">
  <st-tab value="design">Design</st-tab>
  <st-tab value="prototype">Prototype</st-tab>
  <st-tab value="inspect">Inspect</st-tab>
  <st-tab-panel value="design"><st-text>Design properties</st-text></st-tab-panel>
  <st-tab-panel value="prototype"><st-text>Interactions</st-text></st-tab-panel>
  <st-tab-panel value="inspect"><st-text>Code</st-text></st-tab-panel>
</st-tabs>`,
  },
  {
    id: "menu",
    title: "Menu (click the button)",
    covers: ["st-menu", "st-menu-item", "st-menu-label"],
    html: `<st-button id="ex-menu-btn" icon-end="adjustments">Arrange</st-button>
<st-menu for="ex-menu-btn" label="Arrange">
  <st-menu-label>Order</st-menu-label>
  <st-menu-item shortcut="Mod+]">Bring forward</st-menu-item>
  <st-menu-item shortcut="Mod+[">Send backward</st-menu-item>
  <st-divider></st-divider>
  <st-menu-item type="checkbox" checked>Snap to pixels</st-menu-item>
  <st-menu-item tone="danger" icon="trash">Delete</st-menu-item>
</st-menu>`,
  },
  {
    id: "popover",
    title: "Popover",
    covers: ["st-popover"],
    html: `<st-button id="ex-pop-btn" icon="settings">Settings</st-button>
<st-popover for="ex-pop-btn" label="Export settings" placement="bottom-start">
  <st-column gap="2" padding="3" style="width:220px">
    <st-heading>Export</st-heading>
    <st-select label="Format" value="png"><st-option value="png">PNG</st-option><st-option value="jpg">JPG</st-option></st-select>
  </st-column>
</st-popover>`,
  },
  {
    id: "dialogs",
    title: "Dialog and alert dialog",
    covers: ["st-dialog", "st-alert-dialog"],
    html: `<st-row gap="2">
  <st-button onclick="this.parentElement.querySelector('st-dialog').open = true">Open dialog</st-button>
  <st-button tone="danger" kind="outline" onclick="this.parentElement.querySelector('st-alert-dialog').open = true">Delete…</st-button>
  <st-dialog heading="New document" width="small">
    <st-column gap="2"><st-text-field label="Name" value="Untitled"></st-text-field></st-column>
  </st-dialog>
  <st-alert-dialog heading="Delete 3 layers?" tone="danger" confirm-label="Delete">This can't be undone.</st-alert-dialog>
</st-row>`,
  },
  {
    id: "toast",
    title: "Toast",
    covers: ["st-toast", "st-toaster"],
    html: `<st-column gap="2" style="width:320px">
  <st-toast tone="success" duration="0" closable>Exported poster.png</st-toast>
  <st-toast duration="0" action-label="Undo">Layer deleted</st-toast>
  <st-toaster placement="bottom-end"></st-toaster>
</st-column>`,
  },
  {
    id: "progress",
    title: "Progress and spinner",
    covers: ["st-progress", "st-spinner"],
    html: `<st-row gap="3" style="width:300px">
  <st-progress label="Exporting" value="40" grow></st-progress>
  <st-spinner label="Loading"></st-spinner>
</st-row>`,
  },

  // ---------- Editor-grade ----------
  {
    id: "split",
    title: "Split panes",
    covers: ["st-split", "st-pane"],
    html: `<st-split style="height:140px;border:1px solid var(--st-border-subtle)">
  <st-pane size="160" min="100" collapsible><st-column padding="3"><st-text>Sidebar</st-text></st-column></st-pane>
  <st-pane><st-column padding="3"><st-text>Canvas</st-text></st-column></st-pane>
</st-split>`,
  },
  {
    id: "split-cards",
    title: "Card layout with collapsible panels",
    covers: ["st-split", "st-pane", "st-pane-toggle"],
    html: `<st-split kind="cards" style="height:220px">
  <st-pane size="180" min="140" collapsible label="Layers" icon="stack">
    <st-panel-header><st-heading>Layers</st-heading><st-spacer></st-spacer><st-pane-toggle></st-pane-toggle></st-panel-header>
    <st-column padding="3"><st-text tone="muted">Collapse me to a rail.</st-text></st-column>
  </st-pane>
  <st-pane><st-column padding="3"><st-text>Canvas</st-text></st-column></st-pane>
  <st-pane size="180" collapsible label="Inspector" icon="adjustments" collapsed>
    <st-panel-header><st-heading>Inspector</st-heading><st-spacer></st-spacer><st-pane-toggle></st-pane-toggle></st-panel-header>
  </st-pane>
</st-split>`,
  },
  {
    id: "tree",
    title: "Tree (layers)",
    covers: ["st-tree"],
    html: `<st-tree label="Layers" renamable reorderable style="height:150px;width:260px"></st-tree>`,
    setup: (root) => {
      const tree = $(root, "st-tree");
      tree.toggles = [
        {
          key: "visible",
          label: "Visibility",
          icon: "eye",
          offIcon: "eye-off",
          default: true,
          position: "start",
        },
      ];
      tree.items = [
        {
          id: "g",
          label: "Header",
          icon: "folder",
          expanded: true,
          children: [
            { id: "t", label: "Title", icon: "typography" },
            { id: "p", label: "Photo", icon: "photo", visible: false, muted: true },
          ],
        },
        { id: "bg", label: "Background", icon: "square" },
      ];
      tree.selection = ["t"];
    },
  },
  {
    id: "menubar",
    title: "Menubar",
    covers: ["st-menubar"],
    html: `<st-menubar label="Application">
  <st-menu label="File"><st-menu-item shortcut="Mod+N">New</st-menu-item><st-menu-item shortcut="Mod+S">Save</st-menu-item></st-menu>
  <st-menu label="Edit"><st-menu-item shortcut="Mod+Z">Undo</st-menu-item><st-menu-item shortcut="Mod+Shift+Z">Redo</st-menu-item></st-menu>
</st-menubar>`,
  },
  {
    id: "toolbox",
    title: "Toolbox with tool groups",
    covers: ["st-toolbox", "st-tool", "st-tool-group"],
    html: `<st-toolbox value="brush" label="Tools" columns="2" style="width:max-content">
  <st-tool value="move" icon="arrows-move" label="Move" shortcut="V"></st-tool>
  <st-tool-group label="Marquee">
    <st-tool value="rect" icon="square-dashed" label="Rectangular marquee" shortcut="M"></st-tool>
    <st-tool value="ellipse" icon="circle-dashed" label="Elliptical marquee" shortcut="M"></st-tool>
  </st-tool-group>
  <st-tool value="brush" icon="brush" label="Brush" shortcut="B"></st-tool>
  <st-tool value="type" icon="typography" label="Type" shortcut="T"></st-tool>
</st-toolbox>`,
  },
  {
    id: "color",
    title: "Color field, picker and swatches",
    covers: ["st-color-field", "st-color-picker", "st-color-swatch", "st-swatches"],
    html: `<st-row gap="4" y-align="start">
  <st-color-picker value="#3366cc" alpha></st-color-picker>
  <st-column gap="2">
    <st-color-field label="Fill" value="#ff8800" alpha></st-color-field>
    <st-color-swatch color="#22c55e" label="Green"></st-color-swatch>
    <st-swatches label="Swatches" value="#ef4444">
      <st-color-swatch color="#ef4444" label="Red"></st-color-swatch>
      <st-color-swatch color="#f59e0b" label="Amber"></st-color-swatch>
      <st-color-swatch color="#3b82f6" label="Blue"></st-color-swatch>
    </st-swatches>
  </st-column>
</st-row>`,
  },
  {
    id: "ruler",
    title: "Ruler",
    covers: ["st-ruler"],
    html: `<st-column gap="2" style="width:320px">
  <st-ruler zoom="2" offset="-20" marker="40"></st-ruler>
  <st-ruler zoom="20" format="time"></st-ruler>
</st-column>`,
  },
  {
    id: "audio",
    title: "Knob, meter, fader",
    covers: ["st-knob", "st-meter"],
    html: `<st-row gap="4" y-align="end">
  <st-knob label="Gain" value="60" show-value>Gain</st-knob>
  <st-knob label="Pan" value="-20" min="-50" max="50" bipolar show-value>Pan</st-knob>
  <st-slider label="Volume" orientation="vertical" value="70" style="height:90px"></st-slider>
  <st-meter label="Level" value="-9" peak="-4" style="height:90px"></st-meter>
</st-row>`,
  },
  {
    id: "command-palette",
    title: "Command palette (Mod+K)",
    covers: ["st-command-palette"],
    html: `<st-button onclick="this.nextElementSibling.open = true" icon="search">Commands…</st-button>
<st-command-palette placeholder="Type a command"></st-command-palette>`,
    setup: (root) => {
      $(root, "st-command-palette").commands = [
        { id: "new", label: "New file", shortcut: "Mod+N", group: "File" },
        { id: "flatten", label: "Flatten image", group: "Layer" },
        { id: "grid", label: "Show grid", shortcut: "Mod+'", group: "View" },
      ];
    },
  },

  // ---------- Kits ----------
  {
    id: "vector-field",
    title: "Vector field",
    covers: ["st-vector-field"],
    html: `<st-column gap="2" style="width:260px">
  <st-vector-field label="Position" value="120 80" unit="px"></st-vector-field>
  <st-vector-field label="Size" axes="w h" value="640 480" unit="px" linkable linked></st-vector-field>
</st-column>`,
  },
  {
    id: "inline-edit",
    title: "Inline edit (double-click)",
    covers: ["st-inline-edit"],
    html: `<st-inline-edit label="Layer name" value="Background"></st-inline-edit>`,
  },
  {
    id: "breadcrumbs",
    title: "Breadcrumbs",
    covers: ["st-breadcrumbs", "st-crumb"],
    html: `<st-breadcrumbs style="width:320px">
  <st-crumb icon="home" value="root">Projects</st-crumb>
  <st-crumb value="summer">Summer Sessions</st-crumb>
  <st-crumb value="images">Images</st-crumb>
</st-breadcrumbs>`,
  },
  {
    id: "zoom-control",
    title: "Zoom control",
    covers: ["st-zoom-control"],
    html: `<st-zoom-control value="66.7"></st-zoom-control>`,
  },
  {
    id: "imaging",
    title: "Curves, gradient, histogram",
    covers: ["st-curve-editor", "st-gradient-editor", "st-histogram"],
    html: `<st-row gap="4" y-align="start">
  <st-curve-editor label="Curves"></st-curve-editor>
  <st-column gap="3" style="width:240px">
    <st-gradient-editor label="Gradient"></st-gradient-editor>
    <st-histogram label="Histogram"></st-histogram>
  </st-column>
</st-row>`,
    setup: (root) => {
      const curve = $(root, "st-curve-editor");
      curve.points = [
        { x: 0, y: 0 },
        { x: 0.3, y: 0.2 },
        { x: 0.7, y: 0.85 },
        { x: 1, y: 1 },
      ];
      curve.histogram = bump(64, 28, 12);
      $(root, "st-gradient-editor").stops = [
        { offset: 0, color: "#1e1b4b" },
        { offset: 0.55, color: "#db2777" },
        { offset: 1, color: "#fbbf24" },
      ];
      $(root, "st-histogram").channels = {
        red: bump(64, 40, 10),
        green: bump(64, 30, 12),
        blue: bump(64, 20, 9),
      };
    },
  },
  {
    id: "data-table",
    title: "Data table",
    covers: ["st-data-table"],
    html: `<st-data-table label="Files" style="height:180px"></st-data-table>`,
    setup: (root) => {
      const table = $(root, "st-data-table");
      table.columns = [
        { key: "name", label: "Name", width: 180, sortable: true, editable: true },
        { key: "kind", label: "Kind", width: 90, sortable: true },
        {
          key: "size",
          label: "Size",
          width: 90,
          type: "number",
          sortable: true,
          format: (v: unknown) => `${v} KB`,
        },
      ];
      table.rows = [
        { id: "a", name: "cover.png", kind: "Image", size: 420 },
        { id: "b", name: "theme.wav", kind: "Audio", size: 8120 },
        { id: "c", name: "notes.md", kind: "Text", size: 4 },
        { id: "d", name: "intro.mp4", kind: "Video", size: 51200 },
      ];
      table.sort = { key: "name", direction: "ascending" };
      table.selection = ["b"];
    },
  },
  {
    id: "timeline",
    title: "Timeline",
    covers: ["st-timeline"],
    html: `<st-timeline label="Arrangement" zoom="20" playhead="3" style="height:140px"></st-timeline>`,
    setup: (root) => {
      const tl = $(root, "st-timeline");
      tl.trackToggles = [{ key: "muted", label: "Mute", text: "M" }];
      tl.tracks = [
        {
          id: "v",
          label: "Video",
          color: "#3b82f6",
          clips: [
            { id: "c1", start: 0, end: 6, label: "Intro" },
            { id: "c2", start: 7, end: 12, label: "Main" },
          ],
        },
        {
          id: "a",
          label: "Audio",
          color: "#22c55e",
          clips: [{ id: "c3", start: 1, end: 11, label: "Music" }],
          keyframes: [
            { id: "k1", time: 2 },
            { id: "k2", time: 8 },
          ],
        },
      ];
    },
  },
  {
    id: "dock",
    title: "Dock",
    covers: ["st-dock", "st-dock-panel"],
    html: `<st-dock label="Panels" style="height:260px;width:260px">
  <st-dock-panel name="color" label="Color" icon="palette" group="a"><st-column padding="3"><st-text>Color</st-text></st-column></st-dock-panel>
  <st-dock-panel name="swatches" label="Swatches" icon="grid-dots" group="a"><st-column padding="3"><st-text>Swatches</st-text></st-column></st-dock-panel>
  <st-dock-panel name="layers" label="Layers" icon="stack" group="b"><st-column padding="3"><st-text>Layers</st-text></st-column></st-dock-panel>
  <st-dock-panel name="history" label="History" icon="history" group="b"><st-column padding="3"><st-text>History</st-text></st-column></st-dock-panel>
</st-dock>`,
  },
  {
    id: "canvas",
    title: "Canvas: viewport, artboards, selection, measure",
    covers: ["st-viewport", "st-artboard", "st-transform-box", "st-measure"],
    html: `<st-viewport id="example-canvas" label="Example canvas" rulers grid="dots" snap marquee zoom="0.5" x="-40" y="-60" style="width:100%;height:320px">
  <st-artboard id="home" x="0" y="0" width="640" height="400" label="Home"></st-artboard>
  <st-artboard id="detail" x="720" y="0" width="360" height="400" label="Detail"></st-artboard>
  <st-transform-box slot="overlay" x="40" y="40" width="240" height="140" targets="card" rotatable label="Card"></st-transform-box>
  <st-measure slot="overlay" x1="280" y1="110" x2="400" y2="110"></st-measure>
</st-viewport>`,
    setup: (root) => {
      const vp = root.querySelector("st-viewport") as Any;
      vp.objects = [
        { id: "card", x: 40, y: 40, width: 240, height: 140 },
        { id: "chart", x: 400, y: 40, width: 200, height: 140 },
      ];
    },
  },
  {
    id: "minimap",
    title: "Minimap and zoom bound to a viewport",
    covers: ["st-minimap"],
    html: `<st-row gap="3" y-align="start" style="width:100%">
  <st-viewport id="mini-canvas" label="Board" grid="lines" style="flex:1;height:200px">
    <st-artboard x="0" y="0" width="800" height="500" label="Board"></st-artboard>
    <st-artboard x="900" y="200" width="400" height="300" label="Notes"></st-artboard>
  </st-viewport>
  <st-column gap="2">
    <st-minimap for="mini-canvas"></st-minimap>
    <st-zoom-control for="mini-canvas" size="small"></st-zoom-control>
  </st-column>
</st-row>`,
  },
];
