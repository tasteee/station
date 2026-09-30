# Station — Design System Plan

A web-component design system for **dense, interaction-heavy editor UIs** (Figma, Photoshop, Ableton-class apps).

**Core idea:** flat UI. Hierarchy comes from **surface color, borders, and text contrast**. Shadows only on things that leave the page flow.

## Decisions locked

| Topic | Decision |
|---|---|
| Tag prefix | `st-` |
| Size values | `small` · `medium` · `large` |
| Consumers | Unknown. **Framework-agnostic is a hard requirement** (React, Vue, Angular, Svelte, plain HTML). See §8.1. |
| Icons | **Tabler Icons** — the largest single-style, consistent set (5,000+, MIT). See §8.2. |
| Browsers | Recent evergreen only (Chrome, Edge, Safari, Firefox — last 2 versions) |
| Dark theme | Ships in **v1** |
| Default accent | **Near-black (monochrome).** Inverts to near-white in dark. See §2.3. |

---

## 1. Framework: Atomico vs Lit

**Verdict: stay with Atomico.** Keep the render layer thin so the choice stays cheap to reverse.

### Atomico
**Benefits**
- Real TSX. Normal tooling, normal types, no template strings.
- Props declared once in `static props` → typed attributes, reflection, and events.
- Hooks model (`useProp`, `useEvent`, `useContext`) is fast to write.
- Tiny runtime (~3–4 KB).
- `@atomico/react` / `@atomico/exports` can generate framework wrappers.

**Risks**
- Small community. Effectively one core maintainer (bus factor).
- Fewer answers online. Fewer third-party tools.
- Custom Elements Manifest (CEM) tooling is built around Lit. May need a small plugin.
- SSR story is weaker (low priority for editors, which are client apps).

### Lit
**Benefits**
- Large ecosystem. Google-backed. First-class CEM analyzer and SSR.
- Reactive controllers are a good pattern for shared behavior.

**Risks**
- `html\`\`` tagged templates. Weaker type checking in templates without extra plugins.
- Decorators + class boilerplate. Slower to author than Atomico hooks.

### Mitigation (do this either way)
- Put all **behavior** in framework-free TS modules: roving focus, typeahead, overlay placement, drag/scrub, keyboard shortcuts, selection models.
- Components only wire props → behavior → DOM.
- If Atomico ever dies, we rewrite the render layer only.

---

## 2. Token system

**Pattern:** a few **knob** variables → CSS derives **scales** → **semantic** tokens → components read only semantic tokens.

```
knobs (hue, chroma, unit, radius, font size, ratio, density)
  └─► scales (gray-1..12, gray-a1..a12, accent-1..12, space-*, radius-*, text-*)
        └─► semantic (--st-bg-panel, --st-text-strong, --st-border, ...)
              └─► components
```

- All derivation is **pure CSS at runtime**. Change one knob, everything updates. No rebuild.
- Users can still override any single variable.
- Everything lives in cascade layers so overrides always win:
  `@layer station.tokens, station.base, station.components;`
- Custom properties inherit through shadow DOM, so theming works across component boundaries with no extra work.

### 2.1 Color — 12-step grayscale

Built in **OKLCH**. Lightness is perceptual, so contrast stays stable when the hue knob changes.

```css
:root {
  --st-gray-hue: 255;      /* slightly cool, not blue */
  --st-gray-chroma: 0.006; /* near-neutral */

  --st-gray-1:  oklch(99.2% calc(var(--st-gray-chroma) * 0.5) var(--st-gray-hue));
  --st-gray-2:  oklch(97.6% var(--st-gray-chroma) var(--st-gray-hue));
  /* ... */
  --st-gray-12: oklch(21%   var(--st-gray-chroma) var(--st-gray-hue));
}
```

Draft lightness values (tune with a contrast checker before locking):

| Step | L (light) | Role |
|---|---|---|
| 1 | 99.2% | Panel background (brightest surface) |
| 2 | 97.6% | Section / grouped area inside a panel, field fill |
| 3 | 95.6% | Canvas / workspace, control well (e.g. button group bed) |
| 4 | 93.4% | Hover |
| 5 | 91.2% | Pressed / neutral selected |
| 6 | 88.6% | Subtle border, dividers |
| 7 | 84.8% | Default border (controls, groups) |
| 8 | 76.0% | Strong border, hovered border |
| 9 | 64.0% | Disabled text, placeholder, inactive icons |
| 10 | 53.0% | Muted text: labels, metadata (must hit ≥4.5:1 on step 1–2) |
| 11 | 40.0% | Body text |
| 12 | 21.0% | Titles, strong text, active icons |

**Text contrast ladder** (your "hierarchy of dominance"):
- `--st-text-strong` → 12 — panel titles, selected item names
- `--st-text` → 11 — normal content
- `--st-text-muted` → 10 — property labels, secondary info
- `--st-text-faint` → 9 — placeholders, disabled

Note: Radix-style scales only have 2 text steps. We push step 10 darker so we get **3 readable tiers + 1 disabled tier**.

### 2.2 Alpha scale (state layers)

Hover/pressed must work on **any** surface. A solid `gray-4` hover is invisible on a `gray-3` well.

Fix: states use **alpha grays** that stack on whatever is underneath.

```css
--st-gray-a4: oklch(from var(--st-gray-12) l c h / 0.06);
--st-bg-hover:   var(--st-gray-a4);
--st-bg-pressed: var(--st-gray-a5);
```

- Surfaces use solid steps.
- Interaction states use alpha steps.
- Result: an icon button hovers correctly on a panel, a section, or a well. No per-context rules.

### 2.3 Accent + status colors

**Default accent is near-black.** It is built with the same 12-step recipe as gray, with the chroma knob set to `0`:

```css
--st-accent-hue: var(--st-gray-hue);
--st-accent-chroma: 0;   /* monochrome by default. Set e.g. 0.18 for a brand color. */
```

- Light: `--st-accent-solid` = step 12 (near-black), `--st-text-on-accent` = step 1.
- Dark: the steps flip, so the accent becomes near-white with dark text on top.
- Apps get a brand color by changing **2 knobs**. No component changes.

Where the monochrome accent shows up:
- Solid buttons (`kind="solid" tone="accent"`), checked checkbox/switch/radio, slider fill, active tab indicator.
- **Selection** (tree/list rows): `--st-bg-selected` = gray-a5, text goes to `--st-text-strong`. `--st-bg-selected-strong` (selected + focused list) = accent solid with inverted text.
- **Focus ring:** 1.5px solid `--st-border-focus` (step 12) + 1px offset. The offset gap keeps it distinct from step 7–8 borders.

**Risks of monochrome**
- Selection and focus must come from contrast and weight alone, since there's no hue to lean on. Visual tests must check a focused + selected + hovered row in both themes.
- Canvas selection handles (in apps) usually want color. That's the app's call; we expose `--st-accent-*` for it.

Status colors keep real hues:
- `--st-danger-hue`, `--st-warning-hue`, `--st-success-hue`.
- Risk: high-chroma yellows/limes need dark text on solid fills. Add `--st-accent-on-solid` token and pick per theme.

### 2.4 Semantic color tokens

```
Surfaces      --st-bg-canvas  --st-bg-panel  --st-bg-section  --st-bg-well  --st-bg-field
States        --st-bg-hover   --st-bg-pressed  --st-bg-selected  --st-bg-selected-strong
Borders       --st-border-subtle  --st-border  --st-border-strong  --st-border-focus
Text          --st-text-strong  --st-text  --st-text-muted  --st-text-faint  --st-text-on-accent
Accent        --st-accent-solid  --st-accent-solid-hover  --st-accent-bg  --st-accent-text
Status        --st-danger-*  --st-warning-*  --st-success-*
Elevation     --st-shadow-popover  --st-shadow-dialog  --st-shadow-floating
```

### 2.5 Themes

- Default: light. `:root` holds light values.
- Dark: `[theme="dark"]` on any element swaps the lightness table. Works on a subtree (e.g. a dark canvas inside a light app).
- `theme="system"` follows `prefers-color-scheme`.
- **Both themes ship in v1.** Every visual test runs in light and dark.
- Semantic tokens mean components never branch on theme.
- In dark, surface order flips: raised surfaces get **lighter**, not darker. The semantic mapping handles this; components don't care.

### 2.6 Spacing

```css
--st-unit: 4px;
--st-density: 1;             /* 0.875 compact · 1 default · 1.125 comfy */
--st-space-1: calc(var(--st-unit) * 1 * var(--st-density));
--st-space-2: calc(var(--st-unit) * 2 * var(--st-density));
/* 0, 0.5, 1, 1.5, 2, 3, 4, 5, 6, 8 */
```

**Density** is an editor must-have. One knob tightens the whole app.

### 2.7 Control sizes

Editors live at 20–28px. "Large" is not a CTA.

| size | height | icon | font |
|---|---|---|---|
| `small` | 20px | 14px | text-1 |
| `medium` (default) | 24px | 16px | text-2 |
| `large` | 28px | 16px | text-2 |

All multiplied by `--st-density`.

### 2.8 Radius

```css
--st-radius: 4px;
--st-radius-1: calc(var(--st-radius) * 0.5);  /* chips inside fields */
--st-radius-2: var(--st-radius);              /* controls */
--st-radius-3: calc(var(--st-radius) * 1.5);  /* panels, popovers */
--st-radius-4: calc(var(--st-radius) * 2);    /* dialogs */
--st-radius-full: 9999px;
```

Set `--st-radius: 0` for a hard-edged look. Rule: **inner radius = outer radius − padding**.

### 2.9 Type

```css
--st-font-sans: "DM Sans Variable", system-ui, sans-serif;
--st-font-mono: "DM Mono", ui-monospace, monospace;
--st-font-size: 12px;       /* editor base */
--st-type-ratio: 1.125;
--st-text-1: calc(var(--st-font-size) * pow(var(--st-type-ratio), -1)); /* ~10.7px */
--st-text-2: var(--st-font-size);                                         /* 12px */
--st-text-3: calc(var(--st-font-size) * pow(var(--st-type-ratio), 1));  /* 13.5px */
/* ... up to text-6 for dialog titles */
```

- **DM Sans has an optical-size axis (9–40).** Use `font-optical-sizing: auto`. Big win at 11–12px.
- Weights: 400 body, 500 labels/titles, 600 rare emphasis.
- Numbers in fields/tables: `font-variant-numeric: tabular-nums`. Verify DM Sans supports `tnum`; fall back to DM Mono for numeric inputs if not.
- Self-host via `@fontsource-variable/dm-sans`. Ship font loading as opt-in CSS.

### 2.10 Elevation (shadows)

Only three tokens. Only for things that leave the flow.

| Token | Used by |
|---|---|
| `--st-shadow-popover` | tooltip, menu, context menu, select list, popover |
| `--st-shadow-floating` | floating/undocked panels, toasts |
| `--st-shadow-dialog` | dialog, command palette |

Docked panels = **no shadow**. They are surfaces, separated by color and a border.

### 2.11 Motion + focus

- Durations: 80ms (hover), 120ms (open), 160ms (dialog). No bounce.
- `prefers-reduced-motion` → 0ms.
- Focus: `--st-focus-ring: 0 0 0 1.5px var(--st-border-focus)` on `:focus-visible` only. Flat UIs need a strong, obvious ring.

---

## 3. Surface context

Nested surfaces are the heart of the system. Make them explicit and cheap.

```html
<st-panel>                       <!-- bg-panel (gray-1) -->
  <st-panel-header>Layers</st-panel-header>   <!-- text-strong -->
  <st-tree>...</st-tree>                      <!-- text -->
  <st-panel-footer>
    <st-button-group kind="well">             <!-- bg-well (gray-3) -->
      <st-icon-button icon="plus"   label="Add layer"></st-icon-button>
      <st-icon-button icon="folder" label="Group layers"></st-icon-button>
      <st-icon-button icon="trash"  label="Delete layer"></st-icon-button>
    </st-button-group>
  </st-panel-footer>
</st-panel>
```

- Each surface sets `--st-bg` on itself.
- Children hover with alpha layers, so they read correctly on every surface.
- A generic `<st-surface level="panel|section|well|canvas">` covers custom layouts.

---

## 4. Layout primitives

Three elements. **No JS, no shadow DOM.** Styled by a global stylesheet using attribute selectors. They work even before JS loads. Zero cost in 10,000-row trees.

| Element | Base |
|---|---|
| `<st-box>` | `display: flex` only |
| `<st-row>` | flex row. `x-align` → `justify-content`, `y-align` → `align-items` |
| `<st-column>` | flex column. `x-align` → `align-items`, `y-align` → `justify-content` |

You always think in **x and y**. Never main/cross axis.

```html
<st-row x-align="between" y-align="center" gap="2">
  <st-text weight="strong">Layers</st-text>
  <st-icon-button icon="plus" label="Add layer"></st-icon-button>
</st-row>
```

Shared attributes:
- `x-align` / `y-align`: `start` `center` `end` `stretch` `between` `around` `evenly` `baseline`
  (`between/around/evenly` only valid on the main axis; dev-mode warning otherwise)
- `gap`, `padding`, `padding-x`, `padding-y`: spacing scale steps (`gap="2"`)
- `wrap`, `grow`, `shrink="none"`, `inline`
- Extras: `<st-spacer>` (flex: 1), `<st-divider>` (1px `border-subtle`, orientation from parent).

---

## 5. Component API conventions

Attributes read like English. Same words everywhere.

| Attribute | Values | Notes |
|---|---|---|
| `kind` | `solid` `outline` `ghost` (+ `well` on groups) | Visual style. Never `variant`. |
| `tone` | `neutral` `accent` `danger` | Color meaning. Separate from `kind`. |
| `size` | `small` `medium` `large` | Cascades: `<st-toolbar size="small">` sizes all children. |
| `disabled` `selected` `pressed` `open` `loading` `readonly` `invalid` | boolean | Plain states. |
| `label` | string | Required on icon-only controls. Drives `aria-label` **and** the tooltip. |
| `shortcut` | `"Mod+D"` | Shown in tooltips/menus. `Mod` = ⌘ on Mac, Ctrl elsewhere. |

**Size cascade trick:** `size` sets CSS variables (`--st-control-height`, etc.) on the host. Children inherit them. A child's own `size` wins. No JS context needed.

**Events:** native-shaped. `input` while dragging/typing, `change` on commit. Typed `CustomEvent`s for the rest (`st-select`, `st-rename`, `st-reorder`).

**Styling hooks:** CSS variables first, `::part()` second, slots for content.

**Forms:** inputs are form-associated (`ElementInternals`) so they work in `<form>`.

---

## 6. Component inventory

### Tier 0 — Foundations
- Tokens CSS, base reset, font CSS
- `st-box`, `st-row`, `st-column`, `st-spacer`, `st-divider`
- `st-text` (`tone`, `weight`, `size`, `truncate`, `mono`), `st-heading`
- `st-icon`, `st-kbd`
- `st-surface`, `st-scroll-area` (thin overlay scrollbars)

### Tier 1 — Core controls
- `st-button`, `st-icon-button`, `st-toggle-button`
- `st-button-group`, `st-toolbar` (roving focus)
- `st-segmented-control` (align left/center/right, etc.)
- `st-text-field`, `st-textarea`, `st-search-field`
- **`st-number-field`** — scrub by dragging the label, arrow keys ±1, Shift ±10, math input (`=12*2`), units, min/max/step
- `st-checkbox`, `st-switch`, `st-radio-group`
- `st-select`, `st-combobox`
- `st-slider`, `st-range-slider`
- `st-tooltip` (auto from `label` + `shortcut`)

### Tier 2 — Structure + overlays
- `st-panel`, `st-panel-header`, `st-panel-footer`
- `st-section` (collapsible, titled group)
- **`st-property-row`** / `st-property-grid` — label + control, aligned columns (inspector)
- `st-tabs`
- `st-menu`, `st-menu-item`, `st-context-menu`, `st-menu-button`, submenus
- `st-popover`, `st-dialog`, `st-alert-dialog`
- `st-toast`
- `st-badge`, `st-progress`, `st-spinner`, `st-empty-state`

### Tier 3 — Editor-grade
- **`st-tree`** — virtualized, multi-select, drag reorder, inline rename, row actions (eye/lock), keyboard nav
- `st-list` / `st-listbox` — virtualized
- `st-data-table` — virtualized, resizable columns, sort, cell editing
- **`st-split`** — resizable panes, min/max, collapse, persisted sizes
- `st-dock` — dockable/tabbed panel layout (big; maybe last)
- `st-command-palette`
- `st-color-swatch`, `st-color-field`, `st-color-picker` (OKLCH/HSV, alpha, eyedropper API)
- `st-vector-field` (x/y/z), `st-angle-field`, `st-knob` (Ableton-style), `st-meter` (level meter)
- `st-status-bar`, `st-menubar`, `st-breadcrumbs`, `st-zoom-control`
- `st-inline-edit` (double-click to rename)

---

## 7. Platform features to lean on

These kill whole classes of bugs. Worth a high browser floor.

| Feature | Replaces |
|---|---|
| **Popover API** (top layer) | z-index wars, portals |
| **`<dialog>`** | custom focus traps, inert handling |
| **CSS anchor positioning** | JS positioning (confirm current Firefox/Safari support at build time; if a gap remains, a tiny in-house positioner in `behaviors/`, no dependency) |
| **`ElementInternals`** | manual ARIA roles, form wiring |
| **Constructable stylesheets** | per-instance `<style>` tags (one sheet shared by all instances) |
| OKLCH, relative color, `color-mix()`, `pow()` | build-time color/type generation |
| `@layer`, `@property` | specificity fights; typed/animatable tokens |

**Floor (locked):** last 2 versions of Chrome, Edge, Safari, Firefox. No polyfills, no legacy builds. Output is plain ES2022+ modules.

---

## 8. Things easy to miss now

- **Accessibility across shadow roots.** `aria-labelledby` can't point across shadow boundaries. Use `ElementInternals` + `label` attributes. Test with axe + screen readers.
- **Keyboard model.** Roving tabindex in toolbars/trees/menus, typeahead in lists, Esc stack for nested overlays. Editors are keyboard-heavy.
- **Shortcut manager.** One registry: scoped shortcuts (canvas vs text field), conflict detection, display strings for tooltips/menus.
- **Pointer model.** Drag-to-scrub, drag-to-reorder, and resize all need pointer capture, Esc to cancel, and a shared "dragging" cursor state.
- **Performance.** Virtualize trees/lists/tables from day one. Keep per-row components cheap (row = light DOM where possible). Benchmark 10k rows.
- **Selection semantics.** One shared model: click, Shift range, Mod toggle. Reused by tree, list, table.
- **Undo-friendly events.** `input` (preview) vs `change` (commit) must be consistent so apps can batch undo steps during a drag.
- **Dev-mode warnings.** Missing `label` on icon buttons, invalid `x-align` values, unknown `kind`. Stripped in prod.
- **Pointer: coarse.** Auto-bump density on touch devices.
- **RTL.** Use logical properties (`padding-inline`) from the start. Cheap now, painful later.

### 8.1 Framework-agnostic rules

Consumers are unknown, so the element API must work the same everywhere.

**Rules**
- **Attributes for simple values** (strings, numbers, booleans). Works in plain HTML and every framework.
- **Properties for rich data** (`tree.items`, `table.rows`). React 19, Vue, Angular, Svelte, Solid all set properties on custom elements.
- **Event names: lowercase, no colons, no camelCase.** Native names where they fit (`input`, `change`, `toggle`). Custom ones as `st-select`, `st-reorder`. Every framework can bind these.
- **No framework-only features** in the core (no render props, no React context).
- **Slots for content**, never content-as-attribute.
- **Self-registering** (`import "@station/components/button"`) plus a `defineAll()` for convenience. Guard against double registration.

**Per-framework support we ship**

| Framework | How it works | What we ship |
|---|---|---|
| Plain HTML | Native | CDN build, VS Code custom data (autocomplete) |
| React 19+ | Native custom element support | JSX `IntrinsicElements` types. Optional thin wrappers package. |
| Vue 3 | `isCustomElement` compiler option | `GlobalComponents` types + setup snippet |
| Angular | `CUSTOM_ELEMENTS_SCHEMA` | Types + setup snippet |
| Svelte 5 | Native | `svelte/elements` type augmentation |
| Solid / Preact | Native | JSX types |

- **All types generate from one Custom Elements Manifest.** One source → every framework's typings.
- **Integration tests:** a tiny app per framework in CI that renders a button, binds `change`, sets a rich property. Catches breaks before users do.

### 8.2 Icons — Tabler

- **Why Tabler:** largest one-style set (5,000+ outline icons), strict 24px grid, uniform stroke, MIT. Lucide (~1,600) is cleaner but smaller; Material Symbols is big but reads "Google".
- Render at 16px with **stroke 1.5** for editor density. Stroke is a token: `--st-icon-stroke`.
- **Tree-shakeable.** Apps import only icons they use:
  ```ts
  import { registerIcons } from "@station/icons";
  import { IconPlus, IconTrash } from "@station/icons/tabler";
  registerIcons({ plus: IconPlus, trash: IconTrash });
  ```
  ```html
  <st-icon name="plus"></st-icon>
  <st-icon-button icon="trash" label="Delete layer"></st-icon-button>
  ```
- Apps register custom icons the same way. Unknown name → dev-mode warning.
- Icons use `currentColor`, so they follow the text contrast ladder automatically.

---

## 9. Tooling

| Area | Pick |
|---|---|
| Package manager / repo | **pnpm workspaces** monorepo |
| Language | **TypeScript** strict |
| Build | **Vite** library mode + `@atomico/vite` |
| Lint / format | **Biome** (one fast tool) |
| Unit / interaction tests | **Vitest browser mode** + Playwright (real Chromium; shadow DOM needs a real browser) |
| Visual regression | **Playwright screenshots** per component × size × kind × theme |
| A11y tests | **axe-core** in the same runs |
| Component workshop | **Storybook** (web-components-vite) |
| Framework smoke tests | Minimal React / Vue / Angular / Svelte apps in `apps/interop/` |
| Docs site | Astro or Storybook docs (decide later) |
| API metadata | **Custom Elements Manifest** → docs, IDE autocomplete, JSX types |
| Releases | **Changesets** |
| CI | GitHub Actions: lint, typecheck, tests, visual diff |

### Repo layout

```
packages/
  tokens/        # CSS only: knobs, scales, semantic, themes, layout primitives
  behaviors/     # framework-free TS: focus, typeahead, drag, shortcuts, selection
  components/    # Atomico elements
  icons/         # icon registry + default set
  react/         # optional generated wrappers
  types/         # generated typings for each framework (from CEM)
apps/
  storybook/
  playground/    # a fake mini-editor (layers, canvas, inspector) to dogfood everything
  interop/       # react/ vue/ angular/ svelte/ smoke-test apps
```

**The playground editor matters most.** Components that look fine in isolation often break in a real dense layout. Build a tiny Figma-like shell early and grow it with each tier.

---

## 10. Roadmap

1. **Foundations** — tokens, **light + dark themes**, layout primitives, text, icon, token playground page (live knob sliders + theme toggle).
2. **Core controls** — Tier 1, with tests + visual regression.
3. **Structure + overlays** — Tier 2. Playground becomes a real inspector.
4. **Editor-grade** — tree, split, table, color picker, command palette.
5. **Polish** — density presets, docs site, interop tests green, 1.0.

---

## 11. Open decisions

None right now. Next step: scaffold the monorepo and build Tier 0 (tokens, themes, layout primitives).
