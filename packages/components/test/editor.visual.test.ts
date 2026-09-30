import { registerIcons } from "@station/icons";
import {
  IconBrush,
  IconEye,
  IconEyeOff,
  IconFolder,
  IconLock,
  IconPencil,
  IconSquare,
} from "@station/icons/tabler";
import { it } from "vitest";
import "../src/index.ts";
import { settle } from "./helpers.ts";
import { matchBothThemes } from "./visual.ts";

registerIcons({
  brush: IconBrush,
  pencil: IconPencil,
  eye: IconEye,
  "eye-off": IconEyeOff,
  folder: IconFolder,
  lock: IconLock,
  square: IconSquare,
});

it("tree", async () => {
  // Data is set after the markup renders, so hook it in via a microtask per theme.
  const observer = new MutationObserver(() => {
    for (const tree of document.querySelectorAll<HTMLElement & Record<string, unknown>>(
      "st-tree:not([data-ready])",
    )) {
      tree.dataset.ready = "";
      tree.toggles = [
        {
          key: "visible",
          label: "Visibility",
          icon: "eye",
          offIcon: "eye-off",
          default: true,
          position: "start",
        },
        { key: "locked", label: "Lock", icon: "lock", position: "end", show: "active" },
      ];
      tree.items = [
        {
          id: "g",
          label: "Group",
          icon: "folder",
          expanded: true,
          children: [
            { id: "a", label: "Rectangle", icon: "square" },
            { id: "b", label: "Hidden", icon: "square", visible: false, muted: true },
          ],
        },
        { id: "bg", label: "Background", icon: "square", locked: true },
      ];
      tree.selection = ["a"];
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
  await matchBothThemes("tree", `<st-tree label="Layers" style="height:140px"></st-tree>`, 280);
  observer.disconnect();
  await settle();
});

it("instruments", async () => {
  await matchBothThemes(
    "instruments",
    `<st-column gap="3">
      <st-ruler zoom="2" offset="-10" style="width:300px"></st-ruler>
      <st-row gap="4" y-align="end">
        <st-knob label="Gain" value="60" show-value>Gain</st-knob>
        <st-knob label="Pan" value="-20" min="-50" max="50" bipolar show-value>Pan</st-knob>
        <st-slider orientation="vertical" label="Volume" value="70" style="height:80px"></st-slider>
        <st-meter value="-9" peak="-4" style="height:80px"></st-meter>
        <st-meter value="-2" peak="-1" style="height:80px"></st-meter>
      </st-row>
      <st-row gap="2"><st-color-field label="Fill" value="#3366cc" alpha></st-color-field><st-color-swatch color="#ff880080"></st-color-swatch></st-row>
    </st-column>`,
    360,
  );
});

it("toolbox", async () => {
  await matchBothThemes(
    "toolbox",
    `<st-toolbox value="brush" columns="2" label="Tools">
      <st-tool value="move" icon="square" label="Move"></st-tool>
      <st-tool-group label="Brushes"><st-tool value="brush" icon="brush" label="Brush"></st-tool><st-tool value="pencil" icon="pencil" label="Pencil"></st-tool></st-tool-group>
    </st-toolbox>`,
    120,
  );
});
