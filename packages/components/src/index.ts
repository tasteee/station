/** Registers every Station element. For per-component imports use "@station/components/<name>". */
import "./define/icon.ts";
import "./define/kbd.ts";
import "./define/button.ts";
import "./define/icon-button.ts";
import "./define/toggle-button.ts";
import "./define/button-group.ts";
import "./define/toolbar.ts";
import "./define/segmented-control.ts";
import "./define/segment.ts";
import "./define/tooltip.ts";
import "./define/text-field.ts";
import "./define/search-field.ts";
import "./define/textarea.ts";
import "./define/number-field.ts";
import "./define/checkbox.ts";
import "./define/switch.ts";
import "./define/radio-group.ts";
import "./define/radio.ts";
import "./define/slider.ts";
import "./define/range-slider.ts";
import "./define/select.ts";
import "./define/option.ts";
import "./define/combobox.ts";

export type { IconDefinition } from "@station/icons";
export { getIcon, hasIcon, registerIcons } from "@station/icons";
export * from "./elements.ts";
