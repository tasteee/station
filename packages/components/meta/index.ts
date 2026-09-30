import { controls } from "./controls.meta.ts";
import { foundations } from "./foundations.meta.ts";
import { structure } from "./structure.meta.ts";
import type { ElementMeta } from "./types.ts";

export const elements: ElementMeta[] = [...foundations, ...controls, ...structure];
export type * from "./types.ts";
