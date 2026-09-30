import "@station/tokens";
import "../src/index.ts";

// biome-ignore lint/suspicious/noExplicitAny: tests poke at arbitrary element props.
export type Upd = HTMLElement & { updated: Promise<void>; update(): void } & Record<string, any>;

/** Mount HTML, wait for every Station element to render, return the root. */
export async function mount(html: string): Promise<HTMLElement> {
  const root = document.createElement("div");
  root.innerHTML = html;
  document.body.append(root);
  await settle(root);
  return root;
}

export async function settle(root: Element = document.body) {
  for (let i = 0; i < 3; i++) {
    const els = [...root.querySelectorAll("*")] as Upd[];
    await Promise.all(els.map((el) => el.updated));
    await new Promise((r) => requestAnimationFrame(r));
  }
}

export const $ = <T extends Element = Upd>(root: ParentNode, sel: string) =>
  root.querySelector(sel) as unknown as T;
