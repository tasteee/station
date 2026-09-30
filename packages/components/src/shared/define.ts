/** Define a custom element once. Safe when two bundles both import Station. */
export function define(tag: string, element: CustomElementConstructor): void {
  if (!customElements.get(tag)) customElements.define(tag, element);
}
