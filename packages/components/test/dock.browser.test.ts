import { afterEach, describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { $, mount, settle } from "./helpers.ts";

afterEach(() => {
  document.body.innerHTML = "";
  localStorage.clear();
});

const markup = (attrs = "") => `
  <st-dock ${attrs} style="height:400px;width:280px">
    <st-dock-panel name="color" label="Color" group="a"><p>Color body</p></st-dock-panel>
    <st-dock-panel name="swatches" label="Swatches" group="a"><p>Swatches body</p></st-dock-panel>
    <st-dock-panel name="layers" label="Layers" group="b"><p>Layers body</p></st-dock-panel>
  </st-dock>`;

const visible = (root: Element) =>
  [...root.querySelectorAll("st-dock-panel")]
    .filter((p) => p.assignedSlot && p.hasAttribute("data-active"))
    .map((p) => p.getAttribute("name"));

describe("st-dock", () => {
  it("builds groups from the group attribute and shows active panels", async () => {
    const root = await mount(markup());
    const dock = $(root, "st-dock");
    expect(dock.layout.groups.map((g: { panels: string[] }) => g.panels)).toEqual([
      ["color", "swatches"],
      ["layers"],
    ]);
    expect(visible(root)).toEqual(["color", "layers"]);
    const tabs = [...dock.shadowRoot!.querySelectorAll(".tab")].map((t) => t.textContent);
    expect(tabs).toEqual(["Color", "Swatches", "Layers"]);
  });

  it("switches tabs by click and arrow keys", async () => {
    const root = await mount(markup());
    const dock = $(root, "st-dock");
    const tab = dock.shadowRoot!.querySelectorAll<HTMLElement>(".tab")[1]!;
    tab.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, button: 0, pointerId: 1 }));
    tab.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, button: 0, pointerId: 1 }));
    await settle(root);
    expect(visible(root)).toEqual(["swatches", "layers"]);
    (dock.shadowRoot!.querySelector('.tab[data-panel="swatches"]') as HTMLElement).focus();
    await userEvent.keyboard("{ArrowLeft}");
    await settle(root);
    expect(visible(root)).toEqual(["color", "layers"]);
  });

  it("moves a panel to another group with Alt+arrows and fires layoutchange", async () => {
    const root = await mount(markup());
    const dock = $(root, "st-dock");
    const onLayout = vi.fn();
    dock.addEventListener("layoutchange", onLayout);
    (dock.shadowRoot!.querySelector('.tab[data-panel="swatches"]') as HTMLElement).focus();
    await userEvent.keyboard("{Alt>}{ArrowDown}{/Alt}");
    await settle(root);
    expect(dock.layout.groups.map((g: { panels: string[] }) => g.panels)).toEqual([
      ["color"],
      ["layers", "swatches"],
    ]);
    expect(onLayout).toHaveBeenCalled();
    await userEvent.keyboard("{Alt>}{ArrowDown}{/Alt}");
    await settle(root);
    expect(dock.layout.groups.map((g: { panels: string[] }) => g.panels)).toEqual([
      ["color"],
      ["layers"],
      ["swatches"],
    ]);
  });

  it("drags a tab into another group", async () => {
    const root = await mount(markup());
    const dock = $(root, "st-dock");
    const tab = dock.shadowRoot!.querySelector<HTMLElement>('.tab[data-panel="layers"]')!;
    const target = dock
      .shadowRoot!.querySelector<HTMLElement>('.tab[data-panel="color"]')!
      .getBoundingClientRect();
    const from = tab.getBoundingClientRect();
    const o = { bubbles: true, pointerId: 1, button: 0 };
    tab.dispatchEvent(
      new PointerEvent("pointerdown", { ...o, clientX: from.left + 5, clientY: from.top + 5 }),
    );
    tab.dispatchEvent(
      new PointerEvent("pointermove", { ...o, clientX: target.left + 2, clientY: target.top + 5 }),
    );
    await settle(root);
    tab.dispatchEvent(
      new PointerEvent("pointerup", { ...o, clientX: target.left + 2, clientY: target.top + 5 }),
    );
    await settle(root);
    expect(dock.layout.groups.map((g: { panels: string[] }) => g.panels)).toEqual([
      ["layers", "color", "swatches"],
    ]);
    expect(visible(root)).toEqual(["layers"]);
  });

  it("collapses to an icon strip with flyouts", async () => {
    const root = await mount(markup());
    const dock = $(root, "st-dock");
    dock.collapsed = true;
    await settle(root);
    const buttons = dock.shadowRoot!.querySelectorAll<HTMLElement>(".strip-btn");
    expect(buttons).toHaveLength(3);
    expect(visible(root)).toEqual([]);
    buttons[2]!.click();
    await settle(root);
    expect(dock.shadowRoot!.querySelector(".flyout")!.matches(":popover-open")).toBe(true);
    expect(visible(root)).toEqual(["layers"]);
  });

  it("remembers the layout with autosave", async () => {
    let root = await mount(markup(`autosave="t"`));
    let dock = $(root, "st-dock");
    (dock.shadowRoot!.querySelector('.tab[data-panel="swatches"]') as HTMLElement).focus();
    await userEvent.keyboard("{Alt>}{ArrowDown}{/Alt}");
    await settle(root);
    document.body.innerHTML = "";
    root = await mount(markup(`autosave="t"`));
    dock = $(root, "st-dock");
    expect(dock.layout.groups.map((g: { panels: string[] }) => g.panels)).toEqual([
      ["color"],
      ["layers", "swatches"],
    ]);
  });
});
