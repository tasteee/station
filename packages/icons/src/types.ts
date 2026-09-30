/** One SVG child: [tagName, attributes]. Matches Tabler's node format. */
export type IconNode = readonly [tag: string, attrs: Readonly<Record<string, string>>];

/**
 * An icon drawn on a 24×24 grid.
 * `outline` icons use stroke = currentColor. `filled` icons use fill = currentColor.
 */
export interface IconDefinition {
  readonly type: "outline" | "filled";
  readonly nodes: readonly IconNode[];
}
