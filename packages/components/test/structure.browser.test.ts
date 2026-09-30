import { afterEach, describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { $, mount, settle } from "./helpers.ts";

afterEach(() => {
  document.body.innerHTML = "";
});

describe("css-only structure", () => {
  it("panel header lays out as a row and badge is a pill", async () => {
    const root = await mount(`
      <st-panel style="height:200px"><st-panel-header divided><st-heading>Layers</st-heading><st-badge>12</st-badge></st-panel-header></st-panel>`);
    const header = $(root, "st-panel-header");
    expect(getComputedStyle(header).display).toBe("flex");
    expect(getComputedStyle(header).borderBottomWidth).toBe("1px");
    expect($(root, "st-badge").getBoundingClientRect().height).toBe(16);
  });
});

describe("st-section", () => {
  it("collapses and expands from its header", async () => {
    const root = await mount(
      `<st-section heading="Effects" collapsible><st-text>Body</st-text></st-section>`,
    );
    const section = $(root, "st-section");
    const button = section.shadowRoot!.querySelector("button")!;
    const onOpen = vi.fn();
    section.addEventListener("openchange", onOpen);
    expect(button.getAttribute("aria-expanded")).toBe("true");
    button.click();
    await settle(root);
    expect(section.collapsed).toBe(true);
    expect(button.getAttribute("aria-expanded")).toBe("false");
    expect(onOpen.mock.calls[0]![0].detail).toEqual({ open: false });
    button.focus();
    await userEvent.keyboard("{Enter}");
    await settle(root);
    expect(section.collapsed).toBe(false);
  });
});

describe("st-property-row", () => {
  it("names unlabeled controls and focuses them from the label", async () => {
    const root = await mount(
      `<st-property-row label="Opacity"><st-number-field value="1"></st-number-field></st-property-row>`,
    );
    const field = $(root, "st-number-field");
    expect(field.getAttribute("label")).toBe("Opacity");
    (root.querySelector("st-property-row")!.shadowRoot!.querySelector(".label") as HTMLElement).click();
    expect(document.activeElement).toBe(field);
  });
});

describe("st-tabs", () => {
  const markup = `
    <st-tabs value="design" label="Inspector">
      <st-tab value="design">Design</st-tab>
      <st-tab value="prototype">Prototype</st-tab>
      <st-tab value="inspect" disabled>Inspect</st-tab>
      <st-tab-panel value="design"><p>Design panel</p></st-tab-panel>
      <st-tab-panel value="prototype"><p>Prototype panel</p></st-tab-panel>
    </st-tabs>`;

  it("shows only the selected panel", async () => {
    const root = await mount(markup);
    const [design, proto] = root.querySelectorAll("st-tab-panel");
    expect(design!.getBoundingClientRect().height).toBeGreaterThan(0);
    expect(proto!.assignedSlot).toBeNull();
  });

  it("switches with click and arrow keys", async () => {
    const root = await mount(markup);
    const tabs = $(root, "st-tabs");
    const onChange = vi.fn();
    tabs.addEventListener("change", onChange);
    const [design, proto] = root.querySelectorAll<HTMLElement & { selected: boolean }>("st-tab");
    proto!.click();
    await settle(root);
    expect(tabs.value).toBe("prototype");
    expect(proto!.selected).toBe(true);
    expect(root.querySelectorAll("st-tab-panel")[1]!.assignedSlot).not.toBeNull();
    proto!.focus();
    await userEvent.keyboard("{ArrowRight}");
    await settle(root);
    expect(tabs.value).toBe("design");
    expect(document.activeElement).toBe(design);
    expect(onChange).toHaveBeenCalledTimes(2);
  });
});
