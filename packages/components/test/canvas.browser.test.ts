import { afterEach, describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { $, mount, settle, type Upd } from "./helpers.ts";

afterEach(() => {
  document.body.innerHTML = "";
  localStorage.clear();
});

const near = (a: number, b: number, digits = 2) => expect(a).toBeCloseTo(b, digits);

const viewport = (attrs = "", inner = "") =>
  mount(
    `<st-viewport ${attrs} style="position:fixed;left:0;top:0;width:600px;height:400px">${inner}</st-viewport>`,
  );

const stageOf = (vp: Upd) => vp.shadowRoot!.querySelector(".stage") as HTMLElement;

const pointer = (target: Element, type: string, x: number, y: number, extra: PointerEventInit = {}) =>
  target.dispatchEvent(
    new PointerEvent(type, {
      bubbles: true,
      composed: true,
      pointerId: 1,
      button: 0,
      clientX: x,
      clientY: y,
      ...extra,
    }),
  );

describe("st-viewport", () => {
  it("zooms around a point and maps coordinates both ways", async () => {
    const root = await viewport();
    const vp = $(root, "st-viewport");
    const onView = vi.fn();
    vp.addEventListener("viewchange", onView);
    const before = vp.toDocument(150, 100);
    vp.zoomTo(2, 150, 100);
    const after = vp.toDocument(150, 100);
    near(after.x, before.x);
    near(after.y, before.y);
    expect(vp.zoom).toBe(2);
    expect(onView).toHaveBeenCalledTimes(1);
    expect(vp.style.getPropertyValue("--st-view-zoom")).toBe("2");
    const back = vp.toClient(after.x, after.y);
    near(back.x, 150);
    near(back.y, 100);
  });

  it("clamps zoom to min-zoom / max-zoom", async () => {
    const root = await viewport('min-zoom="0.5" max-zoom="4"');
    const vp = $(root, "st-viewport");
    vp.zoomTo(100);
    expect(vp.zoom).toBe(4);
    vp.zoomTo(0.01);
    expect(vp.zoom).toBe(0.5);
  });

  it("pans with the wheel and zooms with Ctrl + wheel toward the cursor", async () => {
    const root = await viewport();
    const vp = $(root, "st-viewport");
    const stage = stageOf(vp);
    stage.dispatchEvent(new WheelEvent("wheel", { bubbles: true, cancelable: true, deltaX: 30, deltaY: 50 }));
    expect([vp.x, vp.y]).toEqual([30, 50]);
    const anchor = vp.toDocument(300, 200);
    stage.dispatchEvent(
      new WheelEvent("wheel", {
        bubbles: true,
        cancelable: true,
        deltaY: -100,
        ctrlKey: true,
        clientX: 300,
        clientY: 200,
      }),
    );
    expect(vp.zoom).toBeGreaterThan(1);
    const after = vp.toDocument(300, 200);
    near(after.x, anchor.x);
    near(after.y, anchor.y);
  });

  it("pans with Space-drag and with the hand tool", async () => {
    const root = await viewport('tool="hand"');
    const vp = $(root, "st-viewport");
    const stage = stageOf(vp);
    pointer(stage, "pointerdown", 200, 200);
    pointer(stage, "pointermove", 150, 120);
    pointer(stage, "pointerup", 150, 120);
    expect([vp.x, vp.y]).toEqual([50, 80]);
  });

  it("fits content (objects and artboards) with padding", async () => {
    const root = await viewport(
      "",
      '<st-artboard x="0" y="0" width="1000" height="500" label="A"></st-artboard>',
    );
    const vp = $(root, "st-viewport");
    vp.objects = [{ id: "far", x: 1100, y: 0, width: 100, height: 100 }];
    vp.fit();
    // Content is 1200 × 500 in a 600 × 400 stage with 48px padding.
    near(vp.zoom, Math.min(504 / 1200, 304 / 500), 4);
    const b = vp.contentBounds();
    const tl = vp.toClient(b.x, b.y);
    const br = vp.toClient(b.x + b.width, b.y + b.height);
    expect(tl.x).toBeGreaterThanOrEqual(47.9);
    expect(br.x).toBeLessThanOrEqual(600 - 47.9);
    near((tl.y + br.y) / 2, 200);
  });

  it("zooms and pans from the keyboard", async () => {
    const root = await viewport();
    const vp = $(root, "st-viewport");
    vp.focus();
    await userEvent.keyboard("=");
    near(vp.zoom, 1.25);
    await userEvent.keyboard("-");
    near(vp.zoom, 1);
    await userEvent.keyboard("{Shift>}{Digit0}{/Shift}");
    expect(vp.zoom).toBe(1);
    await userEvent.keyboard("{ArrowRight}");
    near(vp.x, 40);
  });

  it("drags guides out of the rulers and back to delete them", async () => {
    const root = await viewport("rulers");
    const vp = $(root, "st-viewport");
    const onGuides = vi.fn();
    vp.addEventListener("guidechange", onGuides);
    const top = vp.shadowRoot!.querySelector(".ruler-x") as HTMLElement;
    const stage = stageOf(vp);
    // Stage starts at (20, 20) below/right of the rulers.
    pointer(top, "pointerdown", 200, 10);
    pointer(stage, "pointermove", 200, 120);
    pointer(stage, "pointerup", 200, 120);
    await settle(root);
    expect(vp.guides).toEqual([expect.objectContaining({ axis: "y", position: 100 })]);
    expect(vp.shadowRoot!.querySelectorAll(".guide-y")).toHaveLength(1);

    const guide = vp.shadowRoot!.querySelector(".guide-y") as HTMLElement;
    pointer(guide, "pointerdown", 200, 120);
    pointer(stage, "pointermove", 200, 8);
    pointer(stage, "pointerup", 200, 8);
    await settle(root);
    expect(vp.guides).toEqual([]);
    expect(onGuides).toHaveBeenCalled();
  });

  it("marquee-selects intersecting objects; an empty click selects nothing", async () => {
    const root = await viewport("marquee");
    const vp = $(root, "st-viewport");
    vp.objects = [
      { id: "a", x: 10, y: 10, width: 50, height: 50 },
      { id: "b", x: 200, y: 200, width: 50, height: 50 },
    ];
    const onSelect = vi.fn();
    vp.addEventListener("select", (e) => onSelect((e as CustomEvent).detail));
    const stage = stageOf(vp);
    pointer(stage, "pointerdown", 0, 0);
    pointer(stage, "pointermove", 100, 100);
    await settle(root);
    expect(vp.shadowRoot!.querySelector(".marquee")).not.toBeNull();
    pointer(stage, "pointerup", 100, 100);
    await settle(root);
    expect(onSelect).toHaveBeenLastCalledWith({ ids: ["a"], add: false });
    expect(vp.shadowRoot!.querySelector(".marquee")).toBeNull();

    pointer(stage, "pointerdown", 300, 300, { shiftKey: true });
    pointer(stage, "pointerup", 300, 300);
    expect(onSelect).toHaveBeenLastCalledWith({ ids: [], add: true });
  });

  it("snaps a rect to other objects and guides, and draws snap lines", async () => {
    const root = await viewport("snap");
    const vp = $(root, "st-viewport");
    vp.objects = [{ id: "a", x: 100, y: 100, width: 100, height: 100 }];
    vp.guides = [{ id: "g", axis: "y", position: 300 }];
    await settle(root);
    const r = vp.snapRect({ x: 203, y: 297, width: 50, height: 50 });
    expect([r.x, r.y]).toEqual([200, 300]);
    await settle(root);
    expect(vp.shadowRoot!.querySelectorAll(".snap")).toHaveLength(2);
    vp.clearSnapLines();
    await settle(root);
    expect(vp.shadowRoot!.querySelectorAll(".snap")).toHaveLength(0);
    // Excluded ids don't attract.
    expect(vp.snapRect({ x: 203, y: 0, width: 50, height: 50 }, ["a"]).x).toBe(203);
  });

  it("remembers the view and guides with autosave", async () => {
    let root = await viewport('autosave="t"');
    let vp = $(root, "st-viewport");
    vp.zoomTo(2, 0, 0);
    vp.panBy(10, 20);
    root.remove();
    root = await viewport('autosave="t"');
    vp = $(root, "st-viewport");
    expect([vp.zoom, vp.x, vp.y]).toEqual([2, 10, 20]);
  });

  it("drives and follows st-zoom-control via for=", async () => {
    const root = await mount(`
      <st-viewport id="vp" style="width:400px;height:300px"></st-viewport>
      <st-zoom-control for="vp"></st-zoom-control>`);
    const vp = $(root, "st-viewport");
    const zc = $(root, "st-zoom-control");
    vp.zoomTo(2);
    await settle(root);
    expect(zc.value).toBe(200);
    const input = zc.shadowRoot!.querySelector("input") as HTMLInputElement;
    input.value = "50";
    input.dispatchEvent(new Event("change"));
    await settle(root);
    near(vp.zoom, 0.5);
  });
});

describe("st-transform-box", () => {
  const boxIn = async (attrs = "", vpAttrs = "") => {
    const root = await viewport(
      vpAttrs,
      `<st-transform-box slot="overlay" x="100" y="100" width="100" height="50" ${attrs}></st-transform-box>`,
    );
    return { root, vp: $(root, "st-viewport"), box: $(root, "st-transform-box") };
  };
  const handle = (box: Upd, name: string) =>
    box.shadowRoot!.querySelector(`[data-handle="${name}"]`) as HTMLElement;
  const center = (el: Element) => {
    const r = el.getBoundingClientRect();
    return [r.left + r.width / 2, r.top + r.height / 2] as const;
  };

  it("sits at its document position and follows zoom", async () => {
    const { root, vp, box } = await boxIn();
    let r = box.getBoundingClientRect();
    expect([r.left, r.top, r.width, r.height]).toEqual([100, 100, 100, 50]);
    vp.zoomTo(2, 0, 0);
    await settle(root);
    r = box.getBoundingClientRect();
    expect([r.left, r.top, r.width, r.height]).toEqual([200, 200, 200, 100]);
    // Handles keep their screen size.
    expect(handle(box, "se").getBoundingClientRect().width).toBe(8);
  });

  it("moves by dragging inside, with transform then change", async () => {
    const { root, box } = await boxIn();
    const events: string[] = [];
    box.addEventListener("transform", () => events.push("transform"));
    box.addEventListener("change", (e) => events.push(`change:${(e as CustomEvent).detail.x}`));
    const frame = box.shadowRoot!.querySelector(".frame") as HTMLElement;
    pointer(frame, "pointerdown", 150, 125);
    pointer(box, "pointermove", 180, 145);
    pointer(box, "pointerup", 180, 145);
    await settle(root);
    expect([box.x, box.y]).toEqual([130, 120]);
    expect(events).toEqual(["transform", "change:130"]);
  });

  it("resizes from a corner, keeps the opposite corner, and keeps proportions with Shift", async () => {
    const { box } = await boxIn();
    const [hx, hy] = center(handle(box, "se"));
    pointer(handle(box, "se"), "pointerdown", hx, hy);
    pointer(box, "pointermove", hx + 20, hy + 10);
    pointer(box, "pointerup", hx + 20, hy + 10);
    expect([box.x, box.y, box.width, box.height]).toEqual([100, 100, 120, 60]);

    const [nx, ny] = center(handle(box, "nw"));
    pointer(handle(box, "nw"), "pointerdown", nx, ny);
    pointer(box, "pointermove", nx - 60, ny, { shiftKey: true });
    pointer(box, "pointerup", nx - 60, ny);
    // 120×60 grows by 1.5× from the bottom-right corner.
    expect([box.width, box.height]).toEqual([180, 90]);
    expect([box.x + box.width, box.y + box.height]).toEqual([220, 160]);
  });

  it("resizes from the center with Alt", async () => {
    const { box } = await boxIn();
    const [hx, hy] = center(handle(box, "e"));
    pointer(handle(box, "e"), "pointerdown", hx, hy);
    pointer(box, "pointermove", hx + 10, hy, { altKey: true });
    pointer(box, "pointerup", hx + 10, hy);
    expect([box.x, box.width]).toEqual([90, 120]);
  });

  it("keeps the anchor fixed when resizing a rotated box", async () => {
    const { box } = await boxIn('rotation="90" rotatable');
    // Rotated 90°, the box's local +x points down. Its "w" edge is at the top.
    const before = { cx: box.x + box.width / 2, cy: box.y + box.height / 2 };
    const anchor = { x: before.cx, y: before.cy + box.width / 2 }; // local "e" edge midpoint
    const [hx, hy] = center(handle(box, "w"));
    pointer(handle(box, "w"), "pointerdown", hx, hy);
    pointer(box, "pointermove", hx, hy - 20);
    pointer(box, "pointerup", hx, hy - 20);
    expect(box.width).toBeCloseTo(120);
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    near(cx, anchor.x);
    near(cy + box.width / 2, anchor.y);
  });

  it("rotates with the knob, in 15° steps with Shift", async () => {
    const { box } = await boxIn("rotatable");
    const knob = handle(box, "rotate");
    const [kx, ky] = center(knob);
    // Center of the box is (150, 125). Drag the knob to its right side.
    pointer(knob, "pointerdown", kx, ky);
    pointer(box, "pointermove", 250, 128, { shiftKey: true });
    pointer(box, "pointerup", 250, 128);
    expect(box.rotation).toBe(90);
  });

  it("snaps moves to other objects when the viewport snaps", async () => {
    const { root, vp, box } = await boxIn('targets="me"', "snap");
    vp.objects = [
      { id: "me", x: 100, y: 100, width: 100, height: 50 },
      { id: "other", x: 300, y: 0, width: 40, height: 40 },
    ];
    await settle(root);
    const frame = box.shadowRoot!.querySelector(".frame") as HTMLElement;
    pointer(frame, "pointerdown", 150, 125);
    pointer(box, "pointermove", 247, 125); // right edge lands at 297 → snaps to 300
    await settle(root);
    expect(box.x).toBe(200);
    expect(vp.shadowRoot!.querySelectorAll(".snap-x")).toHaveLength(1);
    pointer(box, "pointerup", 247, 125);
    await settle(root);
    expect(vp.shadowRoot!.querySelectorAll(".snap")).toHaveLength(0);
  });

  it("nudges and resizes from the keyboard", async () => {
    const { box } = await boxIn();
    const onChange = vi.fn();
    box.addEventListener("change", onChange);
    box.focus();
    await userEvent.keyboard("{ArrowRight}{Shift>}{ArrowDown}{/Shift}");
    expect([box.x, box.y]).toEqual([101, 110]);
    await userEvent.keyboard("{Alt>}{ArrowRight}{/Alt}");
    expect(box.width).toBe(101);
    expect(onChange).toHaveBeenCalledTimes(3);
    expect(box.getAttribute("aria-label")).toBe("Selection: 101 × 50");
  });
});

describe("canvas furniture", () => {
  it("st-artboard sits in document space with a constant-size name", async () => {
    const root = await viewport(
      'zoom="2"',
      '<st-artboard id="ab" x="10" y="20" width="100" height="50" label="Home"></st-artboard>',
    );
    const ab = $(root, "st-artboard");
    const r = ab.getBoundingClientRect();
    expect([r.left, r.top, r.width, r.height]).toEqual([20, 40, 200, 100]);
    const name = ab.shadowRoot!.querySelector(".name") as HTMLElement;
    near(Number.parseFloat(getComputedStyle(name).fontSize), 5.5);
    const onSelect = vi.fn();
    ab.addEventListener("select", (e) => onSelect((e as CustomEvent).detail));
    name.click();
    expect(onSelect).toHaveBeenCalledWith({ ids: ["ab"], add: false });
  });

  it("st-viewport reports artboard changes as contentchange", async () => {
    const root = await viewport("", '<st-artboard x="0" y="0" width="100" height="100"></st-artboard>');
    const vp = $(root, "st-viewport");
    const onContent = vi.fn();
    vp.addEventListener("contentchange", onContent);
    $(root, "st-artboard").setAttribute("width", "300");
    await settle(root);
    expect(onContent).toHaveBeenCalled();
    expect(vp.contentBounds()).toEqual({ x: 0, y: 0, width: 300, height: 100 });
    // Panning is not a content change.
    onContent.mockClear();
    vp.panBy(10, 10);
    await settle(root);
    expect(onContent).not.toHaveBeenCalled();
  });

  it("st-measure draws a line and the distance", async () => {
    const root = await viewport(
      "",
      '<st-measure slot="overlay" x1="10" y1="20" x2="110" y2="20"></st-measure>',
    );
    const m = $(root, "st-measure");
    const line = m.shadowRoot!.querySelector(".line") as HTMLElement;
    const r = line.getBoundingClientRect();
    near(r.left, 10, 0);
    near(r.width, 100, 0);
    expect(m.shadowRoot!.querySelector(".label")!.textContent).toBe("100");
    expect(m.getAttribute("aria-label")).toBe("Distance 100");
  });

  it("st-minimap centers the view where you click", async () => {
    const root = await mount(`
      <st-viewport id="vp" style="width:400px;height:200px">
        <st-artboard x="0" y="0" width="2000" height="1000"></st-artboard>
      </st-viewport>
      <st-minimap for="vp" style="width:200px;height:100px"></st-minimap>`);
    const vp = $(root, "st-viewport");
    const mini = $(root, "st-minimap");
    await settle(root);
    const r = mini.getBoundingClientRect();
    // Content fills the minimap (2000×1000 into 188×88 after padding): click its middle.
    pointer(mini, "pointerdown", r.left + r.width / 2, r.top + r.height / 2);
    pointer(mini, "pointerup", r.left + r.width / 2, r.top + r.height / 2);
    const view = vp.viewRect();
    near(view.x + view.width / 2, 1000, -1);
    near(view.y + view.height / 2, 500, -1);
  });
});
