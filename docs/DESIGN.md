# Station design language: Instrument

Station treats the interface as a **precision instrument**: quiet, exact chrome around the user's work, with one bright signal that says what is live.

## Principles

1. **Content is the color; chrome is ink.**
   Panels, borders and text stay in a cool gray ladder. Hue comes from the user's work (artwork, clips, swatches) and from one signal color. Everything else earns its place by tone, not color.

2. **One signal for "live".**
   Signal Orange marks what is happening *now*. Use it for exactly these:
   - **On states:** switch, checkbox, radio, pressed toggle, selected tool, record/loop, mute/solo.
   - **Selected objects:** a soft signal tint behind the selected layer, row or menu item.
   - **Focus:** every focus ring and field focus halo.
   - **Time and position:** playhead, ruler marker.
   - **Values while adjusting:** a slider or knob turns signal only while it is dragged or focused.

   Not for: navigation (tabs, nav lists, segmented modes), values at rest (slider fills, knob arcs, meters), primary actions (those are near-black), status (danger, warning, success keep their own hues).

3. **Gradients mean "on".**
   Solid "on" fills (switch track, checkbox, selected tool with `tone="accent"`, pressed toggle with `tone="accent"`, progress) use `--st-signal-gradient`: a short sweep from signal orange toward amber. Tints and rings stay flat. Never use the gradient as decoration.

4. **Precision geometry.**
   A 4px grid, hairline edges, radii from one knob, aligned baselines. Shadows only for things that float above the page (menus, popovers, dialogs).

5. **Depth from tone, not lines.**
   Fields are recessed wells: a faint fill plus a hairline inner edge. Panels step in tone (canvas → panel → section). Borders appear where they separate, not everywhere.

6. **Labels are legends; values are readouts.**
   Section titles and small headings are micro-labels: uppercase DM Mono, tracked, muted. Numbers use DM Mono with tabular figures. Values are stronger than their labels.

7. **Fast, physical motion.**
   80–160ms with one ease curve. State changes, not choreography. `prefers-reduced-motion` turns it off.

## Tokens

| Token | Use |
|---|---|
| `--st-signal` | Rings, marks, small fills. ≥3:1 on every surface. |
| `--st-signal-text` | Signal-colored text and icons. ≥4.5:1 on every surface. |
| `--st-signal-gradient` | "On" fills. |
| `--st-text-on-signal` | Text and glyphs on signal fills. ≥4.5:1. |
| `--st-signal-soft`, `--st-signal-soft-strong` | Selection tints (`--st-bg-selected`, `--st-bg-selected-strong`). |
| `--st-accent-solid` | Primary actions and neutral value fills (near-black / near-white). |

Knobs: `--st-signal-hue` (40), `--st-signal-hue-end` (62, the gradient's end), `--st-signal-chroma` (0.21). Change them on any element to re-signal a subtree. Contrast targets are covered by `packages/tokens/test/contrast.test.ts`.

## Checklist for a new component

- Does anything use signal that is not live, selected, focused or on? Make it neutral.
- Is a value fill neutral at rest?
- Is navigation neutral?
- Do fields read as wells, with the signal halo on focus?
- Are section labels micro-labels and numbers mono?
- Does it pass the example suite (axe in both themes + Chrome AX tree)?
