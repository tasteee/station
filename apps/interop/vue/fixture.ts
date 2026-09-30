import type {} from "@station/components/vue";
import type { GlobalComponents } from "vue";

type Props<C> = C extends new (...args: never[]) => { $props: infer P } ? P : never;
type RowProps = Props<GlobalComponents["st-row"]>;

export const ok: RowProps = { "x-align": "between", gap: "2" };
// @ts-expect-error: invalid alignment
export const bad: RowProps = { "x-align": "sideways" };
