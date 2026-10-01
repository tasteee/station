import { registerIcons } from "@station/icons";
import { tablerIcons } from "@station/icons/tabler/all";
import axe from "axe-core";
import { afterEach, describe, expect, it } from "vitest";
import { cdp } from "vitest/browser";
import { exampleIcons, examples } from "../meta/examples.ts";
import { elements } from "../meta/index.ts";
import { settle } from "./helpers.ts";

registerIcons(Object.fromEntries(exampleIcons.map((name) => [name, tablerIcons[name]!])));

afterEach(() => {
  document.body.innerHTML = "";
});

/** Render inside a themed panel surface, as an app would. */
async function render(example: (typeof examples)[number], theme: "light" | "dark") {
  const root = document.createElement("st-surface");
  root.setAttribute("theme", theme);
  root.setAttribute("level", "panel");
  root.setAttribute("padding", "4");
  root.setAttribute("role", "region");
  root.setAttribute("aria-label", "example");
  root.innerHTML = example.html;
  document.body.append(root);
  example.setup?.(root);
  await settle(root);
  // Let enter animations finish so contrast is measured on final colors.
  await Promise.all(
    document
      .getAnimations()
      .filter((a) => a.effect?.getComputedTiming().iterations !== Number.POSITIVE_INFINITY)
      .map((a) => a.finished.catch(() => {})),
  );
  return root;
}

it("every element has at least one example", () => {
  const covered = new Set(examples.flatMap((e) => e.covers));
  expect(elements.map((e) => e.tag).filter((tag) => !covered.has(tag))).toEqual([]);
  expect(new Set(examples.map((e) => e.id)).size).toBe(examples.length);
});

it("every example icon exists in Tabler", () => {
  expect(exampleIcons.filter((name) => !tablerIcons[name])).toEqual([]);
});

/**
 * axe reads roles from attributes only, so it can't see roles set through ElementInternals.
 * Two rules misfire on Station hosts because of that. The Chrome AX-tree test above covers them.
 */
function axeBlindSpot(v: axe.Result): boolean {
  const onStationHosts = v.nodes.every((n) => /^<st-/.test(n.html));
  if (v.id === "aria-allowed-attr") return onStationHosts; // e.g. aria-expanded on <st-button> (role=button via internals)
  if (v.id === "aria-required-children")
    // e.g. <st-tab> children of a tablist: role=tab via internals
    return v.nodes.every((n) =>
      /children which are not allowed: (st-[\w-]+[^,]*(, )?)+$/.test(n.failureSummary ?? ""),
    );
  return false;
}

type AXNode = {
  nodeId: string;
  ignored: boolean;
  role?: { value: string };
  name?: { value: string };
  properties?: { name: string; value: { value: unknown } }[];
  childIds?: string[];
};

/** Chrome's real accessibility tree under the example root (sees ElementInternals, unlike axe). */
async function axTree(): Promise<AXNode[]> {
  // biome-ignore lint/suspicious/noExplicitAny: vitest's CDPSession type omits send().
  const session = cdp() as any;
  const { frameTree } = await session.send("Page.getFrameTree");
  const frame = (frameTree.childFrames as { frame: { id: string; name: string } }[]).find(
    (f) => f.frame.name === "vitest-iframe",
  )!.frame;
  const { nodes } = (await session.send("Accessibility.getFullAXTree", { frameId: frame.id })) as {
    nodes: AXNode[];
  };
  const byId = new Map(nodes.map((n) => [n.nodeId, n]));
  const root = nodes.find((n) => n.role?.value === "region" && n.name?.value === "example")!;
  const out: AXNode[] = [];
  const walk = (n: AXNode) => {
    out.push(n);
    for (const id of n.childIds ?? []) {
      const child = byId.get(id);
      if (child) walk(child);
    }
  };
  walk(root);
  return out;
}

describe.each(examples)("$id", (example) => {
  it("renders every element it covers, without errors", async () => {
    const errors: string[] = [];
    const onError = (e: ErrorEvent) => errors.push(e.message);
    window.addEventListener("error", onError);
    const root = await render(example, "light");
    window.removeEventListener("error", onError);
    expect(errors).toEqual([]);
    for (const tag of example.covers) {
      const el = root.querySelector(tag);
      expect(el, tag).not.toBeNull();
      expect(
        customElements.get(tag) || elements.find((e) => e.tag === tag)?.cssOnly,
        `${tag} defined`,
      ).toBeTruthy();
    }
  });

  it("every focusable node has a real role and a name (Chrome AX tree)", async () => {
    await render(example, "light");
    const problems = (await axTree())
      .filter(
        (n) => !n.ignored && n.properties?.some((p) => p.name === "focusable" && p.value.value === true),
      )
      .filter((n) => ["generic", "none"].includes(n.role?.value ?? "") || !n.name?.value?.trim())
      .map((n) => `${n.role?.value} "${n.name?.value ?? ""}"`);
    if (problems.length) console.warn(`[ax] ${example.id}: ${problems.join(" | ")}`);
    expect(problems).toEqual([]);
  });

  it.each(["light", "dark"] as const)("has no axe violations (%s)", async (theme) => {
    const root = await render(example, theme);
    const result = await axe.run(root, {
      // Examples are fragments, not pages.
      rules: {
        region: { enabled: false },
        "landmark-one-main": { enabled: false },
        "page-has-heading-one": { enabled: false },
      },
    });
    const summary = result.violations
      .filter((v) => !axeBlindSpot(v))
      .map(
        (v) =>
          `${v.id}: ${v.nodes.map((n) => `${n.target.join(" > ")} — ${n.failureSummary?.split("\n")[1]?.trim()}`).join(" | ")}`,
      );
    if (summary.length) console.warn(`[axe] ${example.id} ${theme}\n  ${summary.join("\n  ")}`);
    expect(summary).toEqual([]);
  });
});
