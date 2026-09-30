import { describe, expect, it } from "vitest";
import { elements } from "../meta/index.ts";
import * as classes from "../src/elements.ts";

const kebab = (s: string) => s.replace(/([A-Z])/g, "-$1").toLowerCase();

describe("metadata matches the real elements", () => {
  for (const el of elements.filter((e) => e.className)) {
    it(`<${el.tag}> props ↔ meta attributes`, () => {
      const Cls = (classes as Record<string, unknown>)[el.className!] as { props: Record<string, unknown> };
      expect(Cls, `${el.className} is exported from elements.ts`).toBeDefined();
      const props = Object.keys(Cls.props).sort();
      const metaProps = [
        ...el.attributes.filter((a) => a.property).map((a) => a.property!),
        ...(el.properties ?? []).map((p) => p.name),
      ].sort();
      expect(props).toEqual(metaProps);
      for (const a of el.attributes.filter((x) => x.property)) expect(a.name).toBe(kebab(a.property!));
    });
  }

  it("every JS element is registered under its tag", async () => {
    await import("../src/index.ts");
    for (const el of elements.filter((e) => e.className)) expect(customElements.get(el.tag)).toBeDefined();
  });
});
