import type { AttributeMeta, ElementMeta } from "./types.ts";

const SPACE = ["0", "0.5", "1", "1.5", "2", "2.5", "3", "4", "5", "6", "8", "10", "12"] as const;

const padding: AttributeMeta[] = [
  { name: "padding", type: SPACE, description: "Padding on all sides. Steps × --st-unit." },
  { name: "padding-x", type: SPACE, description: "Horizontal padding (padding-inline)." },
  { name: "padding-y", type: SPACE, description: "Vertical padding (padding-block)." },
];

const flexChild: AttributeMeta[] = [
  { name: "grow", type: "boolean", description: "Fill the remaining space in a flex parent." },
  { name: "shrink", type: ["none"], description: 'shrink="none" stops the element from shrinking.' },
];

const flexContainer: AttributeMeta[] = [
  { name: "gap", type: SPACE, description: "Gap between children. Steps × --st-unit." },
  ...padding,
  { name: "wrap", type: "boolean", description: "Let children wrap onto new lines." },
  { name: "inline", type: "boolean", description: "Use inline-flex instead of flex." },
  ...flexChild,
];

const TONE = ["strong", "muted", "faint", "accent", "signal", "danger", "warning", "success"] as const;

export const foundations: ElementMeta[] = [
  {
    tag: "st-box",
    cssOnly: true,
    description: "Plain flex container. No alignment opinions.",
    attributes: flexContainer,
    slots: [{ name: "", description: "Children." }],
  },
  {
    tag: "st-row",
    cssOnly: true,
    description: "Horizontal flex container. x-align → justify-content, y-align → align-items.",
    attributes: [
      {
        name: "x-align",
        type: ["start", "center", "end", "between", "around", "evenly"],
        default: "start",
        description: "Horizontal alignment of children.",
      },
      {
        name: "y-align",
        type: ["start", "center", "end", "stretch", "baseline"],
        default: "center",
        description: "Vertical alignment of children.",
      },
      ...flexContainer,
    ],
    slots: [{ name: "", description: "Children." }],
  },
  {
    tag: "st-column",
    cssOnly: true,
    description: "Vertical flex container. x-align → align-items, y-align → justify-content.",
    attributes: [
      {
        name: "x-align",
        type: ["start", "center", "end", "stretch"],
        default: "stretch",
        description: "Horizontal alignment of children.",
      },
      {
        name: "y-align",
        type: ["start", "center", "end", "between", "around", "evenly"],
        default: "start",
        description: "Vertical alignment of children.",
      },
      ...flexContainer,
    ],
    slots: [{ name: "", description: "Children." }],
  },
  {
    tag: "st-spacer",
    cssOnly: true,
    description: "Takes all free space in a row or column, pushing siblings apart.",
    attributes: [],
  },
  {
    tag: "st-divider",
    cssOnly: true,
    description: "1px line. Horizontal by default, vertical inside st-row / st-box.",
    attributes: [
      {
        name: "orientation",
        type: ["horizontal", "vertical"],
        description: "Force a direction instead of inferring it from the parent.",
      },
      { name: "tone", type: ["strong"], description: "Use the stronger border color." },
    ],
  },
  {
    tag: "st-text",
    cssOnly: true,
    description: "Inline text on the contrast ladder.",
    attributes: [
      { name: "tone", type: TONE, description: "Text color. Omit for body text." },
      { name: "size", type: ["small", "medium", "large"], default: "medium", description: "Font size step." },
      { name: "weight", type: ["normal", "medium", "strong"], description: "Font weight." },
      { name: "mono", type: "boolean", description: "Monospace font." },
      { name: "numeric", type: "boolean", description: "Fixed-width digits that don't jitter (DM Mono)." },
      { name: "truncate", type: "boolean", description: "Single line with an ellipsis." },
      ...flexChild,
    ],
    slots: [{ name: "", description: "Text." }],
  },
  {
    tag: "st-heading",
    cssOnly: true,
    description: "Panel and section titles. Strongest text color by default.",
    attributes: [
      { name: "tone", type: TONE, default: "strong", description: "Text color." },
      { name: "size", type: ["small", "medium", "large"], default: "medium", description: "Font size step." },
      {
        name: "weight",
        type: ["normal", "medium", "strong"],
        default: "strong",
        description: "Font weight.",
      },
      { name: "truncate", type: "boolean", description: "Single line with an ellipsis." },
    ],
    slots: [{ name: "", description: "Title text." }],
  },
  {
    tag: "st-surface",
    cssOnly: true,
    description: "A background level. Hierarchy comes from surfaces, not shadows.",
    attributes: [
      {
        name: "level",
        type: ["canvas", "panel", "section", "well"],
        default: "panel",
        description: "Which surface color to use.",
      },
      { name: "bordered", type: "boolean", description: "1px subtle border." },
      {
        name: "rounded",
        type: ["", "small", "large"],
        description: "Round the corners. Empty = radius-3, small = radius-2, large = radius-5 (cards).",
      },
      ...padding,
      ...flexChild,
    ],
    slots: [{ name: "", description: "Content." }],
  },
  {
    tag: "st-scroll-area",
    cssOnly: true,
    description:
      'Scroll container with thin, quiet scrollbars. If nothing inside is focusable, add tabindex="0", role="region" and aria-label so keyboard users can scroll it.',
    attributes: [
      { name: "axis", type: ["x", "y"], description: "Limit scrolling to one axis. Omit for both." },
      ...padding,
      ...flexChild,
    ],
    slots: [{ name: "", description: "Scrollable content." }],
  },
  {
    tag: "st-icon",
    module: "@station/components/icon",
    className: "Icon",
    description: "Renders a registered icon. Sized by --st-icon-size, colored by currentColor.",
    attributes: [
      { name: "name", property: "name", type: "string", description: "Registered icon name." },
      {
        name: "label",
        property: "label",
        type: "string",
        description: "Accessible label. Leave empty for decorative icons.",
      },
    ],
    parts: [{ name: "svg", description: "The SVG element." }],
    cssProperties: [
      { name: "--st-icon-size", description: "Width and height." },
      { name: "--st-icon-stroke", description: "Stroke width in 24px grid units." },
    ],
  },
  {
    tag: "st-kbd",
    module: "@station/components/kbd",
    className: "Kbd",
    description: "Keyboard shortcut, formatted for the user's platform.",
    attributes: [
      {
        name: "shortcut",
        property: "shortcut",
        type: "string",
        description: 'Shortcut like "Mod+Shift+D". Mod = ⌘ on Mac, Ctrl elsewhere.',
      },
      {
        name: "kind",
        property: "kind",
        type: ["plain", "boxed"],
        default: "plain",
        description: "plain = muted text, boxed = key caps.",
      },
    ],
    slots: [{ name: "", description: "Fallback content when no shortcut is set." }],
    parts: [{ name: "key", description: "Each key." }],
  },
];
