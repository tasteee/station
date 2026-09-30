import { expect } from "vitest";
import { page } from "vitest/browser";
import "@station/tokens";
import "@station/tokens/fonts.css";

/**
 * Render `html` on a panel surface in both themes and compare each to its baseline.
 * One screenshot per theme keeps diffs readable.
 */
export async function matchBothThemes(name: string, html: string, width = 480) {
  for (const theme of ["light", "dark"] as const) {
    document.body.innerHTML = "";
    const frame = document.createElement("st-surface");
    frame.setAttribute("theme", theme);
    frame.setAttribute("level", "panel");
    frame.setAttribute("padding", "4");
    frame.style.cssText = `display:inline-block;width:${width}px`;
    frame.innerHTML = html;
    document.body.append(frame);
    document.body.style.margin = "0";
    await document.fonts.ready;
    const els = [...frame.querySelectorAll("*")] as (Element & { updated?: Promise<void> })[];
    await Promise.all(els.map((el) => el.updated));
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    await expect.element(page.elementLocator(frame)).toMatchScreenshot(`${name}-${theme}`);
  }
}
