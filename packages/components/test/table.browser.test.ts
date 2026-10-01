import { afterEach, describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { updateRow } from "../src/index.ts";
import { $, mount, settle } from "./helpers.ts";

afterEach(() => {
  document.body.innerHTML = "";
});

const columns = [
  { key: "name", label: "Name", width: 160, sortable: true, editable: true },
  {
    key: "size",
    label: "Size",
    width: 80,
    type: "number",
    sortable: true,
    editable: true,
    format: (v: unknown) => `${v} KB`,
  },
  { key: "kind", label: "Kind", width: 100 },
];
const rows = () => [
  { id: "a", name: "logo.svg", size: 12, kind: "Vector" },
  { id: "b", name: "hero.png", size: 840, kind: "Image" },
  { id: "c", name: "icon.png", size: 4, kind: "Image" },
];

async function table(attrs = "") {
  const root = await mount(
    `<st-data-table label="Assets" ${attrs} style="height:240px;width:400px"></st-data-table>`,
  );
  const el = $(root, "st-data-table");
  el.columns = columns;
  el.rows = rows();
  await settle(root);
  const cells = () =>
    [...el.shadowRoot!.querySelectorAll(".tr")].map((tr) =>
      [...tr.querySelectorAll(".td")].map((td) => td.textContent),
    );
  return { root, el, cells };
}

describe("st-data-table", () => {
  it("renders formatted cells and ARIA grid structure", async () => {
    const { el, cells } = await table();
    expect(cells()[0]).toEqual(["logo.svg", "12 KB", "Vector"]);
    const grid = el.shadowRoot!.querySelector('[role="grid"]')!;
    expect(grid.getAttribute("aria-rowcount")).toBe("4");
  });

  it("sorts on header click: ascending → descending → none", async () => {
    const { el, cells, root } = await table();
    const onSort = vi.fn();
    el.addEventListener("sortchange", (e) => onSort((e as CustomEvent).detail));
    const sizeHeader = el.shadowRoot!.querySelectorAll<HTMLElement>(".th")[1]!;
    sizeHeader.click();
    await settle(root);
    expect(cells().map((r) => r[0])).toEqual(["icon.png", "logo.svg", "hero.png"]);
    sizeHeader.click();
    await settle(root);
    expect(cells().map((r) => r[0])).toEqual(["hero.png", "logo.svg", "icon.png"]);
    expect(sizeHeader.getAttribute("aria-sort")).toBe("descending");
    sizeHeader.click();
    await settle(root);
    expect(cells().map((r) => r[0])).toEqual(["logo.svg", "hero.png", "icon.png"]);
    expect(onSort).toHaveBeenCalledTimes(3);
  });

  it("navigates cells and selects rows with the keyboard", async () => {
    const { el } = await table();
    const firstCell = el.shadowRoot!.querySelector<HTMLElement>(".td")!;
    firstCell.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, button: 0 }));
    expect(el.selection).toEqual(["a"]);
    await userEvent.keyboard("{ArrowDown}{Shift>}{ArrowDown}{/Shift}");
    expect(el.selection).toEqual(["b", "c"]);
    await userEvent.keyboard("{ControlOrMeta>}a{/ControlOrMeta}");
    expect(el.selection).toEqual(["a", "b", "c"]);
  });

  it("edits a cell by typing and reports cellchange", async () => {
    const { el, root } = await table();
    const onCell = vi.fn();
    el.addEventListener("cellchange", (e) => onCell((e as CustomEvent).detail));
    const sizeCell = el.shadowRoot!.querySelectorAll<HTMLElement>(".td")[1]!;
    sizeCell.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, button: 0 }));
    await userEvent.keyboard("2");
    await settle(root);
    await userEvent.keyboard("0{Enter}");
    expect(onCell).toHaveBeenCalledWith({ id: "a", key: "size", value: 20 });
    el.rows = updateRow(el.rows, "a", { size: 20 });
    await settle(root);
    expect(el.shadowRoot!.querySelectorAll(".td")[1]!.textContent).toBe("20 KB");
  });

  it("resizes columns", async () => {
    const { el, root } = await table();
    const onResize = vi.fn();
    el.addEventListener("columnresize", (e) => onResize((e as CustomEvent).detail));
    const handle = el.shadowRoot!.querySelector<HTMLElement>(".resize")!;
    const x = handle.getBoundingClientRect().left;
    const o = { bubbles: true, pointerId: 1, button: 0, clientY: 10 };
    handle.dispatchEvent(new PointerEvent("pointerdown", { ...o, clientX: x }));
    handle.dispatchEvent(new PointerEvent("pointermove", { ...o, clientX: x + 40 }));
    handle.dispatchEvent(new PointerEvent("pointerup", { ...o, clientX: x + 40 }));
    await settle(root);
    expect(Math.round(el.shadowRoot!.querySelector<HTMLElement>(".th")!.getBoundingClientRect().width)).toBe(
      200,
    );
    expect(onResize).toHaveBeenCalledWith({ key: "name", width: 200 });
  });

  it("virtualizes", async () => {
    const { el, root } = await table();
    el.rows = Array.from({ length: 5000 }, (_, i) => ({
      id: `r${i}`,
      name: `file-${i}`,
      size: i,
      kind: "Image",
    }));
    await settle(root);
    expect(el.shadowRoot!.querySelectorAll(".tr").length).toBeLessThan(40);
  });
});
