import type { Meta, StoryObj } from "@storybook/web-components-vite";

const meta: Meta = { title: "Canvas/Components" };
export default meta;

type Any = HTMLElement & Record<string, unknown>;

type Obj = { id: string; x: number; y: number; width: number; height: number; color: string };

/** A small data-driven editor: the app owns `objects`, the canvas reports changes. */
export const Editor: StoryObj = {
  render: () => {
    const root = document.createElement("div");
    root.innerHTML = `
      <st-row gap="3" y-align="start">
        <st-viewport id="sb-canvas" rulers grid="dots" snap marquee style="width:760px;height:480px">
          <st-artboard x="0" y="0" width="800" height="500" label="Desktop"></st-artboard>
          <st-artboard x="880" y="0" width="375" height="500" label="Mobile"></st-artboard>
          <st-transform-box slot="overlay" id="sb-box" rotatable hidden></st-transform-box>
        </st-viewport>
        <st-column gap="2">
          <st-minimap for="sb-canvas"></st-minimap>
          <st-zoom-control for="sb-canvas" size="small"></st-zoom-control>
          <st-text size="small" tone="muted" style="max-width:180px">
            Click a shape. Drag handles; Shift keeps proportions, Alt resizes from the center.
            Drag a guide out of a ruler. Space-drag pans, Mod+wheel zooms.
          </st-text>
        </st-column>
      </st-row>`;
    const vp = root.querySelector("st-viewport") as Any;
    const box = root.querySelector("st-transform-box") as Any;
    const board = root.querySelector("st-artboard") as HTMLElement;
    const objects: Obj[] = [
      { id: "a", x: 60, y: 60, width: 260, height: 160, color: "oklch(87% 0.21 132)" },
      { id: "b", x: 380, y: 60, width: 200, height: 160, color: "oklch(80% 0.05 250)" },
      { id: "c", x: 60, y: 280, width: 520, height: 140, color: "oklch(90% 0.02 80)" },
    ];
    let selected: string[] = [];
    const render = () => {
      board.replaceChildren(
        ...objects.map((o) => {
          const el = document.createElement("div");
          el.style.cssText = `position:absolute;left:${o.x}px;top:${o.y}px;width:${o.width}px;height:${o.height}px;border-radius:12px;background:${o.color}`;
          el.addEventListener("pointerdown", (e) => {
            e.stopPropagation();
            selected = [o.id];
            render();
          });
          return el;
        }),
      );
      vp.objects = objects.map(({ color: _, ...r }) => r);
      const sel = objects.find((o) => o.id === selected[0]);
      box.hidden = !sel;
      if (sel)
        Object.assign(box, { x: sel.x, y: sel.y, width: sel.width, height: sel.height, targets: sel.id });
    };
    const apply = (e: Event) => {
      const d = (e as CustomEvent).detail;
      const sel = objects.find((o) => o.id === selected[0]);
      if (sel) Object.assign(sel, { x: d.x, y: d.y, width: d.width, height: d.height });
      render();
    };
    box.addEventListener("transform", apply);
    box.addEventListener("change", apply);
    vp.addEventListener("select", (e: Event) => {
      selected = (e as CustomEvent).detail.ids.slice(0, 1);
      render();
    });
    render();
    (vp.updated as Promise<void>).then(() => requestAnimationFrame(() => (vp.fit as () => void)()));
    return root;
  },
};
