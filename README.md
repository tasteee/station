# Station

A web-component design system for **dense, interaction-heavy editor UIs**: think Figma, Photoshop, Ableton.

- **Flat.** Hierarchy comes from surface color, borders and text contrast. Shadows only on things that float.
- **Dense.** Controls are 20 / 24 / 28px. One `density` knob tightens the whole app.
- **Themeable from a few knobs.** Change a hue, a unit or a radius and everything derives from it.
- **Works everywhere.** Custom elements. Plain HTML, React, Vue, Angular, Svelte.

See [`docs/PLAN.md`](docs/PLAN.md) for the full design plan.

## Packages

| Package | What |
|---|---|
| `@station/tokens` | CSS only: knobs, 12-step scales, light + dark themes, semantic tokens, layout primitives, text, surfaces |
| `@station/components` | Atomico elements (`st-icon`, `st-kbd`, more coming) |
| `@station/icons` | Icon registry + all 6,000+ Tabler icons as tree-shakeable exports |
| `@station/behaviors` | Framework-free logic: shortcut formatting, dev warnings |
| `apps/playground` | A mini editor shell to see and tune everything |

## Quick start

```ts
import "@station/tokens";           // tokens, themes, layout, text, surfaces
import "@station/tokens/fonts.css"; // optional: self-hosted DM Sans + DM Mono
import "@station/components";       // registers all st-* elements
import { registerIcons } from "@station/icons";
import { IconPlus, IconTrash } from "@station/icons/tabler";

registerIcons({ plus: IconPlus, trash: IconTrash });
```

```html
<html theme="light" density="default">
  <st-surface level="panel">
    <st-row padding-x="3" x-align="between">
      <st-heading>Layers</st-heading>
      <st-kbd shortcut="Alt+1"></st-kbd>
    </st-row>
    <st-surface level="well" rounded="small">
      <st-row padding="0.5" gap="0.5" size="small">…</st-row>
    </st-surface>
  </st-surface>
</html>
```

## Layout: think in x and y

| Element | `x-align` maps to | `y-align` maps to |
|---|---|---|
| `st-row` | `justify-content` | `align-items` (default `center`) |
| `st-column` | `align-items` | `justify-content` |
| `st-box` | plain `display: flex` | — |

Values: `start` `center` `end` `stretch` `baseline` `between` `around` `evenly`.
Shared: `gap`, `padding`, `padding-x`, `padding-y` (spacing steps: `0 0.5 1 1.5 2 2.5 3 4 5 6 8 10 12` × 4px), `wrap`, `inline`, `grow`, `shrink="none"`.
Extras: `st-spacer`, `st-divider` (turns vertical inside a row).

Layout, text and surface elements are **pure CSS**. No JS runs for them.

## Knobs

Set on `:root`, or on any `[theme]` / `[density]` element to scope them.

| Knob | Default | Drives |
|---|---|---|
| `--st-gray-hue` / `--st-gray-chroma` | `255` / `0.006` | 12-step gray + alpha gray |
| `--st-accent-hue` / `--st-accent-chroma` | gray hue / `0` | accent scale (0 = near-black monochrome) |
| `--st-unit` | `4px` | spacing, control heights |
| `--st-density` | `1` | spacing, control heights |
| `--st-radius` | `4px` | radius 1–4 |
| `--st-font-size` / `--st-type-ratio` | `12px` / `1.125` | text-1…text-6 |

Themes: `theme="light" | "dark" | "system"` on any element. Works on subtrees.

## Develop

```sh
pnpm install
pnpm dev        # playground at localhost:5173
pnpm test       # node + real-browser tests (Vitest + Playwright)
pnpm typecheck
pnpm lint
```

Browser tests launch Chromium through Playwright. Set `STATION_CHROMIUM` to use a specific binary.
