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

const KIND = a(
  "kind",
  ["solid", "outline", "ghost"],
  "Visual weight. Inherited from st-button-group / st-toolbar when unset.",
);
const TONE = a("tone", ["accent", "danger"], "Color meaning. Omit for neutral.");
const DISABLED = a("disabled", "boolean", "Not interactive; removed from the tab order.");
const LABEL_REQUIRED = a(
  "label",
  "string",
  "Accessible name. Also shown as the tooltip. Required for icon-only controls.",
);
const SHORTCUT = a("shortcut", "string", 'Keyboard shortcut shown in the tooltip, e.g. "Mod+D".');
const NAME = a("name", "string", "Form field name.");
const REQUIRED = a("required", "boolean", "Must have a value for the form to submit.");
const READONLY = a("readonly", "boolean", "Focusable and selectable, but not editable.");
const FIELD_KIND = a("kind", ["filled", "outline", "ghost"], "Field chrome.", { default: "filled" });
const FIELD_LABEL = a("label", "string", "Accessible name. Use when there is no visible <label>.");
const PLACEHOLDER = a("placeholder", "string", "Hint text when empty.");

const INPUT: EventMeta = {
  name: "input",
  description: "Value changed (while typing, dragging or stepping).",
};
const CHANGE: EventMeta = { name: "change", description: "Value committed." };
const DEFAULT_SLOT = { name: "", description: "Label content." };

export const controls: ElementMeta[] = [
  // ---------- Buttons ----------
  {
    tag: "st-button",
    module: "@station/components/button",
    className: "Button",
    formAssociated: true,
    description: "Text button. Host is the button: focusable, Enter/Space activate, submits forms.",
    attributes: [
      { ...KIND, default: "outline" },
      TONE,
      SIZE,
      DISABLED,
      a("loading", "boolean", "Shows a spinner and blocks clicks."),
      a("type", ["button", "submit", "reset"], "Form behavior.", { default: "button" }),
      a("icon", "string", "Leading icon name."),
      a("icon-end", "string", "Trailing icon name."),
      a("block", "boolean", "Fill the container width."),
    ],
    slots: [
      DEFAULT_SLOT,
      { name: "start", description: "Content before the label." },
      { name: "end", description: "Content after the label." },
    ],
  },
  {
    tag: "st-icon-button",
    module: "@station/components/icon-button",
    className: "IconButton",
    description: "Square icon-only button. `label` is its name and tooltip.",
    attributes: [
      a("icon", "string", "Icon name."),
      LABEL_REQUIRED,
      SHORTCUT,
      { ...KIND, default: "ghost" },
      TONE,
      SIZE,
      DISABLED,
      a("tooltip-placement", ["top", "bottom", "left", "right"], "Where the tooltip appears.", {
        default: "bottom",
      }),
    ],
    slots: [{ name: "", description: "Custom icon content when `icon` is not set." }],
  },
  {
    tag: "st-toggle-button",
    module: "@station/components/toggle-button",
    className: "ToggleButton",
    description: "On/off button (aria-pressed). Icon-only when it has an icon and no text.",
    attributes: [
      a("pressed", "boolean", "On state."),
      a("icon", "string", "Icon name."),
      a("label", "string", "Accessible name and tooltip for icon-only toggles."),
      SHORTCUT,
      { ...KIND, default: "ghost" },
      a("tone", ["accent"], "accent = strong inverted pressed state (tools)."),
      SIZE,
      DISABLED,
    ],
    events: [CHANGE],
    slots: [DEFAULT_SLOT],
  },
  {
    tag: "st-button-group",
    module: "@station/components/button-group",
    className: "ButtonGroup",
    description: "Groups buttons. Children inherit kind and size. `attached` joins them.",
    attributes: [
      a("kind", ["solid", "outline", "ghost"], "Kind for children that don't set one."),
      SIZE,
      a("attached", "boolean", "Join children into one strip."),
      a("label", "string", "Accessible group name."),
    ],
    slots: [{ name: "", description: "Buttons." }],
  },
  {
    tag: "st-toolbar",
    module: "@station/components/toolbar",
    className: "Toolbar",
    description: "role=toolbar with one tab stop; arrow keys move between buttons.",
    attributes: [
      a("kind", ["solid", "outline", "ghost"], "Kind for child buttons.", { default: "ghost" }),
      SIZE,
      a("label", "string", "Accessible toolbar name."),
      a("orientation", ["horizontal", "vertical"], "Layout and arrow-key direction.", {
        default: "horizontal",
      }),
    ],
    slots: [{ name: "", description: "Buttons, toggles, dividers." }],
  },
  {
    tag: "st-segmented-control",
    module: "@station/components/segmented-control",
    className: "SegmentedControl",
    formAssociated: true,
    description: "Pick one of a few options (radiogroup). Arrow keys move and select.",
    attributes: [
      a("value", "string", "Selected segment value."),
      NAME,
      a("label", "string", "Accessible name."),
      SIZE,
      DISABLED,
      a("block", "boolean", "Fill the width; segments share it equally."),
    ],
    events: [INPUT, CHANGE],
    slots: [{ name: "", description: "st-segment elements." }],
  },
  {
    tag: "st-segment",
    module: "@station/components/segment",
    className: "Segment",
    description: "One option in st-segmented-control.",
    attributes: [
      a("value", "string", "Value reported when selected."),
      a("icon", "string", "Icon name."),
      a("label", "string", "Accessible name and tooltip for icon-only segments."),
      a("selected", "boolean", "Set by the parent control."),
      DISABLED,
    ],
    slots: [DEFAULT_SLOT],
  },
  {
    tag: "st-tooltip",
    module: "@station/components/tooltip",
    className: "Tooltip",
    description: "Adds a tooltip to its first child. Icon buttons have tooltips built in.",
    attributes: [
      a("label", "string", "Tooltip text."),
      SHORTCUT,
      a("placement", ["top", "bottom", "left", "right"], "Preferred side.", { default: "bottom" }),
    ],
    slots: [{ name: "", description: "The element that gets the tooltip." }],
  },

  // ---------- Fields ----------
  ...(["st-text-field", "st-search-field"] as const).map(
    (tag): ElementMeta => ({
      tag,
      module: `@station/components/${tag.slice(3)}`,
      className: tag === "st-text-field" ? "TextField" : "SearchField",
      formAssociated: true,
      description:
        tag === "st-text-field"
          ? "Single-line text input."
          : "Search input with a leading glyph and clear button. Escape clears.",
      attributes: [
        a("value", "string", "Current text."),
        PLACEHOLDER,
        NAME,
        FIELD_LABEL,
        FIELD_KIND,
        SIZE,
        a("icon", "string", "Leading icon name."),
        a("type", ["text", "password", "email", "url", "tel"], "Input type.", { default: "text" }),
        DISABLED,
        READONLY,
        REQUIRED,
        a("invalid", "boolean", "Show the error border."),
        a("clearable", "boolean", "Show a clear button when there is text."),
        a("autocomplete", "string", "Browser autofill hint."),
        a("maxlength", "number", "Maximum length."),
      ],
      events: [INPUT, CHANGE],
      slots: [
        { name: "start", description: "Content before the input." },
        { name: "end", description: "Content after the input." },
      ],
      parts: [{ name: "input", description: "The inner <input>." }],
    }),
  ),
  {
    tag: "st-textarea",
    module: "@station/components/textarea",
    className: "Textarea",
    formAssociated: true,
    description: "Multi-line text that grows with its content.",
    attributes: [
      a("value", "string", "Current text."),
      PLACEHOLDER,
      NAME,
      FIELD_LABEL,
      FIELD_KIND,
      SIZE,
      a("rows", "number", "Minimum visible rows.", { default: 3 }),
      a("max-rows", "number", "Rows before scrolling.", { default: 12 }),
      DISABLED,
      READONLY,
      REQUIRED,
      a("invalid", "boolean", "Show the error border."),
    ],
    events: [INPUT, CHANGE],
    parts: [{ name: "input", description: "The inner <textarea>." }],
  },
  {
    tag: "st-number-field",
    module: "@station/components/number-field",
    className: "NumberField",
    formAssociated: true,
    description:
      "Numeric input for inspectors: drag the prefix to scrub, ↑/↓ step (Shift ×10, Alt ×0.1), type math, Enter commits, Escape reverts.",
    attributes: [
      a("value", "number", "Current number."),
      a("min", "number", "Lowest allowed value."),
      a("max", "number", "Highest allowed value."),
      a("step", "number", "Arrow-key and scrub increment.", { default: 1 }),
      a("precision", "number", "Decimal places kept. Defaults to the step's precision + 1 (max 3)."),
      a("unit", "string", 'Suffix like "px" or "°". Accepted when typed.'),
      a("label", "string", "Accessible name."),
      a("prefix", "string", 'Short text at the start ("W", "X"). Drag it to scrub.'),
      a("icon", "string", "Icon at the start instead of prefix text. Drag it to scrub."),
      NAME,
      PLACEHOLDER,
      FIELD_KIND,
      SIZE,
      a("mixed", "boolean", 'Show "Mixed" when a multi-selection has different values.'),
      DISABLED,
      READONLY,
    ],
    events: [
      { name: "input", description: "Value changed live (scrubbing, arrow keys)." },
      { name: "change", description: "Value committed (Enter, blur, end of scrub)." },
    ],
    parts: [
      { name: "input", description: "The inner <input>." },
      { name: "prefix", description: "The scrub handle." },
    ],
  },

  // ---------- Choices ----------
  ...(["st-checkbox", "st-switch"] as const).map(
    (tag): ElementMeta => ({
      tag,
      module: `@station/components/${tag.slice(3)}`,
      className: tag === "st-checkbox" ? "Checkbox" : "Switch",
      formAssociated: true,
      description: tag === "st-checkbox" ? "Checkbox with a text label." : "On/off switch with a text label.",
      attributes: [
        a("checked", "boolean", "On state."),
        ...(tag === "st-checkbox"
          ? [a("indeterminate", "boolean", "Partially checked (dash). Cleared on toggle.")]
          : []),
        DISABLED,
        REQUIRED,
        NAME,
        a("value", "string", "Form value when checked.", { default: "on" }),
        SIZE,
      ],
      events: [INPUT, CHANGE],
      slots: [DEFAULT_SLOT],
      parts: [
        { name: "control", description: "The box or track." },
        ...(tag === "st-switch" ? [{ name: "thumb", description: "The knob." }] : []),
      ],
    }),
  ),
  {
    tag: "st-radio-group",
    module: "@station/components/radio-group",
    className: "RadioGroup",
    formAssociated: true,
    description: "Single choice from st-radio children. Arrow keys move and select.",
    attributes: [
      a("value", "string", "Selected radio value."),
      NAME,
      a("label", "string", "Accessible name."),
      a("orientation", ["vertical", "horizontal"], "Layout.", { default: "vertical" }),
      REQUIRED,
      DISABLED,
      SIZE,
    ],
    events: [INPUT, CHANGE],
    slots: [{ name: "", description: "st-radio elements." }],
  },
  {
    tag: "st-radio",
    module: "@station/components/radio",
    className: "Radio",
    description: "One option in st-radio-group.",
    attributes: [
      a("value", "string", "Value reported when selected."),
      a("checked", "boolean", "Set by the group."),
      DISABLED,
    ],
    slots: [DEFAULT_SLOT],
    parts: [{ name: "control", description: "The circle." }],
  },
  {
    tag: "st-slider",
    module: "@station/components/slider",
    className: "Slider",
    formAssociated: true,
    description: "Pick a number by dragging. Arrows step (Shift ×10), PageUp/Down, Home/End.",
    attributes: [
      a("value", "number", "Current value."),
      a("min", "number", "Minimum.", { default: 0 }),
      a("max", "number", "Maximum.", { default: 100 }),
      a("step", "number", "Increment.", { default: 1 }),
      a("label", "string", "Accessible name."),
      NAME,
      SIZE,
      DISABLED,
    ],
    events: [INPUT, CHANGE],
    parts: [
      { name: "track", description: "The rail." },
      { name: "fill", description: "The filled part." },
      { name: "thumb", description: "The handle." },
    ],
  },
  {
    tag: "st-range-slider",
    module: "@station/components/range-slider",
    className: "RangeSlider",
    formAssociated: true,
    description: "Pick a range with two thumbs. Thumbs can't cross.",
    attributes: [
      a("start", "number", "Lower value."),
      a("end", "number", "Upper value."),
      a("min", "number", "Minimum.", { default: 0 }),
      a("max", "number", "Maximum.", { default: 100 }),
      a("step", "number", "Increment.", { default: 1 }),
      a("label", "string", "Accessible name prefix for both thumbs."),
      NAME,
      SIZE,
      DISABLED,
    ],
    events: [INPUT, CHANGE],
    parts: [
      { name: "track", description: "The rail." },
      { name: "fill", description: "The selected range." },
      { name: "thumb", description: "Each handle." },
    ],
  },
  {
    tag: "st-select",
    module: "@station/components/select",
    className: "Select",
    formAssociated: true,
    description: "Pick one value from st-option children. Typeahead works open or closed.",
    attributes: [
      a("value", "string", "Selected option value."),
      a("placeholder", "string", "Shown when nothing is selected.", { default: "Select…" }),
      a("label", "string", "Accessible name."),
      NAME,
      FIELD_KIND,
      SIZE,
      REQUIRED,
      DISABLED,
    ],
    events: [INPUT, CHANGE],
    slots: [{ name: "", description: "st-option and st-divider elements." }],
    parts: [
      { name: "value", description: "The selected label." },
      { name: "listbox", description: "The popup list." },
    ],
  },
  {
    tag: "st-option",
    module: "@station/components/option",
    className: "Option",
    description: "One choice in st-select or st-combobox.",
    attributes: [
      a("value", "string", "Value. Defaults to the label."),
      a("label", "string", "Text used for display and typeahead. Defaults to the text content."),
      a("icon", "string", "Icon name."),
      a("selected", "boolean", "Set by the parent."),
      DISABLED,
    ],
    slots: [DEFAULT_SLOT, { name: "end", description: "Trailing content, like a shortcut or count." }],
  },
  {
    tag: "st-combobox",
    module: "@station/components/combobox",
    className: "Combobox",
    formAssociated: true,
    description: "Text input with a filtered list of st-option children.",
    attributes: [
      a("value", "string", "Selected option value (or custom text with allow-custom)."),
      PLACEHOLDER,
      a("label", "string", "Accessible name."),
      NAME,
      FIELD_KIND,
      SIZE,
      a("allow-custom", "boolean", "Accept text that isn't one of the options."),
      a("empty-text", "string", "Shown when nothing matches.", { default: "No results" }),
      REQUIRED,
      DISABLED,
    ],
    events: [INPUT, CHANGE],
    slots: [{ name: "", description: "st-option elements." }],
    parts: [
      { name: "input", description: "The inner <input>." },
      { name: "listbox", description: "The popup list." },
    ],
  },
];
