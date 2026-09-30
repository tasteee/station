import { controls } from "./controls.meta.ts";
import { foundations } from "./foundations.meta.ts";
import type { ElementMeta } from "./types.ts";

export const elements: ElementMeta[] = [...foundations, ...controls];
export type * from "./types.ts";
