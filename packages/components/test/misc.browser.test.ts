import { afterEach, describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { $, mount, settle } from "./helpers.ts";

afterEach(() => {
  document.body.innerHTML = "";
});

describe("st-vector-field", () => {
  it("edits axes and keeps the ratio when linked", async () => {
    const root = await mount(
      `<st-vector-field label="Size" axes="w h" value="120 80" linkable linked></st-vector-field>`,
    );
    const vf = $(root, "st-vector-field");
    const onChange = vi.fn();
    vf.addEventListener("change", (e) => onChange((e as CustomEvent).detail.values));
    const [w] = vf.shadowRoot!.querySelectorAll("st-number-field");
    const input = w!.shadowRoot!.querySelector("input")!;
    await userEvent.click(input);
    await userEvent.keyboard("{Control>}a{/Control}240{Enter}");
    await settle(root);
    expect(vf.values).toEqual([240, 160]);
    expect(onChange).toHaveBeenCalledWith([240, 160]);
    vf.linked = false;
    await settle(root);
    await userEvent.click(input);
    await userEvent.keyboard("{Control>}a{/Control}100{Enter}");
    expect(vf.values).toEqual([100, 160]);
  });
});

describe("st-inline-edit", () => {
  it("renames with Enter and cancels with Escape", async () => {
    const root = await mount(`<st-inline-edit value="Frame 12" label="Name"></st-inline-edit>`);
    const el = $(root, "st-inline-edit");
    const onChange = vi.fn();
    el.addEventListener("change", (e) => onChange((e as CustomEvent).detail.value));
    el.focus();
    await userEvent.keyboard("{Enter}");
    await settle(root);
    await userEvent.keyboard("{Control>}a{/Control}Hero{Enter}");
    await settle(root);
    expect(el.value).toBe("Hero");
    expect(onChange).toHaveBeenCalledWith("Hero");
    el.dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));
    await settle(root);
    await userEvent.keyboard("{Control>}a{/Control}Nope{Escape}");
    await settle(root);
    expect(el.value).toBe("Hero");
  });
});

describe("st-breadcrumbs", () => {
  it("marks the current crumb, fires select, and folds when narrow", async () => {
    const root = await mount(`
      <st-breadcrumbs style="width:600px">
        <st-crumb value="project">Project</st-crumb>
        <st-crumb value="assets">Assets folder</st-crumb>
        <st-crumb value="icons">Icons and illustrations</st-crumb>
        <st-crumb value="ui">UI kit</st-crumb>
      </st-breadcrumbs>`);
    const crumbs = root.querySelectorAll<HTMLElement & { current: boolean }>("st-crumb");
    expect(crumbs[3]!.current).toBe(true);
    const onSelect = vi.fn();
    root.addEventListener("select", (e) => onSelect((e as CustomEvent).detail.value));
    crumbs[1]!.click();
    expect(onSelect).toHaveBeenCalledWith("assets");
    ($(root, "st-breadcrumbs") as HTMLElement).style.width = "180px";
    await vi.waitFor(() => expect(crumbs[1]!.hasAttribute("data-collapsed")).toBe(true));
    expect(crumbs[0]!.hasAttribute("data-collapsed")).toBe(false);
    expect(crumbs[3]!.hasAttribute("data-collapsed")).toBe(false);
  });
});

describe("st-zoom-control", () => {
  it("steps through presets and accepts typed values", async () => {
    const root = await mount(`<st-zoom-control value="100"></st-zoom-control>`);
    const zoom = $(root, "st-zoom-control");
    const [out, , zin] = zoom.shadowRoot!.querySelectorAll<HTMLElement>("button");
    zin!.click();
    expect(zoom.value).toBe(150);
    out!.click();
    out!.click();
    expect(zoom.value).toBe(66.67);
    const input = zoom.shadowRoot!.querySelector("input")!;
    await userEvent.click(input);
    await userEvent.keyboard("{Control>}a{/Control}250{Enter}");
    expect(zoom.value).toBe(250);
  });
});
