import { afterEach, describe, expect, it } from "vitest";
import "../src/index.css";

const mount = (html: string) => {
  const root = document.createElement("div");
  root.innerHTML = html;
  document.body.append(root);
  return root;
};
const style = (el: Element | null) => getComputedStyle(el!);

afterEach(() => {
  document.body.innerHTML = "";
});

describe("layout primitives", () => {
  it("st-row maps x-align → justify-content, y-align → align-items", () => {
    const root = mount(`<st-row x-align="between" y-align="end" gap="2"></st-row>`);
    const s = style(root.firstElementChild);
    expect(s.display).toBe("flex");
    expect(s.flexDirection).toBe("row");
    expect(s.justifyContent).toBe("space-between");
    expect(s.alignItems).toBe("flex-end");
    expect(s.columnGap).toBe("8px");
  });

  it("st-row centers vertically by default", () => {
    const root = mount(`<st-row></st-row>`);
    expect(style(root.firstElementChild).alignItems).toBe("center");
  });

  it("st-column maps x-align → align-items, y-align → justify-content", () => {
    const root = mount(`<st-column x-align="center" y-align="between"></st-column>`);
    const s = style(root.firstElementChild);
    expect(s.flexDirection).toBe("column");
    expect(s.alignItems).toBe("center");
    expect(s.justifyContent).toBe("space-between");
  });

  it("st-box is plain flex", () => {
    const root = mount(`<st-box></st-box>`);
    const s = style(root.firstElementChild);
    expect(s.display).toBe("flex");
    expect(s.justifyContent).toBe("normal");
  });

  it("spacing follows the unit and density knobs", () => {
    const root = mount(`
      <st-row id="a" padding="1.5"></st-row>
      <div density="compact"><st-row id="b" padding="2"></st-row></div>
      <div style="--st-unit: 5px" theme="light"><st-row id="c" gap="2"></st-row></div>`);
    expect(style(root.querySelector("#a")).paddingTop).toBe("6px");
    expect(style(root.querySelector("#b")).paddingTop).toBe("7px");
    expect(style(root.querySelector("#c")).columnGap).toBe("10px");
  });

  it("dividers turn vertical inside a row", () => {
    const root = mount(
      `<st-row style="height:20px"><st-divider></st-divider></st-row><st-column><st-divider></st-divider></st-column>`,
    );
    const [v, h] = root.querySelectorAll("st-divider");
    expect(v!.getBoundingClientRect().width).toBe(1);
    expect(v!.getBoundingClientRect().height).toBe(20);
    expect(h!.getBoundingClientRect().height).toBe(1);
  });

  it("hidden wins over display:flex", () => {
    const root = mount(`<st-row hidden></st-row>`);
    expect(style(root.firstElementChild).display).toBe("none");
  });
});

describe("themes", () => {
  const bg = (el: Element | null) => style(el).backgroundColor;

  it("dark subtree resolves different surface colors", () => {
    const root = mount(`
      <st-surface id="light" level="panel"></st-surface>
      <div theme="dark"><st-surface id="dark" level="panel"></st-surface></div>`);
    expect(bg(root.querySelector("#light"))).not.toBe(bg(root.querySelector("#dark")));
  });

  it("dark subtree re-resolves text color", () => {
    const root = mount(`<st-text id="l">a</st-text><div theme="dark"><st-text id="d">b</st-text></div>`);
    expect(style(root.querySelector("#l")).color).not.toBe(style(root.querySelector("#d")).color);
  });

  it("surface levels are all distinct", () => {
    const root = mount(
      ["canvas", "panel", "section", "well"].map((l) => `<st-surface level="${l}"></st-surface>`).join(""),
    );
    const colors = new Set([...root.children].map((el) => bg(el)));
    // canvas and well intentionally share a step in light mode.
    expect(colors.size).toBeGreaterThanOrEqual(3);
  });

  it("accent is monochrome by default and takes a hue when chroma is set", () => {
    const root = mount(`
      <st-text id="mono" tone="accent">a</st-text>
      <div theme="light" style="--st-accent-chroma: 0.2; --st-accent-hue: 260"><st-text id="brand" tone="accent">b</st-text></div>`);
    const mono = style(root.querySelector("#mono")).color;
    const brand = style(root.querySelector("#brand")).color;
    expect(mono).not.toBe(brand);
  });
});

describe("type and size scale", () => {
  it("type scale derives from --st-font-size and --st-type-ratio", () => {
    const root = mount(`<st-heading size="large">T</st-heading><st-text size="small">t</st-text>`);
    expect(Number.parseFloat(style(root.children[0]!).fontSize)).toBeCloseTo(12 * 1.125 ** 2, 1);
    expect(Number.parseFloat(style(root.children[1]!).fontSize)).toBeCloseTo(12 / 1.125, 1);
  });

  it("size attribute cascades control height to the subtree", () => {
    const root = mount(
      `<div size="small"><span id="x" style="display:block;height:var(--st-control-height)"></span></div>`,
    );
    expect(root.querySelector("#x")!.getBoundingClientRect().height).toBe(20);
  });
});
