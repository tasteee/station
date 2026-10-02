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

describe("st-split collapse (rail, hide, toggle) and cards", () => {
  const labeled = (extra = "", pane = "") => `
    <st-split ${extra} style="width:800px;height:200px">
      <st-pane id="layers" size="200" collapsible label="Layers" ${pane}>
        <st-row><span>Layers</span><st-pane-toggle></st-pane-toggle></st-row>
      </st-pane>
      <st-pane>Canvas</st-pane>
    </st-split>`;

  it("collapses a labeled pane to a rail and expands it from the rail", async () => {
    const root = await mount(labeled('autosave="t1"'));
    const split = $(root, "st-split");
    const pane = $(root, "#layers");
    const onChange = vi.fn();
    split.addEventListener("change", onChange);
    const toggle = $(root, "st-pane-toggle").shadowRoot!.querySelector("button")!;
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(toggle.getAttribute("aria-label")).toBe("Collapse Layers");
    toggle.click();
    await settle(root);
    expect(pane.collapsed).toBe(true);
    expect(widths(root)[0]).toBe(40);
    const rail = pane.shadowRoot!.querySelector("button.rail") as HTMLButtonElement;
    expect(rail.getAttribute("aria-label")).toBe("Expand Layers");
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(JSON.parse(localStorage.getItem("st-split:t1")!)[0].collapsed).toBe(true);
    rail.click();
    await settle(root);
    expect(pane.collapsed).toBe(false);
    expect(widths(root)[0]).toBe(200);
    expect(onChange).toHaveBeenCalledTimes(2);
  });

  it("hides a pane entirely with collapse=hide and toggles it from elsewhere with for=", async () => {
    const root = await mount(
      `${labeled("", 'collapse="hide"')}<st-pane-toggle for="layers"></st-pane-toggle>`,
    );
    const split = $(root, "st-split");
    const outside = root.querySelector(":scope > st-pane-toggle")!.shadowRoot!.querySelector("button")!;
    outside.click();
    await settle(root);
    const pane = $(root, "#layers");
    expect(getComputedStyle(pane).display).toBe("none");
    const handle = split.shadowRoot!.querySelector(".handle") as HTMLElement;
    expect(handle.hidden).toBe(true);
    expect(outside.getAttribute("aria-expanded")).toBe("false");
    outside.click();
    await settle(root);
    expect(getComputedStyle(pane).display).not.toBe("none");
    expect(handle.hidden).toBe(false);
  });

  it("restores the collapsed state from autosave", async () => {
    localStorage.setItem(
      "st-split:t2",
      JSON.stringify([
        { size: 220, collapsed: true },
        { size: null, collapsed: false },
      ]),
    );
    const root = await mount(labeled('autosave="t2"'));
    expect($(root, "#layers").collapsed).toBe(true);
    expect(widths(root)[0]).toBe(40);
  });

  it("kind=cards lays panes out as rounded cards with gaps", async () => {
    const root = await mount(labeled('kind="cards"'));
    const [a, b] = [...root.querySelectorAll("st-pane")] as HTMLElement[];
    expect(a!.hasAttribute("data-card")).toBe(true);
    expect(Number.parseFloat(getComputedStyle(a!).borderTopLeftRadius)).toBeGreaterThan(8);
    const gap = b!.getBoundingClientRect().left - a!.getBoundingClientRect().right;
    expect(Math.round(gap)).toBe(12);
  });
});
