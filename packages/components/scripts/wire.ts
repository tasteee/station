// Regenerates src/define/*.ts, src/elements.ts, src/index.ts and package.json exports
// from scripts/components.json. Run after adding a component: pnpm --filter @station/components wire
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

interface Entry {
  file: string;
  class: string;
  src: string;
  tag: string;
}

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const components: Entry[] = JSON.parse(readFileSync(join(root, "scripts/components.json"), "utf8"));

mkdirSync(join(root, "src/define"), { recursive: true });
for (const c of components) {
  writeFileSync(
    join(root, `src/define/${c.file}.ts`),
    `import { ${c.class} } from "../${c.src}";\nimport { define } from "../shared/define.ts";\n\ndefine("${c.tag}", ${c.class});\nexport { ${c.class} };\n`,
  );
}

writeFileSync(
  join(root, "src/elements.ts"),
  [
    "/** Element classes without registering them. Use to define under custom tags. */",
    ...components.map((c) => `export { ${c.class} } from "./${c.src}";`),
    'export { define } from "./shared/define.ts";',
    'export { confirm, type ConfirmOptions } from "./dialog/alert-dialog.tsx";',
    'export { toast, type ToastOptions } from "./feedback/toast.tsx";',
    'export { type MoveDetail, moveItems, type TreeItem, type TreeToggle, updateItem } from "./tree/model.ts";',
    'export type { Command } from "./palette/command-palette.tsx";',
    "",
  ].join("\n"),
);

writeFileSync(
  join(root, "src/index.ts"),
  [
    '/** Registers every Station element. For per-component imports use "@station/components/<name>". */',
    ...components.map((c) => `import "./define/${c.file}.ts";`),
    "",
    'export * from "./elements.ts";',
    'export { getIcon, hasIcon, registerIcons } from "@station/icons";',
    'export type { IconDefinition } from "@station/icons";',
    "",
  ].join("\n"),
);

const pkgPath = join(root, "package.json");
const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
for (const c of components) {
  pkg.exports[`./${c.file}`] = `./src/define/${c.file}.ts`;
  pkg.publishConfig.exports[`./${c.file}`] = {
    types: `./dist/define/${c.file}.d.ts`,
    default: `./dist/define/${c.file}.js`,
  };
}
writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);
console.log(`components: wired ${components.length} elements`);
