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
| `@station/components` | Atomico elements: icon, kbd, buttons, toolbar, fields, number field, choices, sliders, select, combobox, tooltip |
| `@station/icons` | Icon registry + all 6,000+ Tabler icons as tree-shakeable exports |
| `@station/behaviors` | Framework-free logic: roving focus, typeahead, drag-to-scrub, safe math, popover positioning, shortcuts |
| `apps/playground` | A mini editor shell to see and tune everything |
| `apps/storybook` | Component workshop with theme + density toolbar |
| `apps/interop` | Type fixtures for React, Preact, Solid, Vue, Svelte + React runtime test |

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

## Controls (Tier 1)

| Element | Notes |
|---|---|
| `st-button` | `kind` solid/outline/ghost · `tone` accent/danger · `icon`, `icon-end`, `loading`, `type="submit"` |
| `st-icon-button` | Icon only. `label` = accessible name **and** tooltip; `shortcut` shows in the tooltip |
| `st-toggle-button` | `pressed`; `tone="accent"` for tool pickers |
| `st-button-group` | Children inherit `kind` + `size`; `attached` joins them |
| `st-toolbar` | One tab stop, arrow keys between buttons |
| `st-segmented-control` + `st-segment` | Radio group look-alike; `block` fills width |
| `st-tooltip` | Wraps any element. Icon buttons don't need it |
| `st-text-field`, `st-search-field`, `st-textarea` | Filled by default; form-associated |
| `st-number-field` | Drag `prefix`/`icon` to scrub · ↑/↓ (Shift ×10, Alt ×0.1) · type math · `unit` · `mixed` |
| `st-checkbox`, `st-switch`, `st-radio-group` + `st-radio` | Form-associated; Space toggles; arrows in radio groups |
| `st-slider`, `st-range-slider` | Keyboard + pointer; range thumbs can't cross |
| `st-select`, `st-combobox` + `st-option` | Top-layer popover listbox; typeahead; `allow-custom` on combobox |

Every control: host is the control (focus, ARIA via `ElementInternals`), `input` while changing, `change` on commit, works in `<form>`.

**Adding a component:** add it to `packages/components/scripts/components.json`, run `pnpm --filter @station/components wire`, then add its metadata in `meta/`. A test fails if metadata and props drift.

## Framework typings

Generated from one metadata source (`packages/components/meta`). Add one line to get typed tags and attributes:

```ts
import type {} from "@station/components/react";  // or /preact, /solid, /vue, /svelte
```

- `HTMLElementTagNameMap` is augmented globally, so `document.createElement("st-kbd")` is typed everywhere.
- `@station/components/custom-elements.json`: Custom Elements Manifest.
- `@station/components/vscode.html-data.json`: add to `html.customData` in VS Code for autocomplete in plain HTML.

**Events.** Station uses native names (`input`, `change`) so `onChange` / `onInput` work in React 19, `@change` in Vue, `onchange` in Svelte. Other events are single lowercase words (React: `oncommit={…}`).

## Develop

```sh
pnpm install
pnpm dev        # playground at localhost:5173
pnpm test       # node + real-browser tests (Vitest + Playwright)
pnpm test:visual  # screenshot tests; add -u to update baselines
pnpm --filter storybook dev   # Storybook at localhost:6006
pnpm typecheck
pnpm lint
```

Browser tests launch Chromium through Playwright. Set `STATION_CHROMIUM` to use a specific binary.

Visual baselines live in `test/__visual__/` and depend on the exact Chromium build and fonts, so they are **not** part of CI yet. Run them locally before and after visual changes.
