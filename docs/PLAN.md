# Station — Design System Plan

A web-component design system for **dense, interaction-heavy editor UIs** (Figma, Photoshop, Ableton-class apps).

**Core idea:** flat UI. Hierarchy comes from **surface color, borders, and text contrast**. Shadows only on things that leave the page flow.

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

Same 12-step recipe, different knobs:
- `--st-accent-hue`, `--st-accent-chroma` → selection, focus ring, primary solid button.
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
- Dark mode is planned now, shipped later. Semantic tokens mean components never change.

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
| **CSS anchor positioning** | JS positioning (keep Floating UI as fallback until support is universal) |
| **`ElementInternals`** | manual ARIA roles, form wiring |
| **Constructable stylesheets** | per-instance `<style>` tags (one sheet shared by all instances) |
| OKLCH, relative color, `color-mix()`, `pow()` | build-time color/type generation |
| `@layer`, `@property` | specificity fights; typed/animatable tokens |

**Proposed floor:** last 2 versions of Chrome, Safari, Firefox (evergreen desktop). Editors rarely need legacy support.

---

## 8. Things easy to miss now

- **Accessibility across shadow roots.** `aria-labelledby` can't point across shadow boundaries. Use `ElementInternals` + `label` attributes. Test with axe + screen readers.
- **Keyboard model.** Roving tabindex in toolbars/trees/menus, typeahead in lists, Esc stack for nested overlays. Editors are keyboard-heavy.
- **Shortcut manager.** One registry: scoped shortcuts (canvas vs text field), conflict detection, display strings for tooltips/menus.
- **Pointer model.** Drag-to-scrub, drag-to-reorder, and resize all need pointer capture, Esc to cancel, and a shared "dragging" cursor state.
- **Performance.** Virtualize trees/lists/tables from day one. Keep per-row components cheap (row = light DOM where possible). Benchmark 10k rows.
- **Selection semantics.** One shared model: click, Shift range, Mod toggle. Reused by tree, list, table.
- **Undo-friendly events.** `input` (preview) vs `change` (commit) must be consistent so apps can batch undo steps during a drag.
- **Icons.** Pick one 16px-grid set (Lucide at 1.5 stroke is a good fit). `st-icon` resolves names from a registry so apps can add their own.
- **Framework users.** React 19 handles custom elements well. Still ship: JSX type declarations (React, Preact, Solid, Vue), optional React wrappers, VS Code HTML custom data.
- **Dev-mode warnings.** Missing `label` on icon buttons, invalid `x-align` values, unknown `kind`. Stripped in prod.
- **Pointer: coarse.** Auto-bump density on touch devices.
- **RTL.** Use logical properties (`padding-inline`) from the start. Cheap now, painful later.

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
apps/
  storybook/
  playground/    # a fake mini-editor (layers, canvas, inspector) to dogfood everything
```

**The playground editor matters most.** Components that look fine in isolation often break in a real dense layout. Build a tiny Figma-like shell early and grow it with each tier.

---

## 10. Roadmap

1. **Foundations** — tokens, themes, layout primitives, text, icon, token playground page (live knob sliders).
2. **Core controls** — Tier 1, with tests + visual regression.
3. **Structure + overlays** — Tier 2. Playground becomes a real inspector.
4. **Editor-grade** — tree, split, table, color picker, command palette.
5. **Dark theme + polish** — dark tables, density presets, docs site, 1.0.

---

## 11. Open decisions

1. **Tag prefix:** `st-` (short) or `station-`?
2. **Size values:** `small/medium/large` (reads like English) or `sm/md/lg` (shorter)?
3. **Default accent:** cool blue matching the gray hue, or near-black monochrome?
4. **Primary consumers:** plain HTML, React, or both first-class?
5. **Icon set:** Lucide, Phosphor, or custom?
6. **Browser floor:** evergreen-only (enables all of section 7)?
7. **Dark theme timing:** v1 or post-1.0?
