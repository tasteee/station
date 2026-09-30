import { describe, expect, it } from "vitest";
import { ariaShortcut, formatShortcut, parseShortcut, shortcutKeys } from "../src/shortcut.ts";

describe("shortcut", () => {
  it("parses and orders modifiers", () => {
    expect(parseShortcut("Shift+Mod+D")).toEqual({ modifiers: ["mod", "shift"], key: "D" });
  });

  it("accepts a literal plus key", () => {
    expect(parseShortcut("Mod++")).toEqual({ modifiers: ["mod"], key: "+" });
  });

  it("formats for apple", () => {
    expect(formatShortcut("Mod+Shift+d", "apple")).toBe("⇧⌘D");
    expect(shortcutKeys("Alt+Backspace", "apple")).toEqual(["⌥", "⌫"]);
  });

  it("formats for other platforms", () => {
    expect(formatShortcut("Mod+Shift+d", "other")).toBe("Ctrl+Shift+D");
    expect(formatShortcut("Delete", "other")).toBe("Del");
  });

  it("builds aria-keyshortcuts values", () => {
    expect(ariaShortcut("Mod+D", "apple")).toBe("Meta+D");
    expect(ariaShortcut("Mod+D", "other")).toBe("Control+D");
  });
});
