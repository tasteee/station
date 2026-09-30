import { afterEach, describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { moveItems, type TreeItem } from "../src/index.ts";
import { $, mount, settle } from "./helpers.ts";

afterEach(() => {
  document.body.innerHTML = "";
});

const data = (): TreeItem[] => [
  {
    id: "frame",
    label: "Frame",
    expanded: true,
    children: [
      { id: "title", label: "Title", visible: true },
      { id: "button", label: "Button", visible: false },
      { id: "group", label: "Group", children: [{ id: "icon", label: "Icon" }] },
    ],
  },
  { id: "bg", label: "Background", locked: true },
];

async function tree(attrs = "", items = data()) {
  const root = await mount(`<st-tree label="Layers" ${attrs} style="height:300px"></st-tree>`);
  const el = $(root, "st-tree");
  el.items = items;
  el.toggles = [
    {
      key: "visible",
      label: "Visibility",
      icon: "eye",
      offIcon: "eye-off",
      default: true,
      position: "start",
    },
  ];
  await settle(root);
  return { root, el, rows: () => [...el.shadowRoot!.querySelectorAll<HTMLElement>(".row")] };
}
const labels = (rows: HTMLElement[]) => rows.map((r) => r.querySelector(".label")?.textContent);

describe("st-tree", () => {
  it("renders expanded rows with ARIA levels", async () => {
    const { rows } = await tree();
    expect(labels(rows())).toEqual(["Frame", "Title", "Button", "Group", "Background"]);
    expect(rows()[1]!.getAttribute("aria-level")).toBe("2");
    expect(rows()[0]!.getAttribute("aria-expanded")).toBe("true");
  });

  it("selects with click, Mod+click and Shift+click", async () => {
    const { el, rows } = await tree();
    const onChange = vi.fn();
    el.addEventListener("change", onChange);
    await userEvent.click(rows()[1]!);
    expect(el.selection).toEqual(["title"]);
    await userEvent.click(rows()[3]!, { modifiers: ["Shift"] });
    expect(el.selection).toEqual(["title", "button", "group"]);
    await userEvent.click(rows()[2]!, { modifiers: ["ControlOrMeta"] });
    expect(el.selection).toEqual(["title", "group"]);
    expect(onChange).toHaveBeenCalledTimes(3);
  });

  it("navigates and expands with the keyboard", async () => {
    const { el, rows, root } = await tree();
    await userEvent.click(rows()[0]!);
    await userEvent.keyboard("{ArrowDown}{ArrowDown}{ArrowDown}");
    expect(el.selection).toEqual(["group"]);
    await userEvent.keyboard("{ArrowRight}");
    await settle(root);
    expect(labels(rows())).toContain("Icon");
    await userEvent.keyboard("{ArrowRight}");
    expect(el.selection).toEqual(["icon"]);
    await userEvent.keyboard("{ArrowLeft}");
    expect(el.selection).toEqual(["group"]);
    await userEvent.keyboard("{Home}");
    expect(el.selection).toEqual(["frame"]);
  });

  it("fires itemchange from toggle columns without selecting", async () => {
    const { el, rows } = await tree();
    const onItem = vi.fn();
    el.addEventListener("itemchange", (e) => onItem((e as CustomEvent).detail));
    const eye = rows()[2]!.querySelector(".toggle") as HTMLElement;
    expect(eye.getAttribute("aria-pressed")).toBe("false");
    eye.click();
    expect(onItem).toHaveBeenCalledWith({ id: "button", key: "visible", value: true });
    expect(el.selection ?? []).toEqual([]);
  });

  it("renames with F2", async () => {
    const { el, rows, root } = await tree("renamable");
    const onRename = vi.fn();
    el.addEventListener("rename", (e) => onRename((e as CustomEvent).detail));
    await userEvent.click(rows()[1]!);
    await userEvent.keyboard("{F2}");
    await settle(root);
    await userEvent.keyboard("{Control>}a{/Control}Heading{Enter}");
    expect(onRename).toHaveBeenCalledWith({ id: "title", label: "Heading" });
  });

  it("drags rows and reports a move", async () => {
    const { el, rows, root } = await tree("reorderable");
    const onMove = vi.fn();
    el.addEventListener("move", (e) => onMove((e as CustomEvent).detail));
    const vp = el.shadowRoot!.querySelector(".viewport") as HTMLElement;
    const from = rows()[4]!.getBoundingClientRect();
    const to = rows()[1]!.getBoundingClientRect();
    const opts = { bubbles: true, composed: true, pointerId: 1, button: 0, clientX: from.left + 40 };
    rows()[4]!
      .querySelector(".label")!
      .dispatchEvent(new PointerEvent("pointerdown", { ...opts, clientY: from.top + 5 }));
    vp.dispatchEvent(new PointerEvent("pointermove", { ...opts, clientY: from.top - 20 }));
    vp.dispatchEvent(new PointerEvent("pointermove", { ...opts, clientY: to.top + 3 }));
    await settle(root);
    expect(rows()[1]!.getAttribute("data-drop")).toBe("before");
    vp.dispatchEvent(new PointerEvent("pointerup", { ...opts, clientY: to.top + 3 }));
    expect(onMove).toHaveBeenCalledWith({ ids: ["bg"], target: "title", position: "before" });
    const moved = moveItems(el.items, onMove.mock.calls[0]![0]);
    expect(moved.map((i) => i.id)).toEqual(["frame"]);
    expect(moved[0]!.children!.map((i) => i.id)).toEqual(["bg", "title", "button", "group"]);
  });

  it("virtualizes large trees", async () => {
    const many = Array.from({ length: 10000 }, (_, i) => ({ id: `n${i}`, label: `Layer ${i}` }));
    const { el, rows, root } = await tree("", many);
    expect(rows().length).toBeLessThan(60);
    const vp = el.shadowRoot!.querySelector(".viewport") as HTMLElement;
    vp.scrollTop = 28 * 5000;
    vp.dispatchEvent(new Event("scroll"));
    await settle(root);
    expect(labels(rows())).toContain("Layer 5005");
  });
});
