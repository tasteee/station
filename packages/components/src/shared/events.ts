/** Native-shaped events. `change` does not cross shadow roots on its own, so controls re-dispatch it. */
export function fire(host: Element, type: "input" | "change" | string, detail?: unknown) {
  const event =
    detail === undefined
      ? new Event(type, { bubbles: true, composed: true })
      : new CustomEvent(type, { bubbles: true, composed: true, detail });
  return host.dispatchEvent(event);
}
