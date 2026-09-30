/** Registers every Station element. For per-component imports use "@station/components/<name>". */
import "./define/icon.ts";
import "./define/kbd.ts";

export type { IconDefinition } from "@station/icons";
export { getIcon, hasIcon, registerIcons } from "@station/icons";
export * from "./elements.ts";
