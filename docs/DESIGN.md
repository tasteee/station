# Station design language: Instrument

Station treats the interface as a **precision instrument**: calm, exact, grayscale chrome around the user's work. Color belongs to what the user makes, not to the tool.

## Principles

1. **The work is the only color.**
   Panels, controls, selection and focus are grayscale by default. A designer looking at their artboard, a photo, a waveform or a timeline should never see pops of color they didn't choose. Status colors (danger, warning, success) appear only when something needs attention.

2. **Ink for "live".**
   What is happening now reads as ink: near-black on light themes, near-white on dark.
   - **On states:** switch, checkbox, radio, pressed toggle, selected tool, record/loop: ink fills with light glyphs.
   - **Selection:** a soft gray pill behind the selected layer, row or menu item, with strong text.
   - **Focus:** a strong-gray ring, plus a soft halo on fields.
   - **Time and position:** playhead and ruler marker in ink.

   Navigation (tabs, nav lists, segmented modes) and values at rest (slider fills, knob arcs) stay neutral. A slider or knob shows the live ink while it is being adjusted.

3. **Color is opt-in.**
   `signal="lime"` or `signal="orange"` on any element colors what is live inside it: one button, a panel, or the whole app. `signal="none"` returns a subtree to grayscale. `tone="signal"` on a button gives a single call to action the signal fill. Each preset meets contrast targets in both themes (`packages/tokens/test/contrast.test.ts`). Light signals like lime keep bold fills with dark ink; rings and text darken on light themes.

4. **Soft geometry, dense controls.**
   Large radii (`--st-radius-5`, `--st-radius-6`) for cards, regions and floating panels; medium radii (`--st-radius`, 6px by default) for controls, because editors pack controls tightly. Pills for search, zoom and selection rows where they help. Separate regions with tone and spacing before reaching for borders. Shadows only for things that float (menus, popovers, dialogs, the tool dock).

5. **Depth from tone, not lines.**
   Neutral grays (`--st-gray-chroma: 0`). Canvas → card → raised card step in tone. Fields are recessed wells: a faint fill plus a hairline edge.

6. **Labels are legends; values are readouts.**
   Section titles and small headings are micro-labels: uppercase DM Mono, tracked, muted. Numbers use DM Mono with tabular figures. Large headings and readouts can go light (300) and tight. Values are stronger than their labels.

7. **Fast, physical motion.**
   80–160ms with one ease curve. State changes, not choreography. `prefers-reduced-motion` turns it off.

## Tokens

| Token | Default (grayscale) | Use |
|---|---|---|
| `--st-signal` | gray 11 | Rings and marks. ≥3:1 on every surface. |
| `--st-signal-text` | gray 12 | Signal-colored text and icons. ≥4.5:1. |
| `--st-signal-fill`, `--st-signal-fill-end` | gray 12 → 11 | "On" fills; `--st-signal-gradient` sweeps between them. |
| `--st-text-on-signal` | gray 1 | Text and glyphs on fills. |
| `--st-signal-soft`, `--st-signal-soft-strong` | gray alpha 3 / 5 | Selection (`--st-bg-selected`, `--st-bg-selected-strong`). |
| `--st-signal-edge` | none | Hairline on fills close to the surface (lime on light). |
| `--st-accent-solid` | gray 12 | Primary actions. |
| `--st-radius-5`, `--st-radius-6` | 18px, 24px | Cards, regions, floating panels. |

## Checklist for a new component

- Does anything show color the user didn't choose? Make it grayscale or put it behind `signal` / `tone="signal"`.
- Is a value fill neutral at rest? Is navigation neutral?
- Do fields read as wells, with a focus halo?
- Are section labels micro-labels and numbers mono?
- Does it pass the example suite (axe in both themes + Chrome AX tree)?
