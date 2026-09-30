import { afterEach, describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { $, mount, settle } from "./helpers.ts";

afterEach(() => {
  document.body.innerHTML = "";
});

describe("st-checkbox / st-switch", () => {
  for (const tag of ["st-checkbox", "st-switch"]) {
    it(`${tag} toggles on click and Space, and reports to forms`, async () => {
      const root = await mount(`<form><${tag} name="grid" value="yes">Show grid</${tag}></form>`);
      const el = $(root, tag);
      const onChange = vi.fn();
      el.addEventListener("change", onChange);
      el.click();
      await settle(root);
      expect(el.checked).toBe(true);
      expect(new FormData($(root, "form")).get("grid")).toBe("yes");
      el.focus();
      await userEvent.keyboard(" ");
      await settle(root);
      expect(el.checked).toBe(false);
      expect(new FormData($(root, "form")).get("grid")).toBeNull();
      expect(onChange).toHaveBeenCalledTimes(2);
    });
  }

  it("indeterminate clears on toggle", async () => {
    const root = await mount(`<st-checkbox indeterminate>All</st-checkbox>`);
    const el = $(root, "st-checkbox");
    el.click();
    await settle(root);
    expect(el.indeterminate).toBe(false);
    expect(el.checked).toBe(true);
  });
});

describe("st-radio-group", () => {
  it("selects with click and arrows", async () => {
    const root = await mount(`
      <form><st-radio-group name="fmt" value="png" label="Format">
        <st-radio value="png">PNG</st-radio><st-radio value="jpg">JPG</st-radio><st-radio value="svg">SVG</st-radio>
      </st-radio-group></form>`);
    const group = $(root, "st-radio-group");
    const [png, jpg, svg] = root.querySelectorAll<HTMLElement & { checked: boolean }>("st-radio");
    expect(png!.checked).toBe(true);
    expect(png!.tabIndex).toBe(0);
    expect(jpg!.tabIndex).toBe(-1);
    svg!.click();
    await settle(root);
    expect(group.value).toBe("svg");
    svg!.focus();
    await userEvent.keyboard("{ArrowDown}");
    await settle(root);
    expect(group.value).toBe("png");
    expect(new FormData($(root, "form")).get("fmt")).toBe("png");
  });
});

describe("st-slider", () => {
  it("changes with keys and pointer", async () => {
    const root = await mount(`<st-slider label="Opacity" value="50" style="width:200px"></st-slider>`);
    const slider = $(root, "st-slider");
    const thumb = slider.shadowRoot!.querySelector(".thumb") as HTMLElement;
    expect(thumb.getAttribute("role")).toBe("slider");
    expect(thumb.getAttribute("aria-label")).toBe("Opacity");
    thumb.focus();
    await userEvent.keyboard("{ArrowRight}");
    expect(slider.value).toBe(51);
    await userEvent.keyboard("{End}");
    expect(slider.value).toBe(100);
    const track = slider.shadowRoot!.querySelector(".track")!.getBoundingClientRect();
    await userEvent.click(slider, {
      position: { x: track.left - slider.getBoundingClientRect().left + track.width / 4, y: 10 },
    });
    await settle(root);
    expect(slider.value).toBeGreaterThan(20);
    expect(slider.value).toBeLessThan(30);
  });

  it("range slider keeps start ≤ end", async () => {
    const root = await mount(`<st-range-slider start="20" end="30"></st-range-slider>`);
    const slider = $(root, "st-range-slider");
    const [start] = slider.shadowRoot!.querySelectorAll<HTMLElement>(".thumb");
    start!.focus();
    await userEvent.keyboard("{Shift>}{ArrowRight}{/Shift}");
    expect(slider.start).toBe(30);
    expect(slider.end).toBe(30);
  });
});

describe("st-select", () => {
  const markup = `
    <form><st-select name="blend" label="Blend" value="normal">
      <st-option value="normal">Normal</st-option>
      <st-option value="multiply">Multiply</st-option>
      <st-option value="screen" disabled>Screen</st-option>
      <st-option value="overlay">Overlay</st-option>
    </st-select></form>`;

  it("shows the selected label and opens a listbox", async () => {
    const root = await mount(markup);
    const select = $(root, "st-select");
    expect(select.shadowRoot!.querySelector(".value")!.textContent).toBe("Normal");
    select.click();
    await settle(root);
    const listbox = select.shadowRoot!.querySelector(".listbox") as HTMLElement;
    expect(listbox.matches(":popover-open")).toBe(true);
    expect(select.getAttribute("aria-activedescendant")).toBe(root.querySelector("st-option")!.id);
  });

  it("is keyboard operable and skips disabled options", async () => {
    const root = await mount(markup);
    const select = $(root, "st-select");
    const onChange = vi.fn();
    select.addEventListener("change", onChange);
    select.focus();
    await userEvent.keyboard("{ArrowDown}");
    await settle(root);
    await userEvent.keyboard("{ArrowDown}{ArrowDown}{Enter}");
    await settle(root);
    expect(select.value).toBe("overlay");
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(new FormData($(root, "form")).get("blend")).toBe("overlay");
    expect((select.shadowRoot!.querySelector(".listbox") as HTMLElement).matches(":popover-open")).toBe(
      false,
    );
  });

  it("picks with typeahead while closed", async () => {
    const root = await mount(markup);
    const select = $(root, "st-select");
    select.focus();
    await userEvent.keyboard("m");
    expect(select.value).toBe("multiply");
  });

  it("chooses an option on click", async () => {
    const root = await mount(markup);
    const select = $(root, "st-select");
    select.click();
    await settle(root);
    (root.querySelectorAll("st-option")[1] as HTMLElement).click();
    await settle(root);
    expect(select.value).toBe("multiply");
  });
});

describe("st-combobox", () => {
  const markup = `
    <st-combobox label="Font" value="inter">
      <st-option value="inter">Inter</st-option>
      <st-option value="dm-sans">DM Sans</st-option>
      <st-option value="dm-mono">DM Mono</st-option>
    </st-combobox>`;

  it("filters while typing and picks with Enter", async () => {
    const root = await mount(markup);
    const combo = $(root, "st-combobox");
    const input = combo.shadowRoot!.querySelector("input")!;
    expect(input.value).toBe("Inter");
    await userEvent.click(input);
    await userEvent.keyboard("{Control>}a{/Control}mono");
    await settle(root);
    const visible = [...root.querySelectorAll("st-option")].filter((o) => !o.hasAttribute("data-filtered"));
    expect(visible.map((o) => o.textContent)).toEqual(["DM Mono"]);
    await userEvent.keyboard("{Enter}");
    await settle(root);
    expect(combo.value).toBe("dm-mono");
    expect(input.value).toBe("DM Mono");
  });

  it("accepts custom values when allowed", async () => {
    const root = await mount(markup.replace("<st-combobox", "<st-combobox allow-custom"));
    const combo = $(root, "st-combobox");
    const input = combo.shadowRoot!.querySelector("input")!;
    await userEvent.click(input);
    await userEvent.keyboard("{Control>}a{/Control}Futura{Escape}{Enter}");
    await settle(root);
    expect(combo.value).toBe("Futura");
  });
});
