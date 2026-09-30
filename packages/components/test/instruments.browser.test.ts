import { afterEach, describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { niceStep } from "../src/ruler/ruler.tsx";
import { $, mount, settle } from "./helpers.ts";

afterEach(() => {
  document.body.innerHTML = "";
});

describe("st-ruler", () => {
  it("picks readable label steps", () => {
    expect(niceStep(1, 56, "number")).toBe(100);
    expect(niceStep(4, 56, "number")).toBe(20);
    expect(niceStep(0.1, 56, "number")).toBe(1000);
    expect(niceStep(20, 56, "time")).toBe(5);
    expect(niceStep(1, 56, "time")).toBe(60);
  });

  it("draws to a canvas and maps positions back to values", async () => {
    const root = await mount(`<st-ruler zoom="2" offset="-50" style="width:400px"></st-ruler>`);
    const ruler = $(root, "st-ruler");
    const canvas = ruler.shadowRoot!.querySelector("canvas")!;
    expect(canvas.width).toBeGreaterThanOrEqual(400);
    const left = ruler.getBoundingClientRect().left;
    expect(ruler.valueAt(left + 100)).toBe(0);
  });
});

describe("st-knob", () => {
  it("steps with keys, resets on double-click, reports ARIA", async () => {
    const root = await mount(
      `<st-knob label="Gain" value="50" min="0" max="100" step="1" default="75" unit="%"></st-knob>`,
    );
    const knob = $(root, "st-knob");
    const onChange = vi.fn();
    knob.addEventListener("change", onChange);
    knob.focus();
    await userEvent.keyboard("{ArrowUp}{Shift>}{ArrowUp}{/Shift}");
    expect(knob.value).toBe(61);
    knob.dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));
    await settle(root);
    expect(knob.value).toBe(75);
    expect(onChange).toHaveBeenCalledTimes(3);
  });

  it("drags vertically", async () => {
    const root = await mount(`<st-knob label="Cutoff" value="0" min="0" max="100"></st-knob>`);
    const knob = $(root, "st-knob");
    const opts = { bubbles: true, pointerId: 1, button: 0, clientX: 10 };
    knob.dispatchEvent(new PointerEvent("pointerdown", { ...opts, clientY: 300 }));
    knob.dispatchEvent(new PointerEvent("pointermove", { ...opts, clientY: 200 }));
    knob.dispatchEvent(new PointerEvent("pointerup", { ...opts, clientY: 200 }));
    expect(knob.value).toBe(50);
  });
});

describe("st-meter", () => {
  it("fills to the level", async () => {
    const root = await mount(`<st-meter label="Master" value="-27" peak="-3"></st-meter>`);
    const level = $(root, "st-meter").shadowRoot!.querySelector(".level") as HTMLElement;
    expect(level.style.getPropertyValue("--_level")).toBe("50%");
    expect($(root, "st-meter").shadowRoot!.querySelector(".peak")!.hasAttribute("data-hot")).toBe(true);
  });
});

describe("st-command-palette", () => {
  const commands = [
    { id: "new", label: "New Document", group: "File", shortcut: "Mod+N" },
    { id: "flatten", label: "Flatten Image", group: "Layer", keywords: ["merge"] },
    { id: "group", label: "Group Layers", group: "Layer", shortcut: "Mod+G" },
  ];

  it("opens with its hotkey, filters fuzzily and runs a command", async () => {
    const root = await mount(`<st-command-palette hotkey="Mod+K"></st-command-palette>`);
    const palette = $(root, "st-command-palette");
    palette.commands = commands;
    const onSelect = vi.fn();
    palette.addEventListener("select", (e) => onSelect((e as CustomEvent).detail.id));
    await userEvent.keyboard("{ControlOrMeta>}k{/ControlOrMeta}");
    await settle(root);
    expect(palette.open).toBe(true);
    await vi.waitFor(() => expect(palette.shadowRoot!.activeElement?.localName).toBe("input"));
    await userEvent.keyboard("gl");
    await settle(root);
    const labels = [...palette.shadowRoot!.querySelectorAll(".item .label")].map((n) => n.textContent);
    expect(labels[0]).toBe("Group Layers");
    await userEvent.keyboard("{Enter}");
    expect(onSelect).toHaveBeenCalledWith("group");
    await settle(root);
    expect(palette.open).toBe(false);
  });

  it("matches keywords", async () => {
    const root = await mount(`<st-command-palette open></st-command-palette>`);
    const palette = $(root, "st-command-palette");
    palette.commands = commands;
    await settle(root);
    await vi.waitFor(() => expect(palette.shadowRoot!.activeElement?.localName).toBe("input"));
    await userEvent.keyboard("merge");
    await settle(root);
    expect(palette.shadowRoot!.querySelector(".item .label")!.textContent).toBe("Flatten Image");
  });
});
