import { afterEach, describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { $, mount, settle } from "./helpers.ts";

afterEach(() => {
  document.body.innerHTML = "";
});

describe("st-button", () => {
  it("is focusable, has role=button, and clicks on Enter and Space", async () => {
    const root = await mount(`<st-button>Save</st-button>`);
    const btn = $(root, "st-button");
    const onClick = vi.fn();
    btn.addEventListener("click", onClick);
    expect(btn.tabIndex).toBe(0);
    btn.focus();
    await userEvent.keyboard("{Enter}");
    await userEvent.keyboard(" ");
    expect(onClick).toHaveBeenCalledTimes(2);
    expect(btn.getAttribute("data-kind")).toBe("outline");
  });

  it("swallows clicks and leaves the tab order when disabled", async () => {
    const root = await mount(`<st-button disabled>Save</st-button>`);
    const btn = $(root, "st-button");
    const onClick = vi.fn();
    root.addEventListener("click", onClick);
    btn.click();
    expect(onClick).not.toHaveBeenCalled();
    expect(btn.hasAttribute("tabindex")).toBe(false);
  });

  it("submits its form", async () => {
    const root = await mount(`<form><st-button type="submit">Go</st-button></form>`);
    const onSubmit = vi.fn((e: Event) => e.preventDefault());
    $(root, "form").addEventListener("submit", onSubmit);
    $(root, "st-button").click();
    expect(onSubmit).toHaveBeenCalled();
  });

  it("inherits kind from a group", async () => {
    const root = await mount(
      `<st-button-group kind="ghost"><st-button>A</st-button><st-button kind="solid">B</st-button></st-button-group>`,
    );
    const [a, b] = root.querySelectorAll("st-button");
    expect(a!.getAttribute("data-kind")).toBe("ghost");
    expect(b!.getAttribute("data-kind")).toBe("solid");
  });
});

describe("st-icon-button", () => {
  it("uses label as its accessible name and shows a tooltip", async () => {
    const root = await mount(
      `<st-icon-button icon="plus" label="Add layer" shortcut="Mod+N"></st-icon-button>`,
    );
    const btn = $(root, "st-icon-button");
    await userEvent.hover(btn);
    await vi.waitFor(() => {
      const bubble = document.querySelector("st-tooltip-bubble") as HTMLElement;
      expect(bubble?.matches(":popover-open")).toBe(true);
      expect(bubble.shadowRoot!.textContent).toContain("Add layer");
    });
    await userEvent.unhover(btn);
    expect((document.querySelector("st-tooltip-bubble") as HTMLElement).matches(":popover-open")).toBe(false);
  });
});

describe("st-toggle-button", () => {
  it("toggles pressed and fires change", async () => {
    const root = await mount(`<st-toggle-button icon="bold" label="Bold"></st-toggle-button>`);
    const btn = $(root, "st-toggle-button");
    const onChange = vi.fn();
    btn.addEventListener("change", onChange);
    btn.click();
    await settle(root);
    expect(btn.pressed).toBe(true);
    expect(btn.hasAttribute("pressed")).toBe(true);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(btn.hasAttribute("data-icon-only")).toBe(true);
  });
});

describe("st-toolbar", () => {
  it("has one tab stop and arrow-key navigation", async () => {
    const root = await mount(`
      <st-toolbar label="Tools">
        <st-icon-button icon="a" label="A"></st-icon-button>
        <st-icon-button icon="b" label="B" disabled></st-icon-button>
        <st-icon-button icon="c" label="C"></st-icon-button>
      </st-toolbar>`);
    const [a, , c] = root.querySelectorAll<HTMLElement>("st-icon-button");
    expect(a!.tabIndex).toBe(0);
    expect(c!.tabIndex).toBe(-1);
    a!.focus();
    await userEvent.keyboard("{ArrowRight}");
    expect(document.activeElement).toBe(c);
    expect(c!.getAttribute("data-kind")).toBe("ghost");
  });
});

describe("st-segmented-control", () => {
  it("selects on click and arrow keys, and reports its value to forms", async () => {
    const root = await mount(`
      <form>
        <st-segmented-control name="align" value="left" label="Align">
          <st-segment value="left">Left</st-segment>
          <st-segment value="center">Center</st-segment>
          <st-segment value="right">Right</st-segment>
        </st-segmented-control>
      </form>`);
    const control = $(root, "st-segmented-control");
    const [left, center, right] = root.querySelectorAll<HTMLElement & { selected: boolean }>("st-segment");
    const onChange = vi.fn();
    control.addEventListener("change", onChange);
    expect(left!.selected).toBe(true);

    center!.click();
    await settle(root);
    expect(control.value).toBe("center");
    expect(new FormData($(root, "form")).get("align")).toBe("center");

    center!.focus();
    await userEvent.keyboard("{ArrowRight}");
    await settle(root);
    expect(control.value).toBe("right");
    expect(right!.selected).toBe(true);
    expect(onChange).toHaveBeenCalledTimes(2);
  });
});

describe("icon placement", () => {
  it("centers the icon in every icon-only button, toggle and segment", async () => {
    const root = await mount(`
      <st-icon-button icon="x" label="Close"></st-icon-button>
      <st-toggle-button icon="x" label="Bold"></st-toggle-button>
      <st-toggle-button icon="x" label="Big" size="large"></st-toggle-button>
      <st-segmented-control label="Align" value="a"><st-segment value="a" icon="x" label="Left"></st-segment></st-segmented-control>`);
    for (const host of root.querySelectorAll<HTMLElement>("st-icon-button, st-toggle-button, st-segment")) {
      const icon = host.shadowRoot!.querySelector("st-icon")!.getBoundingClientRect();
      const box = host.getBoundingClientRect();
      expect(Math.abs(icon.left + icon.width / 2 - (box.left + box.width / 2)), host.localName).toBeLessThan(
        0.5,
      );
      expect(Math.abs(icon.top + icon.height / 2 - (box.top + box.height / 2)), host.localName).toBeLessThan(
        0.5,
      );
    }
  });
});
