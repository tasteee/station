import type { IconDefinition } from "./types.ts";

const icons = new Map<string, IconDefinition>();
const listeners = new Set<() => void>();

/**
 * Register icons by name. Names are what you write in markup:
 *   registerIcons({ plus: IconPlus, trash: IconTrash })
 *   <st-icon name="plus">
 */
export function registerIcons(entries: Record<string, IconDefinition>): void {
  for (const [name, icon] of Object.entries(entries)) icons.set(name, icon);
  for (const listener of listeners) listener();
}

export function getIcon(name: string): IconDefinition | undefined {
  return icons.get(name);
}

export function hasIcon(name: string): boolean {
  return icons.has(name);
}

/** Called after every registerIcons(). Lets rendered icons pick up late registrations. */
export function onIconsChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
