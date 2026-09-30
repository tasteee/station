import { afterEach, describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { $, mount, settle } from "./helpers.ts";

afterEach(() => {
  document.body.innerHTML = "";
});

const inner = (el: Element) => el.shadowRoot!.querySelector("input, textarea") as HTMLInputElement;

describe("st-text-field", () => {
  it("syncs value, fires input and change, and joins forms", async () => {
    const root = await mount(`<form><st-text-field name="title" label="Title"></st-text-field></form>`);
    const field = $(root, "st-text-field");
    const onInput = vi.fn();
    const onChange = vi.fn();
    field.addEventListener("input", onInput);
    field.addEventListener("change", onChange);
    await userEvent.click(inner(field));
    await userEvent.keyboard("Hello");
    expect(field.value).toBe("Hello");
    expect(onInput).toHaveBeenCalledTimes(5);
    await userEvent.keyboard("{Tab}");
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(new FormData($(root, "form")).get("title")).toBe("Hello");
    expect(inner(field).getAttribute("aria-label")).toBe("Title");
  });

  it("reflects programmatic values into the input", async () => {
    const root = await mount(`<st-text-field></st-text-field>`);
    const field = $(root, "st-text-field");
    field.value = "Frame 1";
    await settle(root);
    expect(inner(field).value).toBe("Frame 1");
  });

  it("is invalid when required and empty", async () => {
    const root = await mount(`<form><st-text-field name="x" required></st-text-field></form>`);
    expect(($(root, "form") as unknown as HTMLFormElement).checkValidity()).toBe(false);
    $(root, "st-text-field").value = "ok";
    await settle(root);
    expect(($(root, "form") as unknown as HTMLFormElement).checkValidity()).toBe(true);
  });
});

describe("st-search-field", () => {
  it("clears on Escape", async () => {
    const root = await mount(`<st-search-field label="Search"></st-search-field>`);
    const field = $(root, "st-search-field");
    await userEvent.click(inner(field));
    await userEvent.keyboard("abc");
    expect(field.value).toBe("abc");
    await userEvent.keyboard("{Escape}");
    expect(field.value).toBe("");
  });
});

describe("st-number-field", () => {
  async function numberField(attrs = "") {
    const root = await mount(`<st-number-field label="Width" prefix="W" ${attrs}></st-number-field>`);
    return $(root, "st-number-field");
  }

  it("steps with arrow keys and modifiers", async () => {
    const field = await numberField(`value="10"`);
    const onChange = vi.fn();
    field.addEventListener("change", onChange);
    await userEvent.click(inner(field));
    await userEvent.keyboard("{ArrowUp}");
    expect(field.value).toBe(11);
    await userEvent.keyboard("{Shift>}{ArrowUp}{/Shift}");
    expect(field.value).toBe(21);
    await userEvent.keyboard("{Alt>}{ArrowDown}{/Alt}");
    expect(field.value).toBeCloseTo(20.9);
    expect(onChange).toHaveBeenCalledTimes(3);
  });

  it("evaluates math on Enter and clamps to min/max", async () => {
    const field = await numberField(`value="10" min="0" max="100"`);
    await userEvent.click(inner(field));
    await userEvent.keyboard("{Control>}a{/Control}12*2{Enter}");
    expect(field.value).toBe(24);
    await userEvent.keyboard("{Control>}a{/Control}500{Enter}");
    expect(field.value).toBe(100);
  });

  it("reverts invalid input and Escape", async () => {
    const field = await numberField(`value="10"`);
    await userEvent.click(inner(field));
    await userEvent.keyboard("{Control>}a{/Control}abc{Enter}");
    expect(field.value).toBe(10);
    expect(inner(field).value).toBe("10");
    await userEvent.keyboard("{Control>}a{/Control}99{Escape}");
    expect(field.value).toBe(10);
  });

  it("scrubs by dragging the prefix", async () => {
    const field = await numberField(`value="10"`);
    const prefix = field.shadowRoot!.querySelector(".prefix") as HTMLElement;
    const onInput = vi.fn();
    const onChange = vi.fn();
    field.addEventListener("input", onInput);
    field.addEventListener("change", onChange);
    const box = prefix.getBoundingClientRect();
    const y = box.top + box.height / 2;
    const x = box.left + box.width / 2;
    const opts = {
      bubbles: true,
      pointerId: 1,
      button: 0,
      clientY: y,
      isPrimary: true,
      pointerType: "mouse",
    };
    prefix.dispatchEvent(new PointerEvent("pointerdown", { ...opts, clientX: x }));
    prefix.dispatchEvent(new PointerEvent("pointermove", { ...opts, clientX: x + 20 }));
    prefix.dispatchEvent(new PointerEvent("pointerup", { ...opts, clientX: x + 20 }));
    await settle();
    expect(field.value).toBe(30);
    expect(onInput).toHaveBeenCalled();
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("shows Mixed for multi-selection", async () => {
    const field = await numberField(`mixed`);
    expect(inner(field).placeholder).toBe("Mixed");
    expect(inner(field).getAttribute("role")).toBe("spinbutton");
  });
});

describe("st-textarea", () => {
  it("grows with content", async () => {
    const root = await mount(`<st-textarea rows="2" style="width:200px"></st-textarea>`);
    const area = $(root, "st-textarea");
    const before = area.getBoundingClientRect().height;
    area.value = "1\n2\n3\n4\n5";
    await settle(root);
    expect(area.getBoundingClientRect().height).toBeGreaterThan(before);
  });
});
