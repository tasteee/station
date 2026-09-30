import type { Meta, StoryObj } from "@storybook/web-components-vite";

const meta: Meta = { title: "Editor/Components" };
export default meta;

export const SplitAndTree: StoryObj = {
  render: () => {
    const root = document.createElement("div");
    root.innerHTML = `
      <st-split style="height:360px;border:1px solid var(--st-border-subtle)">
        <st-pane size="260" min="180" max="420" collapsible>
          <st-tree label="Layers" renamable reorderable style="height:100%"></st-tree>
        </st-pane>
        <st-pane><st-empty-state style="height:100%"><st-heading>Canvas</st-heading><st-text size="small">Drag the divider, or double-click it.</st-text></st-empty-state></st-pane>
      </st-split>`;
    const tree = root.querySelector("st-tree") as HTMLElement & Record<string, unknown>;
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
        label: "Group",
        icon: "folder",
        expanded: true,
        children: [
          { id: "a", label: "Title", icon: "letter-t" },
          { id: "b", label: "Photo", icon: "photo", visible: false, muted: true },
        ],
      },
      { id: "bg", label: "Background", icon: "square" },
    ];
    return root;
  },
};

export const MenubarAndToolbox: StoryObj = {
  render: () => `
    <st-column gap="4">
      <st-menubar>
        <st-menu label="File"><st-menu-item shortcut="Mod+N">New…</st-menu-item><st-menu-item shortcut="Mod+S">Save</st-menu-item></st-menu>
        <st-menu label="Edit"><st-menu-item shortcut="Mod+Z">Undo</st-menu-item><st-menu-item shortcut="Mod+Shift+Z">Redo</st-menu-item></st-menu>
        <st-menu label="Image"><st-menu-item>Adjustments<st-menu><st-menu-item shortcut="Mod+L">Levels…</st-menu-item><st-menu-item shortcut="Mod+M">Curves…</st-menu-item></st-menu></st-menu-item></st-menu>
      </st-menubar>
      <st-toolbox value="brush" hotkeys columns="2" label="Tools" style="width:max-content;border:1px solid var(--st-border-subtle);border-radius:var(--st-radius-3)">
        <st-tool value="move" icon="arrows-move" label="Move" shortcut="V"></st-tool>
        <st-tool-group label="Marquee"><st-tool value="m1" icon="square-dashed" label="Rectangular Marquee" shortcut="M"></st-tool><st-tool value="m2" icon="circle-dashed" label="Elliptical Marquee" shortcut="M"></st-tool></st-tool-group>
        <st-tool-group label="Brushes"><st-tool value="brush" icon="brush" label="Brush" shortcut="B"></st-tool><st-tool value="pencil" icon="pencil" label="Pencil" shortcut="B"></st-tool></st-tool-group>
        <st-tool value="eraser" icon="eraser" label="Eraser" shortcut="E"></st-tool>
        <st-tool value="type" icon="typography" label="Type" shortcut="T"></st-tool>
        <st-tool value="zoom" icon="zoom-in" label="Zoom" shortcut="Z"></st-tool>
      </st-toolbox>
      <st-text size="small" tone="muted">Right-click or long-press a tool with a corner triangle. Press B, M, V…</st-text>
    </st-column>`,
};

export const Color: StoryObj = {
  render: () => `
    <st-row gap="6" y-align="start">
      <st-color-picker value="#3366cc" alpha></st-color-picker>
      <st-column gap="3">
        <st-color-field label="Fill" value="#ffd27a" alpha></st-color-field>
        <st-swatches label="Swatches" value="#e5484d" style="width:160px">
          ${["#000000", "#808080", "#ffffff", "#e5484d", "#f76b15", "#ffc53d", "#46a758", "#12a594", "#3e63dd", "#8e4ec6"].map((c) => `<st-color-swatch color="${c}"></st-color-swatch>`).join("")}
        </st-swatches>
      </st-column>
    </st-row>`,
};

export const Instruments: StoryObj = {
  render: () => `
    <st-column gap="4">
      <st-ruler zoom="2" offset="-20" style="width:480px"></st-ruler>
      <st-ruler zoom="24" format="time" marker="3.5" range-start="2" range-end="6" style="width:480px"></st-ruler>
      <st-row gap="4" y-align="end">
        <st-knob label="Gain" value="60" show-value unit="%">Gain</st-knob>
        <st-knob label="Pan" value="-20" min="-50" max="50" bipolar show-value>Pan</st-knob>
        <st-knob label="Mix" size="small" value="30">Mix</st-knob>
        <st-slider orientation="vertical" label="Volume" value="70"></st-slider>
        <st-meter value="-9" peak="-4"></st-meter>
        <st-meter value="-14" peak="-8"></st-meter>
        <st-meter orientation="horizontal" value="-2" peak="-1"></st-meter>
      </st-row>
    </st-column>`,
};

export const CommandPalette: StoryObj = {
  render: () => {
    const root = document.createElement("div");
    root.innerHTML = `<st-button>Open (Mod+K)</st-button><st-command-palette hotkey="Mod+K"></st-command-palette>`;
    const palette = root.querySelector("st-command-palette") as HTMLElement & Record<string, unknown>;
    palette.commands = [
      { id: "new", label: "New Document", group: "File", shortcut: "Mod+N" },
      { id: "levels", label: "Levels…", group: "Image › Adjustments", shortcut: "Mod+L" },
      { id: "curves", label: "Curves…", group: "Image › Adjustments", shortcut: "Mod+M" },
      { id: "flatten", label: "Flatten Image", group: "Layer", keywords: ["merge"] },
      { id: "brush", label: "Brush Tool", group: "Tools", icon: "brush", shortcut: "B" },
    ];
    root.querySelector("st-button")!.addEventListener("click", () => (palette.open = true));
    return root;
  },
};
