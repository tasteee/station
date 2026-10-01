import "@station/tokens";
import "@station/tokens/fonts.css";
import "@station/components";
import "./docs.css";
import "./icons.ts";
import { controls } from "../../../packages/components/meta/controls.meta.ts";
import { editor } from "../../../packages/components/meta/editor.meta.ts";
import { type Example, examples } from "../../../packages/components/meta/examples.ts";
import { foundations } from "../../../packages/components/meta/foundations.meta.ts";
import { kits } from "../../../packages/components/meta/kits.meta.ts";
import { structure } from "../../../packages/components/meta/structure.meta.ts";
import type { AttributeMeta, ElementMeta } from "../../../packages/components/meta/types.ts";

const REPO = "https://github.com/tasteee/station";
const groups: [string, ElementMeta[]][] = [
  ["Foundations", foundations],
  ["Controls", controls],
  ["Structure + overlays", structure],
  ["Editor-grade", editor],
  ["Domain kits", kits],
];
const all = groups.flatMap(([, els]) => els);
const groupOf = (tag: string) => groups.find(([, els]) => els.some((e) => e.tag === tag))?.[0] ?? "";

const $ = <T extends HTMLElement = HTMLElement>(sel: string) => document.querySelector(sel) as T;
const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const md = (s: string) => esc(s).replace(/`([^`]+)`/g, "<code>$1</code>");

// ---------- Header ----------
$("#link-playground").addEventListener("click", () => (location.href = "./playground/"));
$("#link-storybook").addEventListener("click", () => (location.href = "./storybook/"));
$("#link-github").addEventListener("click", () => window.open(REPO, "_blank", "noopener"));

const app = $("#app");
const themeControl = $<HTMLElement & { value: string }>("#theme");
const stored = (() => {
  try {
    return localStorage.getItem("docs-theme");
  } catch {
    return null;
  }
})();
const initial = stored ?? (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
app.setAttribute("theme", initial);
themeControl.value = initial;
themeControl.addEventListener("change", () => {
  app.setAttribute("theme", themeControl.value);
  try {
    localStorage.setItem("docs-theme", themeControl.value);
  } catch {}
});

// ---------- Nav ----------
$("#nav").innerHTML = [
  `<a class="nav-link" href="#/" data-route="">Overview</a>`,
  ...groups.map(
    ([name, els]) => `<st-column gap="0.5">
      <st-heading size="small" tone="muted" class="nav-group">${esc(name)}</st-heading>
      ${els.map((e) => `<a class="nav-link" href="#/${e.tag}" data-route="${e.tag}">${e.tag.slice(3)}</a>`).join("")}
    </st-column>`,
  ),
].join("");

// ---------- Rendering helpers ----------
function codeBlock(code: string, lang: string) {
  return `<div class="code"><div class="code-head"><st-text size="small" tone="muted">${lang}</st-text><st-spacer></st-spacer><st-icon-button size="small" kind="ghost" icon="copy" label="Copy ${lang}" class="copy"></st-icon-button></div><pre><code>${esc(code)}</code></pre></div>`;
}

function setupSource(fn: Example["setup"]) {
  if (!fn) return "";
  return fn
    .toString()
    .replace(/^\(root\)\s*=>\s*\{\n?/, "")
    .replace(/\}\s*$/, "")
    .replace(/^ {6}/gm, "")
    .trim();
}

function exampleCard(ex: Example, opts: { links?: boolean } = {}) {
  const links = opts.links
    ? `<st-row gap="1" wrap>${ex.covers.map((t) => `<a class="chip" href="#/${t}">${t}</a>`).join("")}</st-row>`
    : "";
  const js = setupSource(ex.setup);
  return `<section class="example" data-example="${ex.id}">
    <st-row gap="2" class="example-head"><st-heading>${esc(ex.title)}</st-heading><st-spacer></st-spacer>${links}</st-row>
    <div class="stage"><div class="stage-inner">${ex.html}</div></div>
    <details class="source"><summary><st-icon name="code"></st-icon>Code</summary>
      ${codeBlock(ex.html, "HTML")}
      ${js ? codeBlock(`const root = /* the container */;\n${js}`, "JavaScript") : ""}
    </details>
  </section>`;
}

function typeText(a: AttributeMeta) {
  return Array.isArray(a.type) ? a.type.map((v) => `"${v}"`).join(" | ") : (a.type as string);
}

function table(head: string[], rows: string[][]) {
  if (!rows.length) return "";
  return `<div class="table-wrap"><table><thead><tr>${head.map((h) => `<th>${h}</th>`).join("")}</tr></thead><tbody>${rows
    .map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`)
    .join("")}</tbody></table></div>`;
}

function api(el: ElementMeta) {
  const parts: string[] = [];
  const section = (title: string, body: string) =>
    body && parts.push(`<st-heading size="medium" class="api-title">${title}</st-heading>${body}`);
  section(
    "Attributes",
    table(
      ["Name", "Type", "Default", "Description"],
      el.attributes.map((a) => [
        `<code>${a.name}</code>${a.property && a.property !== a.name ? `<br><st-text size="small" tone="muted">.${a.property}</st-text>` : ""}`,
        `<code class="type">${esc(typeText(a))}</code>`,
        a.default != null ? `<code>${esc(String(a.default))}</code>` : "",
        md(a.description),
      ]),
    ),
  );
  section(
    "Properties",
    table(
      ["Name", "Type", "Description"],
      (el.properties ?? []).map((p) => [
        `<code>.${p.name}</code>`,
        `<code class="type">${esc(p.type)}</code>`,
        md(p.description),
      ]),
    ),
  );
  section(
    "Methods",
    table(
      ["Name", "Signature", "Description"],
      (el.methods ?? []).map((m) => [
        `<code>${m.name}</code>`,
        `<code class="type">${esc(m.signature ?? "(): void")}</code>`,
        md(m.description),
      ]),
    ),
  );
  section(
    "Events",
    table(
      ["Name", "Type", "Description"],
      (el.events ?? []).map((e) => [
        `<code>${e.name}</code>`,
        `<code class="type">${esc(e.type ?? "Event")}</code>`,
        md(e.description),
      ]),
    ),
  );
  section(
    "Slots",
    table(
      ["Name", "Description"],
      (el.slots ?? []).map((s) => [
        s.name ? `<code>${s.name}</code>` : `<st-text tone="muted">default</st-text>`,
        md(s.description),
      ]),
    ),
  );
  section(
    "CSS parts",
    table(
      ["Name", "Description"],
      (el.parts ?? []).map((s) => [`<code>::part(${s.name})</code>`, md(s.description)]),
    ),
  );
  section(
    "CSS properties",
    table(
      ["Name", "Description"],
      (el.cssProperties ?? []).map((s) => [`<code>${s.name}</code>`, md(s.description)]),
    ),
  );
  return parts.join("");
}

// ---------- Pages ----------
function home() {
  return `<article class="page">
    <header class="hero">
      <st-heading size="large" class="hero-title">Station</st-heading>
      <st-text size="large" tone="muted">Web components for dense editor UIs: image and vector editors, audio and video tools, IDEs and data apps. Framework-agnostic, themeable from a few CSS variables, light and dark.</st-text>
      <st-row gap="2" wrap>
        <st-badge>${all.length} elements</st-badge><st-badge>React · Vue · Svelte · Solid · Preact · HTML</st-badge><st-badge>Light + dark</st-badge>
      </st-row>
    </header>
    <st-heading size="medium" class="api-title">Install</st-heading>
    ${codeBlock(`import "@station/tokens";\nimport "@station/components"; // or one element: "@station/components/button"`, "JavaScript")}
    ${codeBlock(`<st-button kind="solid" tone="accent">Export</st-button>`, "HTML")}
    <st-heading size="medium" class="api-title">Examples</st-heading>
    <div class="gallery">${examples.map((ex) => exampleCard(ex, { links: true })).join("")}</div>
  </article>`;
}

function elementPage(el: ElementMeta) {
  const exs = examples.filter((e) => e.covers.includes(el.tag));
  const usage = el.module
    ? `import "${el.module}";`
    : `/* CSS only: styled by @station/tokens */\nimport "@station/tokens";`;
  return `<article class="page">
    <header class="el-head">
      <st-row gap="2"><st-heading size="large"><code>&lt;${el.tag}&gt;</code></st-heading><st-badge>${esc(groupOf(el.tag))}</st-badge>${el.cssOnly ? "<st-badge>CSS only</st-badge>" : ""}${el.formAssociated ? '<st-badge tone="accent">Form control</st-badge>' : ""}</st-row>
      <st-text size="large">${md(el.description)}</st-text>
    </header>
    ${codeBlock(usage, "Import")}
    ${exs.map((ex) => exampleCard(ex)).join("")}
    ${api(el)}
  </article>`;
}

function notFound(tag: string) {
  return `<article class="page"><st-empty-state style="height:60vh"><st-heading>Not found</st-heading><st-text>No element called ${esc(tag)}.</st-text></st-empty-state></article>`;
}

// ---------- Router ----------
function route() {
  const tag = decodeURIComponent(location.hash.replace(/^#\/?/, ""));
  const main = $("#main");
  const el = all.find((e) => e.tag === tag);
  main.innerHTML = !tag ? home() : el ? elementPage(el) : notFound(tag);
  document.title = el ? `${el.tag} · Station` : "Station";
  for (const card of main.querySelectorAll<HTMLElement>("[data-example]")) {
    const ex = examples.find((e) => e.id === card.dataset.example);
    ex?.setup?.(card.querySelector(".stage-inner") as HTMLElement);
  }
  for (const link of document.querySelectorAll<HTMLElement>(".nav-link")) {
    link.toggleAttribute("aria-current", link.dataset.route === tag);
    if (link.dataset.route === tag) link.setAttribute("aria-current", "page");
  }
  main.scrollTop = 0;
  main.focus({ preventScroll: true });
}

document.addEventListener("click", (e) => {
  const btn = (e.target as Element).closest?.(".copy");
  if (!btn) return;
  const code = btn.closest(".code")?.querySelector("code")?.textContent ?? "";
  navigator.clipboard?.writeText(code).then(() => {
    btn.setAttribute("icon", "check");
    setTimeout(() => btn.setAttribute("icon", "copy"), 1200);
  });
});

addEventListener("hashchange", route);
route();
