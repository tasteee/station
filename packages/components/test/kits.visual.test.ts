import { registerIcons } from "@station/icons";
import { IconFile, IconHome, IconPalette, IconStack } from "@station/icons/tabler";
import { it } from "vitest";
import "../src/index.ts";
import { matchBothThemes } from "./visual.ts";

registerIcons({ file: IconFile, home: IconHome, palette: IconPalette, stack: IconStack });

type Any = HTMLElement & Record<string, unknown>;
const q = (frame: HTMLElement, sel: string) => frame.querySelector(sel) as Any;
// A smooth, deterministic bump for histogram bins.
const bins = (center: number, spread: number) =>
  Array.from({ length: 64 }, (_, i) => Math.round(1000 * Math.exp(-(((i - center) / spread) ** 2))));

it("small kit controls", async () => {
  await matchBothThemes(
    "kit-controls",
    `<st-column gap="3">
      <st-vector-field label="Position" value="120 80" unit="px"></st-vector-field>
      <st-vector-field label="Size" axes="w h" value="640 480" linkable linked></st-vector-field>
      <st-inline-edit label="Layer name" value="Background"></st-inline-edit>
      <st-breadcrumbs><st-crumb icon="home" value="root">Projects</st-crumb><st-crumb value="a">Summer</st-crumb><st-crumb value="b">Images</st-crumb></st-breadcrumbs>
      <st-zoom-control value="66.7"></st-zoom-control>
    </st-column>`,
    320,
  );
});

it("imaging", async () => {
  await matchBothThemes(
    "imaging",
    `<st-column gap="3">
      <st-curve-editor label="Curves"></st-curve-editor>
      <st-gradient-editor label="Gradient" style="width:232px"></st-gradient-editor>
      <st-histogram label="Histogram" style="width:232px"></st-histogram>
    </st-column>`,
    280,
    (frame) => {
      const curve = q(frame, "st-curve-editor");
      curve.points = [
        { x: 0, y: 0 },
        { x: 0.3, y: 0.2 },
        { x: 0.7, y: 0.85 },
        { x: 1, y: 1 },
      ];
      curve.histogram = bins(28, 12);
      q(frame, "st-gradient-editor").stops = [
        { offset: 0, color: "#1e1b4b" },
        { offset: 0.55, color: "#db2777" },
        { offset: 1, color: "#fbbf24" },
      ];
      q(frame, "st-histogram").channels = { red: bins(40, 10), green: bins(30, 12), blue: bins(20, 9) };
    },
  );
});

it("data table", async () => {
  await matchBothThemes(
    "data-table",
    `<st-data-table label="Files" style="height:150px"></st-data-table>`,
    420,
    (frame) => {
      const table = q(frame, "st-data-table");
      table.columns = [
        { key: "name", label: "Name", width: 160, sortable: true },
        { key: "kind", label: "Kind", width: 90 },
        { key: "size", label: "Size", width: 80, type: "number", format: (v: unknown) => `${v} KB` },
      ];
      table.rows = [
        { id: "a", name: "cover.png", kind: "Image", size: 420 },
        { id: "b", name: "theme.wav", kind: "Audio", size: 8120 },
        { id: "c", name: "notes.md", kind: "Text", size: 4 },
      ];
      table.sort = { key: "name", direction: "ascending" };
      table.selection = ["b"];
    },
  );
});

it("timeline", async () => {
  await matchBothThemes(
    "timeline",
    `<st-timeline label="Arrangement" zoom="20" playhead="3" style="height:130px"></st-timeline>`,
    480,
    (frame) => {
      const tl = q(frame, "st-timeline");
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
          muted: true,
          clips: [{ id: "c3", start: 1, end: 11, label: "Music" }],
          keyframes: [
            { id: "k1", time: 2 },
            { id: "k2", time: 8 },
          ],
        },
      ];
      tl.selection = ["c2"];
    },
  );
});

it("dock", async () => {
  await matchBothThemes(
    "dock",
    `<st-dock label="Panels" style="height:220px">
      <st-dock-panel name="color" label="Color" icon="palette" group="a"><st-column padding="3"><st-text>Color panel</st-text></st-column></st-dock-panel>
      <st-dock-panel name="swatches" label="Swatches" icon="palette" group="a"><st-column padding="3"><st-text>Swatches</st-text></st-column></st-dock-panel>
      <st-dock-panel name="layers" label="Layers" icon="stack" group="b"><st-column padding="3"><st-text>Layers panel</st-text></st-column></st-dock-panel>
    </st-dock>`,
    280,
  );
});
