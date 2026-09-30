import { afterEach, describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";
import { matchesShortcut } from "../src/hotkey.ts";
import { createRovingFocus } from "../src/roving-focus.ts";

afterEach(() => {
  document.body.innerHTML = "";
});

describe("createRovingFocus", () => {
  it("keeps one tab stop and moves with arrows, Home and End", async () => {
    document.body.innerHTML = `<div id="bar"><button>A</button><button>B</button><button>C</button></div>`;
    const bar = document.querySelector<HTMLElement>("#bar")!;
    const items = () => [...bar.querySelectorAll("button")];
    createRovingFocus(bar, { items });
    expect(items().map((b) => b.tabIndex)).toEqual([0, -1, -1]);

    items()[0]!.focus();
    await userEvent.keyboard("{ArrowRight}");
    expect(document.activeElement?.textContent).toBe("B");
    await userEvent.keyboard("{End}");
    expect(document.activeElement?.textContent).toBe("C");
    await userEvent.keyboard("{ArrowRight}");
    expect(document.activeElement?.textContent).toBe("A");
    expect(items().map((b) => b.tabIndex)).toEqual([0, -1, -1]);
  });
});

describe("matchesShortcut", () => {
  const key = (init: KeyboardEventInit) => new KeyboardEvent("keydown", init);
  it("maps Mod to Meta on Apple and Ctrl elsewhere", () => {
    expect(matchesShortcut(key({ key: "d", code: "KeyD", metaKey: true }), "Mod+D", true)).toBe(true);
    expect(matchesShortcut(key({ key: "d", code: "KeyD", ctrlKey: true }), "Mod+D", false)).toBe(true);
    expect(matchesShortcut(key({ key: "d", code: "KeyD", ctrlKey: true }), "Mod+D", true)).toBe(false);
  });
  it("requires shift for letters", () => {
    expect(matchesShortcut(key({ key: "D", code: "KeyD", ctrlKey: true }), "Mod+Shift+D", false)).toBe(false);
    expect(
      matchesShortcut(key({ key: "D", code: "KeyD", ctrlKey: true, shiftKey: true }), "Mod+Shift+D", false),
    ).toBe(true);
  });
});
