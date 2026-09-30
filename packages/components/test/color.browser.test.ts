import { afterEach, describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { $, mount, settle } from "./helpers.ts";

afterEach(() => {
  document.body.innerHTML = "";
});

describe("st-color-picker", () => {
  it("picks saturation/brightness from the area", async () => {
    const root = await mount(`<st-color-picker value="#ff0000"></st-color-picker>`);
    const picker = $(root, "st-color-picker");
    const onChange = vi.fn();
    picker.addEventListener("change", onChange);
    const area = picker.shadowRoot!.querySelector(".area") as HTMLElement;
    const r = area.getBoundingClientRect();
    const opts = { bubbles: true, pointerId: 1, button: 0 };
    area.dispatchEvent(new PointerEvent("pointerdown", { ...opts, clientX: r.left, clientY: r.top }));
    area.dispatchEvent(new PointerEvent("pointerup", opts));
    await settle(root);
    expect(picker.value).toBe("#ffffff");
    area.dispatchEvent(new PointerEvent("pointerdown", { ...opts, clientX: r.right, clientY: r.bottom }));
    area.dispatchEvent(new PointerEvent("pointerup", opts));
    await settle(root);
    expect(picker.value).toBe("#000000");
    expect(onChange).toHaveBeenCalledTimes(2);
  });

  it("keeps hue for grays and steps hue with the keyboard", async () => {
    const root = await mount(`<st-color-picker value="#3366cc"></st-color-picker>`);
    const picker = $(root, "st-color-picker");
    const hue = picker.shadowRoot!.querySelector(".hue") as HTMLElement;
    expect(hue.getAttribute("aria-valuenow")).toBe("220");
    hue.focus();
    await userEvent.keyboard("{Shift>}{ArrowRight}{/Shift}");
    await settle(root);
    expect(hue.getAttribute("aria-valuenow")).toBe("230");
    picker.value = "#808080";
    await settle(root);
    expect(hue.getAttribute("aria-valuenow")).toBe("230");
  });

  it("supports alpha", async () => {
    const root = await mount(`<st-color-picker value="#3366cc80" alpha></st-color-picker>`);
    const alpha = $(root, "st-color-picker").shadowRoot!.querySelector(".alpha") as HTMLElement;
    expect(alpha.getAttribute("aria-valuenow")).toBe("50");
    alpha.focus();
    await userEvent.keyboard("{End}");
    await settle(root);
    expect($(root, "st-color-picker").value).toBe("#3366cc");
  });
});

describe("st-color-field", () => {
  it("edits hex and opacity and opens a picker", async () => {
    const root = await mount(`<st-color-field label="Fill" value="#3366cc" alpha></st-color-field>`);
    const field = $(root, "st-color-field");
    const onChange = vi.fn();
    field.addEventListener("change", onChange);
    const hex = field.shadowRoot!.querySelector(".hex") as HTMLInputElement;
    expect(hex.value).toBe("3366CC");
    await userEvent.click(hex);
    await userEvent.keyboard("{Control>}a{/Control}ff8800{Enter}");
    await settle(root);
    expect(field.value).toBe("#ff8800");
    expect(onChange).toHaveBeenCalledTimes(1);
    (field.shadowRoot!.querySelector(".swatch") as HTMLElement).click();
    await settle(root);
    expect(field.shadowRoot!.querySelector(".popover")!.matches(":popover-open")).toBe(true);
    expect(field.shadowRoot!.querySelector("st-color-picker")).not.toBeNull();
  });
});

describe("st-swatches", () => {
  it("selects with click and arrows", async () => {
    const root = await mount(`
      <st-swatches value="#ff0000" label="Swatches">
        <st-color-swatch color="#ff0000"></st-color-swatch>
        <st-color-swatch color="#00ff00"></st-color-swatch>
        <st-color-swatch color="#0000ff"></st-color-swatch>
      </st-swatches>`);
    const group = $(root, "st-swatches");
    const [red, green, blue] = root.querySelectorAll<HTMLElement & { selected: boolean }>("st-color-swatch");
    expect(red!.selected).toBe(true);
    blue!.click();
    await settle(root);
    expect(group.value).toBe("#0000ff");
    blue!.focus();
    await userEvent.keyboard("{ArrowLeft}");
    await settle(root);
    expect(group.value).toBe("#00ff00");
    expect(green!.selected).toBe(true);
  });
});
