import { afterEach, describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { colorAt } from "../src/imaging/gradient-editor.tsx";
import { $, mount, settle } from "./helpers.ts";

afterEach(() => {
  document.body.innerHTML = "";
});

const press = (el: Element, type: string, x: number, y: number) =>
  el.dispatchEvent(
    new PointerEvent(type, { bubbles: true, pointerId: 1, button: 0, clientX: x, clientY: y }),
  );

describe("st-curve-editor", () => {
  it("adds a point on click and drags it", async () => {
    const root = await mount(`<st-curve-editor></st-curve-editor>`);
    const curve = $(root, "st-curve-editor");
    const onChange = vi.fn();
    curve.addEventListener("change", onChange);
    const svg = curve.shadowRoot!.querySelector("svg")!;
    const r = svg.getBoundingClientRect();
    press(svg, "pointerdown", r.left + r.width / 2, r.top + r.height / 2);
    press(svg, "pointermove", r.left + r.width / 2, r.top + r.height / 4);
    press(svg, "pointerup", r.left + r.width / 2, r.top + r.height / 4);
    await settle(root);
    expect(curve.points).toHaveLength(3);
    expect(curve.points[1].y).toBeCloseTo(0.75, 1);
    expect(curve.evaluate(0.5)).toBeCloseTo(0.75, 1);
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("removes a middle point by dragging it off, or with Delete", async () => {
    const root = await mount(`<st-curve-editor></st-curve-editor>`);
    const curve = $(root, "st-curve-editor");
    curve.points = [
      { x: 0, y: 0 },
      { x: 0.5, y: 0.7 },
      { x: 1, y: 1 },
    ];
    await settle(root);
    const svg = curve.shadowRoot!.querySelector("svg")!;
    const r = svg.getBoundingClientRect();
    press(svg, "pointerdown", r.left + r.width * 0.5, r.top + r.height * 0.3);
    press(svg, "pointermove", r.left + r.width * 0.5, r.bottom + 80);
    press(svg, "pointerup", r.left + r.width * 0.5, r.bottom + 80);
    await settle(root);
    expect(curve.points).toHaveLength(2);
    curve.points = [
      { x: 0, y: 0 },
      { x: 0.5, y: 0.7 },
      { x: 1, y: 1 },
    ];
    await settle(root);
    curve.focus();
    await userEvent.keyboard("{PageDown}{ArrowUp}");
    expect(curve.points[1].y).toBeCloseTo(0.7 + 1 / 255);
    await userEvent.keyboard("{Delete}");
    expect(curve.points).toHaveLength(2);
  });
});

describe("st-gradient-editor", () => {
  it("interpolates colors", () => {
    expect(
      colorAt(
        [
          { offset: 0, color: "#000000" },
          { offset: 1, color: "#ffffff" },
        ],
        0.5,
      ),
    ).toBe("#808080");
  });

  it("adds a stop on click, moves it with keys, and builds CSS", async () => {
    const root = await mount(`<st-gradient-editor></st-gradient-editor>`);
    const grad = $(root, "st-gradient-editor");
    const bar = grad.shadowRoot!.querySelector(".bar")!;
    const r = bar.getBoundingClientRect();
    press(bar, "pointerdown", r.left + r.width / 4, r.top + 5);
    await settle(root);
    expect(grad.stops).toHaveLength(3);
    expect(grad.stops[2].offset).toBeCloseTo(0.25, 1);
    const stop = grad.shadowRoot!.querySelectorAll<HTMLElement>(".stop")[2]!;
    stop.focus();
    await userEvent.keyboard("{Shift>}{ArrowRight}{/Shift}");
    expect(grad.stops[2].offset).toBeCloseTo(0.35, 1);
    expect(grad.toCSS(45)).toMatch(
      /^linear-gradient\(45deg, #000000 0%, #[0-9a-f]{6} 3\d(\.\d+)?%, #ffffff 100%\)$/,
    );
    await userEvent.keyboard("{Delete}");
    expect(grad.stops).toHaveLength(2);
  });
});

describe("st-histogram", () => {
  it("draws bins to a canvas", async () => {
    const root = await mount(`<st-histogram></st-histogram>`);
    const h = $(root, "st-histogram");
    h.bins = Array.from({ length: 256 }, (_, i) => Math.exp(-((i - 128) ** 2) / 800));
    await settle(root);
    const canvas = h.shadowRoot!.querySelector("canvas")!;
    const ctx = canvas.getContext("2d")!;
    const mid = ctx.getImageData(canvas.width / 2, canvas.height - 4, 1, 1).data;
    const edge = ctx.getImageData(2, 2, 1, 1).data;
    expect(mid[3]).toBeGreaterThan(0);
    expect(edge[3]).toBe(0);
  });

  it("redraws current data when revealed after being hidden", async () => {
    const root = await mount(`<st-histogram hidden></st-histogram>`);
    const h = $(root, "st-histogram");
    h.bins = Array.from({ length: 256 }, (_, i) => Math.exp(-((i - 128) ** 2) / 800));
    await settle(root);
    h.hidden = false;
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const canvas = h.shadowRoot!.querySelector("canvas")!;
    const mid = canvas.getContext("2d")!.getImageData(canvas.width / 2, canvas.height - 4, 1, 1).data;
    expect(mid[3]).toBeGreaterThan(0);
  });
});
