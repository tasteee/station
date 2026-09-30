import { afterEach, describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { $, mount, settle } from "./helpers.ts";

afterEach(() => {
  document.body.innerHTML = "";
});

const isOpen = (el: Element | null) => !!el?.matches(":popover-open");

describe("st-menubar", () => {
  const markup = `
    <st-menubar label="Main">
      <st-menu label="File"><st-menu-item>New</st-menu-item><st-menu-item>Open…</st-menu-item></st-menu>
      <st-menu label="Edit"><st-menu-item>Undo</st-menu-item><st-menu-item>Redo</st-menu-item></st-menu>
      <st-menu label="Image"><st-menu-item>Crop</st-menu-item></st-menu>
    </st-menubar>`;

  it("renders one entry per menu and opens on click", async () => {
    const root = await mount(markup);
    const bar = $(root, "st-menubar");
    const buttons = bar.shadowRoot!.querySelectorAll("button");
    expect([...buttons].map((b) => b.textContent)).toEqual(["File", "Edit", "Image"]);
    buttons[0]!.click();
    await settle(root);
    expect(isOpen(root.querySelector("st-menu[label=File]"))).toBe(true);
    expect(buttons[0]!.getAttribute("aria-expanded")).toBe("true");
  });

  it("switches menus on hover while one is open", async () => {
    const root = await mount(markup);
    const buttons = $(root, "st-menubar").shadowRoot!.querySelectorAll("button");
    buttons[0]!.click();
    await settle(root);
    await userEvent.hover(buttons[1]!);
    await settle(root);
    expect(isOpen(root.querySelector("st-menu[label=Edit]"))).toBe(true);
    expect(isOpen(root.querySelector("st-menu[label=File]"))).toBe(false);
  });

  it("moves between menus with ←/→ from inside a menu", async () => {
    const root = await mount(markup);
    const buttons = $(root, "st-menubar").shadowRoot!.querySelectorAll("button");
    buttons[0]!.focus();
    await userEvent.keyboard("{ArrowDown}");
    await settle(root);
    expect(document.activeElement?.textContent).toBe("New");
    await userEvent.keyboard("{ArrowRight}");
    await settle(root);
    expect(isOpen(root.querySelector("st-menu[label=Edit]"))).toBe(true);
    expect(document.activeElement?.textContent).toBe("Undo");
    await userEvent.keyboard("{ArrowLeft}");
    await settle(root);
    await userEvent.keyboard("{ArrowLeft}");
    await settle(root);
    expect(isOpen(root.querySelector("st-menu[label=Image]"))).toBe(true);
  });
});

describe("st-toolbox", () => {
  const markup = `
    <st-toolbox value="move" hotkeys label="Tools">
      <st-tool value="move" icon="pointer" label="Move" shortcut="V"></st-tool>
      <st-tool-group label="Shapes">
        <st-tool value="rect" icon="square" label="Rectangle" shortcut="U"></st-tool>
        <st-tool value="ellipse" icon="circle" label="Ellipse" shortcut="U"></st-tool>
      </st-tool-group>
      <st-tool value="text" icon="typography" label="Text" shortcut="T"></st-tool>
    </st-toolbox>`;

  it("selects tools on click and marks the group", async () => {
    const root = await mount(markup);
    const box = $(root, "st-toolbox");
    const onChange = vi.fn();
    box.addEventListener("change", (e) => onChange((e as CustomEvent).detail.value));
    const group = $(root, "st-tool-group");
    group.click();
    await settle(root);
    expect(box.value).toBe("rect");
    expect(group.selected).toBe(true);
    expect(($(root, "st-tool[value=move]") as HTMLElement & { selected: boolean }).selected).toBe(false);
    expect(onChange).toHaveBeenCalledWith("rect");
  });

  it("picks alternates from the flyout", async () => {
    const root = await mount(markup);
    const box = $(root, "st-toolbox");
    const group = $(root, "st-tool-group");
    group.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true }));
    await settle(root);
    const flyout = group.shadowRoot!.querySelector(".flyout") as HTMLElement;
    expect(isOpen(flyout)).toBe(true);
    (flyout.querySelectorAll("button")[1] as HTMLElement).click();
    await settle(root);
    expect(box.value).toBe("ellipse");
    expect(group.current).toBe("ellipse");
    expect(isOpen(flyout)).toBe(false);
  });

  it("selects and cycles tools with single-key hotkeys", async () => {
    const root = await mount(markup);
    const box = $(root, "st-toolbox");
    await userEvent.keyboard("t");
    expect(box.value).toBe("text");
    await userEvent.keyboard("u");
    expect(box.value).toBe("rect");
    await userEvent.keyboard("u");
    expect(box.value).toBe("ellipse");
    await userEvent.keyboard("v");
    expect(box.value).toBe("move");
  });

  it("ignores hotkeys while typing", async () => {
    const root = await mount(`${markup}<input id="i" />`);
    ($(root, "#i") as HTMLElement).focus();
    await userEvent.keyboard("t");
    expect($(root, "st-toolbox").value).toBe("move");
  });
});
