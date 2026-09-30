import { isApplePlatform } from "./platform.ts";
import { parseShortcut } from "./shortcut.ts";

/** True when a keyboard event matches a shortcut string like "Mod+Shift+D". */
export function matchesShortcut(event: KeyboardEvent, shortcut: string, apple = isApplePlatform()): boolean {
  const { modifiers, key } = parseShortcut(shortcut);
  const want = {
    ctrl: modifiers.includes("ctrl") || (!apple && modifiers.includes("mod")),
    meta: modifiers.includes("meta") || (apple && modifiers.includes("mod")),
    alt: modifiers.includes("alt"),
    shift: modifiers.includes("shift"),
  };
  if (event.ctrlKey !== want.ctrl || event.metaKey !== want.meta || event.altKey !== want.alt) return false;
  const k = key.toLowerCase();
  const eventKey = event.key.toLowerCase();
  const aliases: Record<string, string> = {
    esc: "escape",
    del: "delete",
    space: " ",
    return: "enter",
    up: "arrowup",
    down: "arrowdown",
    left: "arrowleft",
    right: "arrowright",
  };
  const keyMatches =
    eventKey === (aliases[k] ?? k) ||
    event.code.toLowerCase() === `key${k}` ||
    event.code.toLowerCase() === `digit${k}`;
  // Shift changes printed characters ("?" is Shift+/), so only enforce it for letters and named keys.
  const shiftMatters = k.length > 1 || /[a-z]/.test(k);
  return keyMatches && (!shiftMatters || event.shiftKey === want.shift);
}
