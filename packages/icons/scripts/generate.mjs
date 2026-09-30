// Turns Tabler's node JSON into one tree-shakeable TS module:
//   export const IconPlus = o([["path", { d: "M12 5l0 14" }], ...]);
// Bundlers drop every export you don't import.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, "../src/generated/tabler.ts");
// @tabler/icons has an exports map that hides its root, so resolve a known file.
const require = createRequire(import.meta.url);
const pkgDir = join(dirname(require.resolve("@tabler/icons/outline/plus.svg")), "../..");
const version = JSON.parse(readFileSync(join(pkgDir, "package.json"), "utf8")).version;

if (existsSync(out) && readFileSync(out, "utf8").includes(`@tabler/icons@${version} `)) {
  console.log(`icons: tabler ${version} already generated`);
  process.exit(0);
}

const pascal = (name) =>
  name
    .split("-")
    .map((p) => p[0].toUpperCase() + p.slice(1))
    .join("");

const lines = [
  `// Generated from @tabler/icons@${version} (MIT). Do not edit.`,
  `import type { IconDefinition, IconNode } from "../types.ts";`,
  "",
  'const o = (nodes: IconNode[]): IconDefinition => ({ type: "outline", nodes });',
  'const f = (nodes: IconNode[]): IconDefinition => ({ type: "filled", nodes });',
  "",
];

let count = 0;
for (const type of ["outline", "filled"]) {
  const nodes = JSON.parse(readFileSync(join(pkgDir, `tabler-nodes-${type}.json`), "utf8"));
  for (const [name, children] of Object.entries(nodes)) {
    const id = `Icon${pascal(name)}${type === "filled" ? "Filled" : ""}`;
    lines.push(
      `export const ${id} = /* @__PURE__ */ ${type === "filled" ? "f" : "o"}(${JSON.stringify(children)});`,
    );
    count++;
  }
}

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, `${lines.join("\n")}\n`);
console.log(`icons: generated ${count} tabler icons`);
