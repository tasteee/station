import type { AttributeMeta, ElementMeta } from "./types.ts";

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

const MARK = {
  name: "--st-canvas-mark",
  description: "Color of canvas marks (guides, selection, marquee). Default --st-signal.",
};

export const canvas: ElementMeta[] = [
  {
    tag: "st-viewport",
    module: "@station/components/viewport",
    className: "Viewport",
    description:
      'Pan-and-zoom canvas. Children sit in document coordinates; slot="overlay" children draw in screen space. Wheel pans, Mod+wheel or pinch zooms to the cursor, Space/middle-drag pans, +/− zoom, Shift+0 = 100%, Shift+1 = fit. Drag out of a ruler for a guide; drag it back to delete. The view is published as --st-view-zoom / --st-view-x / --st-view-y.',
    attributes: [
      a("zoom", "number", "Zoom factor (1 = 100%).", { default: 1 }),
      a("x", "number", "Document x at the left edge of the view.", { default: 0 }),
      a("y", "number", "Document y at the top edge of the view.", { default: 0 }),
      a("min-zoom", "number", "Smallest zoom.", { default: 0.01 }),
      a("max-zoom", "number", "Largest zoom.", { default: 64 }),
      a("rulers", "boolean", "Show rulers (and drag guides out of them)."),
      a("grid", ["dots", "lines", "none"], "Background grid. Its spacing doubles as you zoom out."),
      a("grid-size", "number", "Grid spacing in document units.", { default: 8 }),
      a("snap", "boolean", "Snap transform boxes to objects, artboards and guides; draws snap lines."),
      a("snap-grid", "boolean", "Also snap to the grid."),
      a("marquee", "boolean", "Drag on empty canvas to select objects."),
      a("tool", ["hand"], "hand = left-drag pans."),
      a("autosave", "string", "Remember the view and guides in localStorage under this key."),
      a("label", "string", "Accessible name.", { default: "Canvas" }),
    ],
    properties: [
      {
        name: "objects",
        type: "CanvasObject[]",
        description: "The app's objects as rects, for fit, snapping, marquee and the minimap.",
      },
      { name: "guides", type: "CanvasGuide[]", description: "Ruler guides." },
    ],
    methods: [
      {
        name: "fit",
        signature: "(rect?: CanvasRect, padding?: number): void",
        description: "Fit a rect (default: all content).",
      },
      {
        name: "zoomTo",
        signature: "(zoom: number, clientX?: number, clientY?: number): void",
        description: "Zoom around a screen point (default: center).",
      },
      { name: "panBy", signature: "(dx: number, dy: number): void", description: "Pan by document units." },
      {
        name: "toDocument",
        signature: "(clientX: number, clientY: number): { x: number; y: number }",
        description: "Screen point → document point.",
      },
      {
        name: "toClient",
        signature: "(x: number, y: number): { x: number; y: number }",
        description: "Document point → screen point.",
      },
      {
        name: "contentBounds",
        signature: "(): CanvasRect | null",
        description: "Bounds of objects and artboards.",
      },
      {
        name: "contentRects",
        signature: "(): CanvasObject[]",
        description: "Objects and artboards as rects.",
      },
      { name: "viewRect", signature: "(): CanvasRect", description: "The visible area in document units." },
      {
        name: "snapRect",
        signature: "(rect: CanvasRect, exclude?: string[]): CanvasRect",
        description: "Snap a rect (when snap is on) and draw snap lines.",
      },
      { name: "clearSnapLines", description: "Hide snap lines." },
    ],
    events: [
      { name: "viewchange", type: "CustomEvent<CanvasView>", description: "Zoom or pan changed." },
      {
        name: "guidechange",
        type: "CustomEvent<{ guides: CanvasGuide[] }>",
        description: "A guide was added, moved or removed.",
      },
      {
        name: "marquee",
        type: "CustomEvent<CanvasRect & { ids: string[] }>",
        description: "Marquee dragging; ids = objects it touches.",
      },
      {
        name: "select",
        type: "CustomEvent<{ ids: string[]; add: boolean }>",
        description: "Marquee released or empty canvas clicked (ids = []). add = Shift held.",
      },
      { name: "contentchange", description: "Objects or artboards changed (for minimaps)." },
    ],
    slots: [
      { name: "", description: "Content in document coordinates (st-artboard, your own elements)." },
      { name: "overlay", description: "Screen-space overlays: st-transform-box, st-measure." },
    ],
    parts: [
      { name: "world", description: "The transformed document layer." },
      { name: "grid", description: "The background grid." },
      { name: "ruler", description: "Each ruler." },
      { name: "corner", description: "The corner between rulers." },
      { name: "marquee", description: "The marquee rectangle." },
    ],
    cssProperties: [MARK],
  },
  {
    tag: "st-transform-box",
    module: "@station/components/transform-box",
    className: "TransformBox",
    description:
      "Selection handles in an st-viewport overlay. Drag inside to move, handles to resize, the knob to rotate. Shift keeps proportions (15° steps when rotating), Alt resizes from the center. Arrows nudge (Shift ×10), Alt+arrows resize. Snaps when the viewport has snap. It moves itself and reports; the app updates its objects.",
    attributes: [
      a("x", "number", "Left, document units (unrotated box).", { default: 0 }),
      a("y", "number", "Top, document units.", { default: 0 }),
      a("width", "number", "Width, document units.", { default: 0 }),
      a("height", "number", "Height, document units.", { default: 0 }),
      a("rotation", "number", "Degrees about the center.", { default: 0 }),
      a("rotatable", "boolean", "Show the rotate knob."),
      a("targets", "string", "Ids of the selected objects (excluded from snapping)."),
      a("label", "string", "Accessible name.", { default: "Selection" }),
    ],
    events: [
      {
        name: "transform",
        type: "CustomEvent<TransformDetail>",
        description: "Moving, resizing or rotating.",
      },
      { name: "change", type: "CustomEvent<TransformDetail>", description: "Committed (pointer up or key)." },
    ],
    parts: [
      { name: "frame", description: "The outline." },
      { name: "handle", description: "Each handle (the rotate knob also has part rotate)." },
      { name: "size", description: "The W × H readout." },
    ],
    cssProperties: [MARK],
  },
  {
    tag: "st-artboard",
    module: "@station/components/artboard",
    className: "Artboard",
    description:
      "A frame on the canvas in document coordinates, with its name above at constant screen size. Clicking the name fires select.",
    attributes: [
      a("x", "number", "Left, document units.", { default: 0 }),
      a("y", "number", "Top, document units.", { default: 0 }),
      a("width", "number", "Width.", { default: 0 }),
      a("height", "number", "Height.", { default: 0 }),
      a("label", "string", "Name shown above the frame."),
      a("clip", "boolean", "Clip content to the frame."),
      a("selected", "boolean", "Selected look."),
    ],
    events: [
      {
        name: "select",
        type: "CustomEvent<{ ids: string[]; add: boolean }>",
        description: "The name was clicked.",
      },
    ],
    slots: [{ name: "", description: "Artboard content." }],
    parts: [
      { name: "name", description: "The name label." },
      { name: "body", description: "The frame." },
    ],
    cssProperties: [
      { name: "--st-artboard-fill", description: "Frame fill. Default white (gray 3 on dark)." },
    ],
  },
  {
    tag: "st-measure",
    module: "@station/components/measure",
    className: "Measure",
    description: "A distance line between two document points, in an st-viewport overlay.",
    attributes: [
      a("x1", "number", "Start x."),
      a("y1", "number", "Start y."),
      a("x2", "number", "End x."),
      a("y2", "number", "End y."),
      a("label", "string", "Label text. Default: the distance."),
    ],
    parts: [
      { name: "line", description: "The line." },
      { name: "label", description: "The distance pill." },
    ],
    cssProperties: [{ name: "--st-canvas-measure", description: "Line color. Default --st-canvas-mark." }],
  },
  {
    tag: "st-minimap",
    module: "@station/components/minimap",
    className: "Minimap",
    description:
      "Overview of an st-viewport with the visible area framed. Click or drag to move the view; arrows pan.",
    attributes: [
      a("for", "string", "Id of the st-viewport."),
      a("label", "string", "Accessible name.", { default: "Minimap" }),
    ],
    cssProperties: [MARK],
  },
];
