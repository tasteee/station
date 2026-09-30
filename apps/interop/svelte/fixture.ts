import type {} from "@station/components/svelte";
import type { SvelteHTMLElements } from "svelte/elements";

type Row = SvelteHTMLElements["st-row"];

export const ok: Row = { "x-align": "between", gap: "2", class: "bar" };
// @ts-expect-error: invalid alignment
export const bad: Row = { "x-align": "sideways" };
