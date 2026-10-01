/** @jsxImportSource react */
import "@station/tokens";
import "@station/components";
import type {} from "@station/components/react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, it } from "vitest";

afterEach(() => {
  document.body.innerHTML = "";
});

async function render(node: React.ReactNode) {
  const host = document.createElement("div");
  document.body.append(host);
  await act(() => createRoot(host).render(node));
  return host;
}

it("React 19 renders layout attributes and element props", async () => {
  const host = await render(
    <st-row x-align="between" gap="2" className="bar">
      <st-kbd shortcut="Mod+K" kind="boxed" />
    </st-row>,
  );
  const row = host.querySelector("st-row")!;
  expect(row.getAttribute("x-align")).toBe("between");
  expect(row.className).toBe("bar");
  expect(getComputedStyle(row).justifyContent).toBe("space-between");
  const kbd = host.querySelector("st-kbd")!;
  await (kbd as unknown as { updated: Promise<void> }).updated;
  expect(kbd.kind).toBe("boxed");
  expect(kbd.shadowRoot!.querySelectorAll("kbd").length).toBe(2);
});

it("React 19 binds onChange (synthetic) and lowercase onchange (native, with detail)", async () => {
  const seen: string[] = [];
  const host = await render(
    <st-vector-field
      value="1 2"
      onChange={(e) => seen.push(`synthetic:${e.currentTarget.values.join(",")}`)}
      onchange={(e) => seen.push(`native:${e.detail.values.join(",")}`)}
    />,
  );
  const field = host.querySelector("st-vector-field")!;
  await (field as unknown as { updated: Promise<void> }).updated;
  field.dispatchEvent(new CustomEvent("change", { bubbles: true, detail: { values: [3, 4] } }));
  expect(seen).toContain("native:3,4");
  expect(seen.some((s) => s.startsWith("synthetic:"))).toBe(true);
});
