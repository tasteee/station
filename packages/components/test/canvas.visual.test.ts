import { it } from "vitest";
import "../src/index.ts";
import { matchBothThemes } from "./visual.ts";

const objects = [
  { id: "card", x: 40, y: 40, width: 200, height: 120 },
  { id: "chart", x: 300, y: 40, width: 180, height: 120 },
];

it("canvas", async () => {
  await matchBothThemes(
    "canvas",
    `<st-row gap="3" y-align="start">
  <st-viewport id="vis-canvas" rulers grid="dots" snap zoom="0.5" x="-40" y="-60" style="width:420px;height:300px">
    <st-artboard x="0" y="0" width="520" height="320" label="Home">
      <div style="position:absolute;left:40px;top:40px;width:200px;height:120px;border-radius:12px;background:oklch(87% 0.21 132)"></div>
      <div style="position:absolute;left:300px;top:40px;width:180px;height:120px;border-radius:12px;background:oklch(80% 0.05 250)"></div>
    </st-artboard>
    <st-artboard x="580" y="0" width="200" height="320" label="Side"></st-artboard>
    <st-transform-box slot="overlay" x="40" y="40" width="200" height="120" rotatable></st-transform-box>
    <st-measure slot="overlay" x1="240" y1="100" x2="300" y2="100"></st-measure>
  </st-viewport>
  <st-column gap="2">
    <st-minimap for="vis-canvas" style="width:150px;height:100px"></st-minimap>
    <st-zoom-control for="vis-canvas" size="small"></st-zoom-control>
  </st-column>
</st-row>`,
    640,
    (frame) => {
      const vp = frame.querySelector("st-viewport") as HTMLElement & Record<string, unknown>;
      vp.objects = objects;
      vp.guides = [{ id: "g", axis: "x", position: 270 }];
    },
  );
});
