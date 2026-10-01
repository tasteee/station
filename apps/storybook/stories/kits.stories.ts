import type { Meta, StoryObj } from "@storybook/web-components-vite";

const meta: Meta = { title: "Kits/Components" };
export default meta;

type Any = HTMLElement & Record<string, unknown>;
const html = (markup: string) => {
  const root = document.createElement("div");
  root.innerHTML = markup;
  return root;
};
const bins = (center: number, spread: number) =>
  Array.from({ length: 256 }, (_, i) => Math.round(1000 * Math.exp(-(((i - center) / spread) ** 2))));

export const SmallControls: StoryObj = {
  render: () => `
    <st-column gap="3" style="width:320px">
      <st-vector-field label="Position" value="120 80" unit="px"></st-vector-field>
      <st-vector-field label="Size" axes="w h" value="640 480" unit="px" linkable linked></st-vector-field>
      <st-vector-field label="Rotation" axes="x y z" value="0 45 0" unit="°"></st-vector-field>
      <st-inline-edit label="Layer name" value="Background"></st-inline-edit>
      <st-breadcrumbs>
        <st-crumb icon="home" value="root">Projects</st-crumb>
        <st-crumb value="summer">Summer Sessions</st-crumb>
        <st-crumb value="images">Images</st-crumb>
      </st-breadcrumbs>
      <st-zoom-control value="100"></st-zoom-control>
      <st-text size="small" tone="muted">Double-click the name to rename. Drag an axis letter to scrub.</st-text>
    </st-column>`,
};

export const Imaging: StoryObj = {
  render: () => {
    const root = html(`
      <st-row gap="6" y-align="start">
        <st-curve-editor label="Curves"></st-curve-editor>
        <st-column gap="4" style="width:260px">
          <st-gradient-editor label="Gradient"></st-gradient-editor>
          <st-histogram label="Histogram"></st-histogram>
        </st-column>
      </st-row>`);
    const curve = root.querySelector("st-curve-editor") as Any;
    curve.histogram = bins(110, 50);
    (root.querySelector("st-gradient-editor") as Any).stops = [
      { offset: 0, color: "#1e1b4b" },
      { offset: 0.55, color: "#db2777" },
      { offset: 1, color: "#fbbf24" },
    ];
    (root.querySelector("st-histogram") as Any).channels = {
      red: bins(160, 40),
      green: bins(120, 50),
      blue: bins(80, 35),
    };
    return root;
  },
};

export const DataTable: StoryObj = {
  render: () => {
    const root = html(
      `<st-data-table label="Files" style="height:320px;border:1px solid var(--st-border-subtle)"></st-data-table>`,
    );
    const table = root.querySelector("st-data-table") as Any;
    const kinds = ["Image", "Audio", "Video", "Text"];
    let rows = Array.from({ length: 500 }, (_, i) => ({
      id: `f${i}`,
      name: `file-${String(i).padStart(3, "0")}.${["png", "wav", "mp4", "md"][i % 4]}`,
      kind: kinds[i % 4],
      size: ((i * 7919) % 50000) + 4,
    }));
    table.columns = [
      { key: "name", label: "Name", width: 220, sortable: true, editable: true },
      { key: "kind", label: "Kind", width: 100, sortable: true },
      {
        key: "size",
        label: "Size",
        width: 100,
        type: "number",
        sortable: true,
        format: (v: unknown) => `${v} KB`,
      },
    ];
    table.rows = rows;
    table.sort = { key: "name", direction: "ascending" };
    table.addEventListener("cellchange", (e: Event) => {
      const { id, key, value } = (e as CustomEvent).detail;
      rows = rows.map((r) => (r.id === id ? { ...r, [key]: value } : r));
      table.rows = rows;
    });
    return root;
  },
};

export const Timeline: StoryObj = {
  render: () => {
    const root = html(
      `<st-timeline label="Arrangement" zoom="24" snap="0.5" style="height:220px;border:1px solid var(--st-border-subtle)"></st-timeline>`,
    );
    const tl = root.querySelector("st-timeline") as Any;
    let tracks = [
      {
        id: "v",
        label: "Video",
        color: "#3b82f6",
        clips: [
          { id: "c1", start: 0, end: 6, label: "Intro" },
          { id: "c2", start: 7, end: 14, label: "Main" },
        ],
      },
      {
        id: "a",
        label: "Music",
        color: "#22c55e",
        clips: [{ id: "c3", start: 1, end: 16, label: "Theme" }],
        keyframes: [
          { id: "k1", time: 3 },
          { id: "k2", time: 12 },
        ],
      },
      { id: "fx", label: "FX", color: "#a855f7", clips: [{ id: "c4", start: 9, end: 11, label: "Whoosh" }] },
    ];
    tl.trackToggles = [
      { key: "muted", label: "Mute", text: "M" },
      { key: "solo", label: "Solo", text: "S" },
    ];
    tl.tracks = tracks;
    tl.addEventListener("clipchange", (e: Event) => {
      const { id, trackId, start, end } = (e as CustomEvent).detail;
      const clip = tracks.flatMap((t) => t.clips).find((c) => c.id === id)!;
      tracks = tracks.map((t) => ({
        ...t,
        clips: [
          ...t.clips.filter((c) => c.id !== id),
          ...(t.id === trackId ? [{ ...clip, start, end }] : []),
        ],
      }));
      tl.tracks = tracks;
    });
    tl.addEventListener("trackchange", (e: Event) => {
      const { id, key, value } = (e as CustomEvent).detail;
      tracks = tracks.map((t) => (t.id === id ? { ...t, [key]: value } : t));
      tl.tracks = tracks;
    });
    tl.addEventListener("seek", (e: Event) => (tl.playhead = (e as CustomEvent).detail.time));
    return root;
  },
};

export const Dock: StoryObj = {
  render: () => `
    <st-row y-align="stretch" style="height:420px;border:1px solid var(--st-border-subtle)">
      <st-empty-state grow><st-heading>Canvas</st-heading><st-text size="small">Drag tabs between groups. Double-click a tab bar to minimize. » collapses to icons.</st-text></st-empty-state>
      <st-divider orientation="vertical"></st-divider>
      <st-dock label="Panels" style="width:260px">
        <st-dock-panel name="color" label="Color" icon="palette" group="a"><st-column padding="3"><st-color-picker value="#3366cc"></st-color-picker></st-column></st-dock-panel>
        <st-dock-panel name="swatches" label="Swatches" icon="grid-dots" group="a"><st-column padding="3"><st-text>Swatches</st-text></st-column></st-dock-panel>
        <st-dock-panel name="layers" label="Layers" icon="stack" group="b"><st-column padding="3"><st-text>Layers</st-text></st-column></st-dock-panel>
        <st-dock-panel name="history" label="History" icon="history" group="b"><st-column padding="3"><st-text>History</st-text></st-column></st-dock-panel>
      </st-dock>
    </st-row>`,
};
