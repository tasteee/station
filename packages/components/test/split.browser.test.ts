import { afterEach, describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { $, mount, settle } from "./helpers.ts";

afterEach(() => {
  document.body.innerHTML = "";
  localStorage.clear();
});

const markup = (extra = "") => `
  <st-split ${extra} style="width:800px;height:200px">
    <st-pane size="200" min="100" max="400" collapsible>Left</st-pane>
    <st-pane>Center</st-pane>
    <st-pane size="240">Right</st-pane>
  </st-split>`;

const widths = (root: Element) =>
  [...root.querySelectorAll("st-pane")].map((p) => Math.round(p.getBoundingClientRect().width));

describe("st-split", () => {
  it("lays out fixed and filling panes with 1px handles", async () => {
    const root = await mount(markup());
    expect(widths(root)).toEqual([200, 800 - 200 - 240 - 2, 240]);
    expect($(root, "st-split").shadowRoot!.querySelectorAll('[role="separator"]')).toHaveLength(2);
  });

  it("resizes by dragging within min/max", async () => {
    const root = await mount(markup());
    const split = $(root, "st-split");
    const onChange = vi.fn();
    split.addEventListener("change", onChange);
    const handle = split.shadowRoot!.querySelector(".handle") as HTMLElement;
    const x = handle.getBoundingClientRect().left;
    const opts = { bubbles: true, pointerId: 1, button: 0, clientY: 50 };
    handle.dispatchEvent(new PointerEvent("pointerdown", { ...opts, clientX: x }));
    handle.dispatchEvent(new PointerEvent("pointermove", { ...opts, clientX: x + 50 }));
    handle.dispatchEvent(new PointerEvent("pointermove", { ...opts, clientX: x + 500 }));
    handle.dispatchEvent(new PointerEvent("pointerup", { ...opts, clientX: x + 500 }));
    await settle(root);
    expect(widths(root)[0]).toBe(400);
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("resizes the fixed pane after the handle in reverse", async () => {
    const root = await mount(markup());
    const handles = $(root, "st-split").shadowRoot!.querySelectorAll<HTMLElement>(".handle");
    handles[1]!.focus();
    await userEvent.keyboard("{ArrowLeft}");
    await settle(root);
    expect(widths(root)[2]).toBe(248);
  });

  it("collapses on double-click and Enter", async () => {
    const root = await mount(markup());
    const handle = $(root, "st-split").shadowRoot!.querySelector(".handle") as HTMLElement;
    handle.dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));
    await settle(root);
    expect(widths(root)[0]).toBe(0);
    handle.focus();
    await userEvent.keyboard("{Enter}");
    await settle(root);
    expect(widths(root)[0]).toBe(200);
  });

  it("remembers sizes with autosave", async () => {
    let root = await mount(markup(`autosave="test"`));
    const handle = $(root, "st-split").shadowRoot!.querySelector(".handle") as HTMLElement;
    handle.focus();
    await userEvent.keyboard("{Shift>}{ArrowRight}{/Shift}");
    document.body.innerHTML = "";
    root = await mount(markup(`autosave="test"`));
    expect(widths(root)[0]).toBe(232);
  });
});
