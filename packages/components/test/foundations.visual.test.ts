import { registerIcons } from "@station/icons";
import { IconEye, IconFolder, IconLock, IconPlus, IconTrash } from "@station/icons/tabler";
import { it } from "vitest";
import "../src/index.ts";
import { matchBothThemes } from "./visual.ts";

registerIcons({ plus: IconPlus, trash: IconTrash, folder: IconFolder, eye: IconEye, lock: IconLock });

it("text ladder and headings", async () => {
  await matchBothThemes(
    "text",
    `<st-column gap="1.5">
      <st-heading size="large">Large heading</st-heading>
      <st-heading>Panel title</st-heading>
      <st-heading size="small" tone="muted">SECTION LABEL</st-heading>
      <st-text tone="strong" weight="medium">Strong text</st-text>
      <st-text>Body text</st-text>
      <st-text tone="muted">Muted text</st-text>
      <st-text tone="faint">Faint text</st-text>
      <st-text numeric>1,234.50 px</st-text>
    </st-column>`,
  );
});

it("surfaces", async () => {
  await matchBothThemes(
    "surfaces",
    `<st-surface level="canvas" padding="3">
      <st-surface level="panel" bordered rounded padding="3">
        <st-column gap="2">
          <st-surface level="section" rounded="small" padding="2"><st-text>Section</st-text></st-surface>
          <st-surface level="well" rounded="small" padding="2"><st-text>Well</st-text></st-surface>
        </st-column>
      </st-surface>
    </st-surface>`,
  );
});

it("icons and shortcuts", async () => {
  await matchBothThemes(
    "icons",
    `<st-column gap="2">
      <st-row gap="2" size="small"><st-icon name="plus"></st-icon><st-icon name="trash"></st-icon><st-icon name="folder"></st-icon><st-icon name="eye"></st-icon><st-icon name="lock"></st-icon></st-row>
      <st-row gap="2"><st-icon name="plus"></st-icon><st-icon name="trash"></st-icon><st-icon name="folder"></st-icon><st-icon name="eye"></st-icon><st-icon name="lock"></st-icon></st-row>
      <st-row gap="2"><st-kbd shortcut="Mod+Shift+D"></st-kbd><st-kbd kind="boxed" shortcut="Mod+K"></st-kbd></st-row>
    </st-column>`,
  );
});
