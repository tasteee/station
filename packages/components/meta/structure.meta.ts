import type { AttributeMeta, ElementMeta, EventMeta } from "./types.ts";

const a = (
  name: string,
  type: AttributeMeta["type"],
  description: string,
  extra: Partial<AttributeMeta> = {},
): AttributeMeta => ({
  name,
  property: name === "for" ? "for" : name.replace(/-([a-z])/g, (_, ch: string) => ch.toUpperCase()),
  type,
  description,
  ...extra,
});
const css = (
  name: string,
  type: AttributeMeta["type"],
  description: string,
  extra: Partial<AttributeMeta> = {},
) => ({
  name,
  type,
  description,
  ...extra,
});

const OPEN_CHANGE: EventMeta = {
  name: "openchange",
  type: "CustomEvent<{ open: boolean }>",
  description: "Opened or closed.",
};
const TONE_STATUS = ["accent", "danger", "warning", "success"] as const;
const PLACEMENT = [
  "top",
  "top-start",
  "top-end",
  "bottom",
  "bottom-start",
  "bottom-end",
  "left",
  "left-start",
  "left-end",
  "right",
  "right-start",
  "right-end",
] as const;
const SHOW_HIDE = [
  {
    name: "show",
    signature: "(anchor?: Element | { x: number; y: number }): void",
    description: "Open next to an element or at a viewport point. Defaults to the `for` element.",
  },
  { name: "hide", description: "Close." },
];

export const structure: ElementMeta[] = [
  // ---------- CSS-only ----------
  {
    tag: "st-panel",
    cssOnly: true,
    description: "Docked panel surface: flex column on the panel background.",
    attributes: [css("grow", "boolean", "Fill free space in a flex parent.")],
    slots: [{ name: "", description: "st-panel-header, content, st-panel-footer." }],
  },
  {
    tag: "st-panel-header",
    cssOnly: true,
    description: "Panel title row. Put an st-heading first, then actions.",
    attributes: [css("divided", "boolean", "Border below.")],
    slots: [{ name: "", description: "Heading and actions." }],
  },
  {
    tag: "st-panel-footer",
    cssOnly: true,
    description: "Panel bottom row with a top border.",
    attributes: [css("plain", "boolean", "No top border.")],
    slots: [{ name: "", description: "Status text and actions." }],
  },
  {
    tag: "st-badge",
    cssOnly: true,
    description: "Small count or status label.",
    attributes: [
      css("tone", TONE_STATUS, "Color meaning. Omit for neutral."),
      css("kind", ["soft", "solid"], "Weight.", { default: "soft" }),
      css("dot", "boolean", "A 6px status dot with no text."),
    ],
    slots: [{ name: "", description: "Text or count." }],
  },
  {
    tag: "st-empty-state",
    cssOnly: true,
    description: "Centered placeholder for empty lists: icon, heading, text, action.",
    attributes: [],
    slots: [{ name: "", description: "st-icon, st-heading, st-text, st-button." }],
  },
  {
    tag: "st-menu-label",
    cssOnly: true,
    description: "Group heading inside st-menu.",
    attributes: [],
    slots: [{ name: "", description: "Label text." }],
  },

  // ---------- Structure ----------
  {
    tag: "st-section",
    module: "@station/components/section",
    className: "Section",
    description: "Titled group inside a panel. Optionally collapsible.",
    attributes: [
      a("heading", "string", "Title text."),
      a("collapsible", "boolean", "Show a chevron and let the header toggle the body."),
      a("collapsed", "boolean", "Body hidden (only with collapsible)."),
      a("divided", "boolean", "Border below."),
    ],
    events: [OPEN_CHANGE],
    slots: [
      { name: "", description: "Body content." },
      { name: "heading", description: "Extra heading content (badges)." },
      { name: "actions", description: "Small buttons on the right of the header." },
    ],
    parts: [
      { name: "header", description: "Header row." },
      { name: "title", description: "Title (a button when collapsible)." },
      { name: "body", description: "Body wrapper." },
    ],
  },
  {
    tag: "st-property-row",
    module: "@station/components/property-row",
    className: "PropertyRow",
    description: "Inspector row: aligned label column + controls. Names unlabeled controls.",
    attributes: [a("label", "string", "Row label."), a("stacked", "boolean", "Label above the controls.")],
    slots: [
      { name: "", description: "Controls." },
      { name: "label", description: "Extra label content." },
    ],
    parts: [
      { name: "label", description: "Label cell." },
      { name: "controls", description: "Controls cell." },
    ],
    cssProperties: [{ name: "--st-property-label-width", description: "Label column width. Default 76px." }],
  },
  {
    tag: "st-tabs",
    module: "@station/components/tabs",
    className: "Tabs",
    description: "Tab bar + panels. Only the selected st-tab-panel renders.",
    attributes: [
      a("value", "string", "Selected tab value. Defaults to the first tab."),
      a("label", "string", "Accessible name for the tab list."),
      a("divided", "boolean", "Border under the tab bar."),
    ],
    events: [{ name: "change", description: "Selected tab changed." }],
    slots: [
      { name: "", description: "st-tab and st-tab-panel children (no slot attribute needed)." },
      { name: "actions", description: "Buttons at the end of the tab bar." },
    ],
    parts: [
      { name: "bar", description: "Tab bar." },
      { name: "list", description: "The tablist." },
      { name: "panel", description: "Panel area." },
    ],
  },
  {
    tag: "st-tab",
    module: "@station/components/tab",
    className: "TabItem",
    description: "One tab in st-tabs.",
    attributes: [
      a("value", "string", "Matches an st-tab-panel value."),
      a("icon", "string", "Icon name."),
      a("selected", "boolean", "Set by st-tabs."),
      a("disabled", "boolean", "Not selectable."),
    ],
    slots: [{ name: "", description: "Tab label." }],
  },
  {
    tag: "st-tab-panel",
    module: "@station/components/tab-panel",
    className: "TabPanel",
    description: "Content for the st-tab with the same value.",
    attributes: [a("value", "string", "Matches an st-tab value.")],
    slots: [{ name: "", description: "Panel content." }],
  },

  // ---------- Menus + popover ----------
  {
    tag: "st-menu",
    module: "@station/components/menu",
    className: "Menu",
    description:
      'Menu in the top layer. `for` wires a trigger; `trigger="contextmenu"` opens at the pointer on right-click. Nest an st-menu in an st-menu-item for a submenu.',
    attributes: [
      a("for", "string", "Id of the trigger element (same document or shadow root)."),
      a("trigger", ["click", "contextmenu"], "How the `for` element opens it.", { default: "click" }),
      a("placement", PLACEMENT, "Preferred side.", { default: "bottom-start" }),
      a("label", "string", "Accessible name."),
      a("open", "boolean", "Reflects whether it is open."),
    ],
    methods: SHOW_HIDE,
    events: [
      OPEN_CHANGE,
      {
        name: "select",
        type: "CustomEvent<{ value: string; checked: boolean }>",
        description: "An item was chosen (bubbles from st-menu-item).",
      },
    ],
    slots: [{ name: "", description: "st-menu-item, st-menu-label, st-divider." }],
  },
  {
    tag: "st-menu-item",
    module: "@station/components/menu-item",
    className: "MenuItem",
    description:
      "Command in st-menu. Checkable with type=checkbox|radio. A child st-menu becomes its submenu.",
    attributes: [
      a("value", "string", "Reported in the select event. Defaults to the text."),
      a("icon", "string", "Leading icon name."),
      a("shortcut", "string", 'Shortcut shown on the right, e.g. "Mod+D".'),
      a("type", ["normal", "checkbox", "radio"], "Checkable behavior.", { default: "normal" }),
      a("group", "string", "Radio group name within one menu."),
      a("checked", "boolean", "Checked state for checkbox/radio items."),
      a("tone", ["danger"], "Destructive command."),
      a("disabled", "boolean", "Not selectable; skipped by arrow keys."),
      a("keep-open", "boolean", "Don't close the menu when chosen."),
    ],
    events: [
      { name: "select", type: "CustomEvent<{ value: string; checked: boolean }>", description: "Chosen." },
    ],
    slots: [{ name: "", description: "Label text, optionally followed by a nested st-menu." }],
  },
  {
    tag: "st-popover",
    module: "@station/components/popover",
    className: "Popover",
    description: "Floating panel for rich content. Light-dismiss and Escape close it.",
    attributes: [
      a("for", "string", "Id of the trigger element."),
      a("placement", PLACEMENT, "Preferred side.", { default: "bottom" }),
      a("label", "string", "Accessible name."),
      a("open", "boolean", "Open state. Set it to open against the `for` element."),
    ],
    methods: SHOW_HIDE,
    events: [OPEN_CHANGE],
    slots: [{ name: "", description: "Content." }],
  },

  // ---------- Dialogs ----------
  {
    tag: "st-dialog",
    module: "@station/components/dialog",
    className: "Dialog",
    description: "Modal dialog on native <dialog>: focus trap, inert page, top layer.",
    attributes: [
      a("open", "boolean", "Open state."),
      a("heading", "string", "Title."),
      a("width", ["small", "medium", "large"], "320 / 440 / 640px.", { default: "medium" }),
      a("persistent", "boolean", "Escape and backdrop clicks don't close it."),
    ],
    methods: [
      { name: "show", description: "Open." },
      { name: "close", description: "Close." },
    ],
    events: [OPEN_CHANGE],
    slots: [
      { name: "", description: "Body." },
      { name: "heading", description: "Extra heading content." },
      { name: "header-actions", description: "Buttons next to the close button." },
      { name: "footer", description: "Actions, right-aligned." },
    ],
    parts: [
      { name: "dialog", description: "The <dialog>." },
      { name: "header", description: "Header." },
      { name: "body", description: "Scrolling body." },
      { name: "footer", description: "Footer." },
    ],
  },
  {
    tag: "st-alert-dialog",
    module: "@station/components/alert-dialog",
    className: "AlertDialog",
    description: "Confirmation dialog. Focus starts on Cancel. Or use confirm() from @station/components.",
    attributes: [
      a("open", "boolean", "Open state."),
      a("heading", "string", 'Question, e.g. "Delete 3 layers?".'),
      a("confirm-label", "string", "Confirm button text.", { default: "Confirm" }),
      a("cancel-label", "string", "Cancel button text.", { default: "Cancel" }),
      a("tone", ["danger"], "Destructive confirm button."),
    ],
    events: [
      { name: "confirm", description: "Confirm chosen." },
      { name: "cancel", description: "Cancelled (button or Escape)." },
      OPEN_CHANGE,
    ],
    slots: [
      { name: "", description: "Explanation." },
      { name: "heading", description: "Extra heading content." },
    ],
  },

  // ---------- Feedback ----------
  {
    tag: "st-toast",
    module: "@station/components/toast",
    className: "Toast",
    description: "Temporary message. Usually created with toast() from @station/components.",
    attributes: [
      a("tone", TONE_STATUS, "Status dot color."),
      a("duration", "number", "Milliseconds before it hides. 0 = stays.", { default: 4000 }),
      a("closable", "boolean", "Show a dismiss button."),
      a("action-label", "string", "Show an action button with this text."),
    ],
    methods: [{ name: "dismiss", description: "Hide it now." }],
    events: [
      { name: "action", description: "Action button pressed." },
      { name: "close", description: "Removed." },
    ],
    slots: [
      { name: "", description: "Message." },
      { name: "action", description: "Custom action content." },
    ],
  },
  {
    tag: "st-toaster",
    module: "@station/components/toaster",
    className: "Toaster",
    description: "Where toasts stack. Created on demand; add one to choose placement.",
    attributes: [
      a("placement", ["bottom", "bottom-end", "top", "top-end"], "Screen position.", { default: "bottom" }),
    ],
    slots: [{ name: "", description: "st-toast elements." }],
  },
  {
    tag: "st-progress",
    module: "@station/components/progress",
    className: "Progress",
    description: "Linear progress bar. Omit value for indeterminate.",
    attributes: [
      a("value", "number", "Current value."),
      a("max", "number", "Maximum.", { default: 100 }),
      a("label", "string", "Accessible name."),
      a("tone", ["success", "danger"], "Fill color. Omit for accent."),
    ],
    parts: [{ name: "fill", description: "The filled bar." }],
  },
  {
    tag: "st-spinner",
    module: "@station/components/spinner",
    className: "Spinner",
    description: "Loading spinner sized by --st-icon-size.",
    attributes: [a("label", "string", "Accessible name.", { default: "Loading" })],
  },
];
