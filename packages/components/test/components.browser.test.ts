import { registerIcons } from "@station/icons";
import { afterEach, describe, expect, it, vi } from "vitest";
import "@station/tokens";
import "../src/index.ts";

const PLUS = {
  type: "outline",
  nodes: [
    ["path", { d: "M12 5l0 14" }],
    ["path", { d: "M5 12l14 0" }],
  ],
} as const;
const DOT = { type: "filled", nodes: [["circle", { cx: "12", cy: "12", r: "4" }]] } as const;

async function mount<T extends HTMLElement>(html: string): Promise<T> {
  const root = document.createElement("div");
  root.innerHTML = html;
  document.body.append(root);
  const el = root.firstElementChild as T & { updated?: Promise<void> };
  await el.updated;
  return el;
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("st-icon", () => {
  it("renders a registered outline icon as SVG", async () => {
    registerIcons({ plus: PLUS });
    const el = await mount(`<st-icon name="plus"></st-icon>`);
    const svg = el.shadowRoot!.querySelector("svg")!;
    expect(svg.namespaceURI).toBe("http://www.w3.org/2000/svg");
    expect(svg.querySelectorAll("path")).toHaveLength(2);
    expect(svg.getAttribute("stroke")).toBe("currentColor");
    expect(el.getAttribute("aria-hidden")).toBe("true");
  });

  it("renders filled icons with fill", async () => {
    registerIcons({ dot: DOT });
    const el = await mount(`<st-icon name="dot"></st-icon>`);
    expect(el.shadowRoot!.querySelector("svg")!.getAttribute("fill")).toBe("currentColor");
  });

  it("is announced when it has a label", async () => {
    registerIcons({ plus: PLUS });
    const el = await mount(`<st-icon name="plus" label="Add layer"></st-icon>`);
    expect(el.getAttribute("role")).toBe("img");
    expect(el.getAttribute("aria-label")).toBe("Add layer");
    expect(el.hasAttribute("aria-hidden")).toBe(false);
  });

  it("picks up icons registered after render", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const el = await mount<HTMLElement & { updated: Promise<void> }>(`<st-icon name="late"></st-icon>`);
    expect(el.shadowRoot!.querySelector("svg")).toBeNull();
    expect(warn).toHaveBeenCalled();
    registerIcons({ late: PLUS });
    await el.updated;
    expect(el.shadowRoot!.querySelector("svg")).not.toBeNull();
    warn.mockRestore();
  });

  it("sizes from the cascading size attribute", async () => {
    registerIcons({ plus: PLUS });
    const root = document.createElement("div");
    root.setAttribute("size", "small");
    root.innerHTML = `<st-icon name="plus"></st-icon>`;
    document.body.append(root);
    const el = root.firstElementChild as HTMLElement & { updated: Promise<void> };
    await el.updated;
    expect(el.getBoundingClientRect().width).toBe(14);
  });
});

describe("st-kbd", () => {
  it("formats a shortcut into keys", async () => {
    const el = await mount(`<st-kbd shortcut="Mod+Shift+D"></st-kbd>`);
    const keys = [...el.shadowRoot!.querySelectorAll("kbd")].map((k) => k.textContent);
    expect(keys.at(-1)).toBe("D");
    expect(keys.length).toBe(3);
    expect(el.getAttribute("aria-label")).toMatch(/Shift\+D$/);
  });

  it("falls back to slotted content", async () => {
    const el = await mount(`<st-kbd>F1</st-kbd>`);
    expect(el.shadowRoot!.querySelector("slot")).not.toBeNull();
  });
});
