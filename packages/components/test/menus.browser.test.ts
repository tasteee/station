import { afterEach, describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { $, mount, settle } from "./helpers.ts";

afterEach(() => {
  document.body.innerHTML = "";
});

const isOpen = (el: Element) => el.matches(":popover-open");

const markup = `
  <st-button id="more">More</st-button>
  <st-menu for="more" label="Layer">
    <st-menu-item value="dup" shortcut="Mod+D">Duplicate</st-menu-item>
    <st-menu-item value="rename" disabled>Rename</st-menu-item>
    <st-menu-item value="grid" type="checkbox">Show grid</st-menu-item>
    <st-divider></st-divider>
    <st-menu-item value="arrange">Arrange
      <st-menu>
        <st-menu-item value="front">Bring to front</st-menu-item>
        <st-menu-item value="back">Send to back</st-menu-item>
      </st-menu>
    </st-menu-item>
    <st-menu-item value="delete" tone="danger">Delete</st-menu-item>
  </st-menu>`;

describe("st-menu", () => {
  it("opens from its trigger and wires ARIA", async () => {
    const root = await mount(markup);
    const trigger = $(root, "#more");
    const menu = $(root, "st-menu");
    trigger.click();
    await settle(root);
    expect(isOpen(menu)).toBe(true);
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    expect(trigger.getAttribute("aria-haspopup")).toBe("menu");
  });

  it("navigates with arrows (skipping disabled), fires select and closes", async () => {
    const root = await mount(markup);
    const trigger = $(root, "#more");
    const menu = $(root, "st-menu");
    const onSelect = vi.fn();
    menu.addEventListener("select", (e) => onSelect((e as CustomEvent).detail.value));
    trigger.focus();
    await userEvent.keyboard("{ArrowDown}");
    await settle(root);
    expect(document.activeElement?.textContent).toBe("Duplicate");
    await userEvent.keyboard("{ArrowDown}");
    expect(document.activeElement?.textContent).toBe("Show grid");
    await userEvent.keyboard("{Enter}");
    await settle(root);
    expect(onSelect).toHaveBeenCalledWith("grid");
    expect(($(root, "st-menu-item[value=grid]") as HTMLElement & { checked: boolean }).checked).toBe(true);
    expect(isOpen(menu)).toBe(false);
    expect(document.activeElement).toBe(trigger);
  });

  it("opens submenus with ArrowRight and closes them with ArrowLeft", async () => {
    const root = await mount(markup);
    const menu = $(root, "st-menu");
    const sub = root.querySelector("st-menu st-menu") as HTMLElement;
    const arrange = $(root, "st-menu-item[value=arrange]");
    await (menu as unknown as { show(a: Element, v: string): Promise<void> }).show(
      $(root, "#more"),
      "keyboard",
    );
    await settle(root);
    arrange.focus();
    await userEvent.keyboard("{ArrowRight}");
    await settle(root);
    expect(isOpen(sub)).toBe(true);
    expect(isOpen(menu)).toBe(true);
    expect(document.activeElement?.textContent).toBe("Bring to front");
    await userEvent.keyboard("{ArrowLeft}");
    await settle(root);
    expect(isOpen(sub)).toBe(false);
    expect(document.activeElement).toBe(arrange);
  });

  it("picks from a submenu and closes the whole chain", async () => {
    const root = await mount(markup);
    const menu = $(root, "st-menu");
    const onSelect = vi.fn();
    menu.addEventListener("select", (e) => onSelect((e as CustomEvent).detail.value));
    $(root, "#more").click();
    await settle(root);
    await userEvent.hover($(root, "st-menu-item[value=arrange]"));
    await vi.waitFor(() => expect(isOpen(root.querySelector("st-menu st-menu")!)).toBe(true));
    ($(root, "st-menu-item[value=back]") as HTMLElement).click();
    await settle(root);
    expect(onSelect).toHaveBeenCalledWith("back");
    expect(isOpen(menu)).toBe(false);
  });

  it("opens at the pointer as a context menu", async () => {
    const root = await mount(`
      <div id="canvas" style="width:300px;height:200px"></div>
      <st-menu for="canvas" trigger="contextmenu"><st-menu-item>Paste</st-menu-item></st-menu>`);
    const canvas = $(root, "#canvas");
    const box = canvas.getBoundingClientRect();
    canvas.dispatchEvent(
      new MouseEvent("contextmenu", {
        bubbles: true,
        composed: true,
        cancelable: true,
        clientX: box.left + 50,
        clientY: box.top + 40,
      }),
    );
    await settle(root);
    const menu = $(root, "st-menu");
    expect(isOpen(menu)).toBe(true);
    expect(Math.round(menu.getBoundingClientRect().left)).toBe(Math.round(box.left + 50));
  });
});

describe("st-popover", () => {
  it("toggles from its trigger and focuses its first control", async () => {
    const root = await mount(`
      <st-button id="filters">Filters</st-button>
      <st-popover for="filters" label="Filters"><st-checkbox>Hidden layers</st-checkbox></st-popover>`);
    const popover = $(root, "st-popover");
    const onOpen = vi.fn();
    popover.addEventListener("openchange", onOpen);
    $(root, "#filters").click();
    await settle(root);
    expect(isOpen(popover)).toBe(true);
    expect(document.activeElement).toBe($(root, "st-checkbox"));
    await userEvent.keyboard("{Escape}");
    await settle(root);
    expect(isOpen(popover)).toBe(false);
    expect(onOpen).toHaveBeenCalledTimes(2);
  });
});
