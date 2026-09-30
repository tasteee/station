import { confirm, toast } from "@station/components";
import type { Meta, StoryObj } from "@storybook/web-components-vite";

const meta: Meta = { title: "Structure/Overlays" };
export default meta;

export const Menus: StoryObj = {
  render: () => `
    <st-row gap="3">
      <st-button id="menu-trigger" icon-end="chevron-down">File</st-button>
      <st-menu for="menu-trigger">
        <st-menu-item icon="plus" shortcut="Mod+N">New file</st-menu-item>
        <st-menu-item icon="folder" shortcut="Mod+O">Open…</st-menu-item>
        <st-menu-item>Open recent
          <st-menu>
            <st-menu-item>Landing page</st-menu-item>
            <st-menu-item>Design system</st-menu-item>
          </st-menu>
        </st-menu-item>
        <st-divider></st-divider>
        <st-menu-label>View</st-menu-label>
        <st-menu-item type="checkbox" checked keep-open>Rulers</st-menu-item>
        <st-menu-item type="checkbox" keep-open>Pixel grid</st-menu-item>
        <st-divider></st-divider>
        <st-menu-item tone="danger" icon="trash">Delete file</st-menu-item>
      </st-menu>
      <div id="ctx" style="width:240px;height:120px;border:1px dashed var(--st-border);border-radius:var(--st-radius-3);display:grid;place-items:center;color:var(--st-text-muted)">Right-click here</div>
      <st-menu for="ctx" trigger="contextmenu">
        <st-menu-item shortcut="Mod+V">Paste</st-menu-item>
        <st-menu-item shortcut="Mod+A">Select all</st-menu-item>
      </st-menu>
    </st-row>`,
};

export const PopoverAndDialogs: StoryObj = {
  render: () => {
    const root = document.createElement("div");
    root.innerHTML = `
      <st-row gap="2">
        <st-button id="pop-trigger">View options</st-button>
        <st-popover for="pop-trigger" placement="bottom-start">
          <st-column gap="2"><st-checkbox checked>Rulers</st-checkbox><st-checkbox>Outlines</st-checkbox></st-column>
        </st-popover>
        <st-button class="open-dialog">Open dialog</st-button>
        <st-button class="confirm" tone="danger">Delete…</st-button>
        <st-button class="toast">Toast</st-button>
      </st-row>
      <st-dialog heading="Rename layer">
        <st-text-field label="Name" value="Frame 12"></st-text-field>
        <st-button slot="footer" kind="ghost" class="close">Cancel</st-button>
        <st-button slot="footer" kind="solid" tone="accent" class="close">Rename</st-button>
      </st-dialog>`;
    const dialog = root.querySelector("st-dialog") as HTMLElement & { open: boolean };
    root.querySelector(".open-dialog")!.addEventListener("click", () => (dialog.open = true));
    for (const b of root.querySelectorAll(".close")) b.addEventListener("click", () => (dialog.open = false));
    root.querySelector(".confirm")!.addEventListener("click", async () => {
      const ok = await confirm({
        heading: "Delete 3 layers?",
        body: "This can't be undone.",
        confirmLabel: "Delete",
        tone: "danger",
      });
      toast(
        ok ? "Deleted 3 layers" : "Cancelled",
        ok ? { action: { label: "Undo", onClick: () => {} } } : {},
      );
    });
    root
      .querySelector(".toast")!
      .addEventListener("click", () => toast("Exported 3 frames", { tone: "success" }));
    return root;
  },
};
