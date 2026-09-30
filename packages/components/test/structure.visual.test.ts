import { registerIcons } from "@station/icons";
import { IconCopy, IconDots, IconPlus, IconTrash } from "@station/icons/tabler";
import { it } from "vitest";
import "../src/index.ts";
import { matchBothThemes } from "./visual.ts";

registerIcons({ plus: IconPlus, trash: IconTrash, copy: IconCopy, dots: IconDots });

it("panel with tabs, sections and property rows", async () => {
  await matchBothThemes(
    "panel",
    `<st-panel style="height:300px;border:1px solid var(--st-border-subtle)">
      <st-panel-header divided><st-heading>Layers</st-heading><st-badge>12</st-badge><st-icon-button size="small" icon="dots" label="More"></st-icon-button></st-panel-header>
      <st-tabs value="a" divided>
        <st-tab value="a">Design</st-tab><st-tab value="b">Prototype</st-tab>
        <st-tab-panel value="a">
          <st-section heading="Appearance" divided>
            <st-property-row label="Opacity"><st-slider value="60"></st-slider></st-property-row>
            <st-property-row label="Visible"><st-switch checked></st-switch></st-property-row>
          </st-section>
          <st-section heading="Effects" collapsible collapsed><st-badge slot="heading">2</st-badge><st-icon-button slot="actions" icon="plus" label="Add"></st-icon-button></st-section>
        </st-tab-panel>
      </st-tabs>
    </st-panel>`,
    320,
  );
});

it("badges and progress", async () => {
  await matchBothThemes(
    "badges",
    `<st-column gap="2">
      <st-row gap="2"><st-badge>12</st-badge><st-badge tone="accent">New</st-badge><st-badge tone="danger">3</st-badge><st-badge tone="warning">Draft</st-badge><st-badge tone="success">Live</st-badge><st-badge kind="solid" tone="danger">9</st-badge><st-badge dot tone="success"></st-badge></st-row>
      <st-progress value="40"></st-progress>
      <st-empty-state><st-icon name="copy"></st-icon><st-heading>No layers</st-heading><st-text size="small">Add one to get started.</st-text></st-empty-state>
    </st-column>`,
  );
});

it("menu", async () => {
  // Render the menu inline (not in the top layer) so the screenshot can capture it.
  await matchBothThemes(
    "menu",
    `<st-menu style="position:static;display:flex;flex-direction:column;gap:1px;width:220px" label="Layer">
      <st-menu-item icon="copy" shortcut="Mod+D">Duplicate</st-menu-item>
      <st-menu-item shortcut="Mod+V" disabled>Paste</st-menu-item>
      <st-divider></st-divider>
      <st-menu-label>View</st-menu-label>
      <st-menu-item type="checkbox" checked>Rulers</st-menu-item>
      <st-divider></st-divider>
      <st-menu-item tone="danger" icon="trash" shortcut="Delete">Delete</st-menu-item>
    </st-menu>`,
    280,
  );
});
