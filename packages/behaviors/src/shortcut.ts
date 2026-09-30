import { isApplePlatform } from "./platform.ts";

/**
 * Shortcut strings use `+` between keys: "Mod+Shift+D", "Alt+Backspace", "?".
 * `Mod` is ⌘ on Apple platforms and Ctrl everywhere else.
 */
export type ShortcutPlatform = "apple" | "other";

const MODIFIER_ORDER = ["mod", "ctrl", "alt", "shift", "meta"] as const;
type Modifier = (typeof MODIFIER_ORDER)[number];

const APPLE_SYMBOLS: Record<Modifier, string> = {
  mod: "⌘",
  ctrl: "⌃",
  alt: "⌥",
  shift: "⇧",
  meta: "⌘",
};

const OTHER_NAMES: Record<Modifier, string> = {
  mod: "Ctrl",
  ctrl: "Ctrl",
  alt: "Alt",
  shift: "Shift",
  meta: "Win",
};

const KEY_NAMES: Record<string, { apple: string; other: string }> = {
  enter: { apple: "↩", other: "Enter" },
  return: { apple: "↩", other: "Enter" },
  backspace: { apple: "⌫", other: "Backspace" },
  delete: { apple: "⌦", other: "Del" },
  del: { apple: "⌦", other: "Del" },
  escape: { apple: "Esc", other: "Esc" },
  esc: { apple: "Esc", other: "Esc" },
  tab: { apple: "⇥", other: "Tab" },
  space: { apple: "Space", other: "Space" },
  up: { apple: "↑", other: "↑" },
  arrowup: { apple: "↑", other: "↑" },
  down: { apple: "↓", other: "↓" },
  arrowdown: { apple: "↓", other: "↓" },
  left: { apple: "←", other: "←" },
  arrowleft: { apple: "←", other: "←" },
  right: { apple: "→", other: "→" },
  arrowright: { apple: "→", other: "→" },
  pageup: { apple: "PgUp", other: "PgUp" },
  pagedown: { apple: "PgDn", other: "PgDn" },
  home: { apple: "Home", other: "Home" },
  end: { apple: "End", other: "End" },
};

export interface ParsedShortcut {
  modifiers: Modifier[];
  key: string;
}

/** Split "Mod+Shift+D" into sorted modifiers and a key. A lone "+" is a valid key. */
export function parseShortcut(shortcut: string): ParsedShortcut {
  const parts = shortcut.trim().split(/\+(?!$)/);
  const modifiers: Modifier[] = [];
  let key = "";
  for (const raw of parts) {
    const part = raw.trim();
    const lower = part.toLowerCase();
    if ((MODIFIER_ORDER as readonly string[]).includes(lower)) {
      modifiers.push(lower as Modifier);
    } else if (lower === "cmd" || lower === "command") {
      modifiers.push("meta");
    } else if (lower === "option" || lower === "opt") {
      modifiers.push("alt");
    } else if (lower === "control") {
      modifiers.push("ctrl");
    } else {
      key = part;
    }
  }
  modifiers.sort((a, b) => MODIFIER_ORDER.indexOf(a) - MODIFIER_ORDER.indexOf(b));
  return { modifiers: [...new Set(modifiers)], key };
}

function formatKey(key: string, platform: ShortcutPlatform): string {
  const named = KEY_NAMES[key.toLowerCase()];
  if (named) return named[platform];
  return key.length === 1 ? key.toUpperCase() : key[0]!.toUpperCase() + key.slice(1);
}

/**
 * Split a shortcut into display keys for the current (or given) platform.
 * Apple:  "Mod+Shift+D" → ["⌘", "⇧", "D"]   Apple order is ⌃ ⌥ ⇧ ⌘.
 * Other:  "Mod+Shift+D" → ["Ctrl", "Shift", "D"]
 */
export function shortcutKeys(shortcut: string, platform: ShortcutPlatform = currentPlatform()): string[] {
  const { modifiers, key } = parseShortcut(shortcut);
  const keys =
    platform === "apple"
      ? [...modifiers]
          .sort((a, b) => APPLE_ORDER.indexOf(a) - APPLE_ORDER.indexOf(b))
          .map((m) => APPLE_SYMBOLS[m])
      : modifiers.map((m) => OTHER_NAMES[m]);
  if (key) keys.push(formatKey(key, platform));
  return [...new Set(keys)];
}

const APPLE_ORDER: Modifier[] = ["ctrl", "alt", "shift", "mod", "meta"];

/** One display string: "⌘⇧D" on Apple, "Ctrl+Shift+D" elsewhere. */
export function formatShortcut(shortcut: string, platform: ShortcutPlatform = currentPlatform()): string {
  return shortcutKeys(shortcut, platform).join(platform === "apple" ? "" : "+");
}

/** Screen-reader friendly form for aria-keyshortcuts: "Meta+Shift+D". */
export function ariaShortcut(shortcut: string, platform: ShortcutPlatform = currentPlatform()): string {
  const { modifiers, key } = parseShortcut(shortcut);
  const names = modifiers.map((m) => {
    if (m === "mod") return platform === "apple" ? "Meta" : "Control";
    if (m === "ctrl") return "Control";
    return m[0]!.toUpperCase() + m.slice(1);
  });
  return [...new Set(names), key].filter(Boolean).join("+");
}

export function currentPlatform(): ShortcutPlatform {
  return isApplePlatform() ? "apple" : "other";
}
