import { afterEach, describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { $, mount, settle } from "./helpers.ts";

afterEach(() => {
  document.body.innerHTML = "";
});

async function timeline(attrs = "") {
  const root = await mount(
    `<st-timeline zoom="20" snap="0.5" ${attrs} style="width:800px;height:240px"></st-timeline>`,
  );
  const el = $(root, "st-timeline");
  el.trackToggles = [{ key: "muted", label: "Mute", text: "M" }];
  el.tracks = [
    {
      id: "v1",
      label: "Video",
      clips: [
        { id: "a", start: 0, end: 4, label: "Intro" },
        { id: "b", start: 6, end: 10, label: "Scene" },
      ],
      keyframes: [{ id: "k1", time: 2 }],
    },
    { id: "a1", label: "Music", clips: [{ id: "m", start: 1, end: 9, label: "Track" }] },
  ];
  await settle(root);
  const clip = (id: string) => el.shadowRoot!.querySelector<HTMLElement>(`.clip[data-id="${id}"]`)!;
  const lanes = el.shadowRoot!.querySelector<HTMLElement>(".lanes")!;
  return { root, el, clip, lanes };
}

const ptr = (el: Element, type: string, x: number, y: number, extra: PointerEventInit = {}) =>
  el.dispatchEvent(
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

describe("st-timeline", () => {
  it("places clips by time and zoom", async () => {
    const { clip } = await timeline();
    expect(Math.round(clip("b").getBoundingClientRect().width)).toBe(80);
    expect(Math.round(clip("b").getBoundingClientRect().left - clip("a").getBoundingClientRect().left)).toBe(
      120,
    );
  });

  it("moves a clip with snapping and fires clipchange on release", async () => {
    const { el, clip, lanes, root } = await timeline();
    const onChange = vi.fn();
    el.addEventListener("clipchange", (e) => onChange((e as CustomEvent).detail));
    const r = clip("b").getBoundingClientRect();
    const y = r.top + r.height / 2;
    ptr(clip("b").querySelector(".clip-label")!, "pointerdown", r.left + 30, y);
    ptr(lanes, "pointermove", r.left + 30 + 23, y);
    await settle(root);
    ptr(lanes, "pointerup", r.left + 30 + 23, y);
    expect(onChange).toHaveBeenCalledWith({ id: "b", trackId: "v1", start: 7, end: 11 });
    expect(el.selection).toEqual(["b"]);
  });

  it("trims the end edge", async () => {
    const { el, clip, lanes } = await timeline();
    const onChange = vi.fn();
    el.addEventListener("clipchange", (e) => onChange((e as CustomEvent).detail));
    const r = clip("a").getBoundingClientRect();
    const y = r.top + r.height / 2;
    ptr(clip("a"), "pointerdown", r.right - 2, y);
    ptr(lanes, "pointermove", r.right - 2 - 20, y);
    ptr(lanes, "pointerup", r.right - 2 - 20, y);
    expect(onChange).toHaveBeenCalledWith({ id: "a", trackId: "v1", start: 0, end: 3 });
  });

  it("drags a clip to another track", async () => {
    const { el, clip, lanes } = await timeline();
    const onChange = vi.fn();
    el.addEventListener("clipchange", (e) => onChange((e as CustomEvent).detail));
    const r = clip("a").getBoundingClientRect();
    ptr(clip("a"), "pointerdown", r.left + 30, r.top + 10);
    ptr(lanes, "pointermove", r.left + 30, r.top + 10 + 40);
    ptr(lanes, "pointerup", r.left + 30, r.top + 10 + 40);
    expect(onChange).toHaveBeenCalledWith({ id: "a", trackId: "a1", start: 0, end: 4 });
  });

  it("scrubs the playhead from the ruler and lanes", async () => {
    const { el, lanes } = await timeline();
    const onSeek = vi.fn();
    el.addEventListener("seek", (e) => onSeek((e as CustomEvent).detail.time));
    const ruler = el.shadowRoot!.querySelector<HTMLElement>(".ruler-wrap")!;
    const left = lanes.getBoundingClientRect().left;
    ptr(ruler, "pointerdown", left + 100, ruler.getBoundingClientRect().top + 5);
    ptr(ruler, "pointerup", left + 100, 0);
    expect(el.playhead).toBe(5);
    expect(onSeek).toHaveBeenCalledWith(5);
  });

  it("moves keyframes, toggles tracks, deletes selection", async () => {
    const { el, lanes, root } = await timeline();
    const onKey = vi.fn();
    const onTrack = vi.fn();
    const onDelete = vi.fn();
    el.addEventListener("keyframechange", (e) => onKey((e as CustomEvent).detail));
    el.addEventListener("trackchange", (e) => onTrack((e as CustomEvent).detail));
    el.addEventListener("delete", (e) => onDelete((e as CustomEvent).detail.ids));
    const key = el.shadowRoot!.querySelector<HTMLElement>(".key")!;
    const r = key.getBoundingClientRect();
    ptr(key, "pointerdown", r.left + 4, r.top + 4);
    ptr(lanes, "pointermove", r.left + 4 + 20, r.top + 4);
    ptr(lanes, "pointerup", r.left + 4 + 20, r.top + 4);
    expect(onKey).toHaveBeenCalledWith({ id: "k1", trackId: "v1", time: 3 });
    el.shadowRoot!.querySelector<HTMLElement>(".tg")!.click();
    expect(onTrack).toHaveBeenCalledWith({ id: "v1", key: "muted", value: true });
    await settle(root);
    lanes.focus();
    await userEvent.keyboard("{Delete}");
    expect(onDelete).toHaveBeenCalledWith(["k1"]);
  });
});
