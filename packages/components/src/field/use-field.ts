import { useEffect, useHost, useInternals, useRef, useState } from "atomico";

/** Tracks whether a named slot has content, so empty affixes take no space. */
export function useSlotFilled(): [boolean, (event: Event) => void] {
  const [filled, setFilled] = useState(false);
  const onslotchange = (event: Event) => {
    const slot = event.target as HTMLSlotElement;
    setFilled(slot.assignedNodes({ flatten: true }).some((n) => n.nodeType === 1 || n.textContent?.trim()));
  };
  return [filled, onslotchange];
}

export interface TextValueOptions {
  value: string | undefined;
  required?: boolean;
  label?: string;
}

/**
 * Shared wiring for text-like fields: ARIA, form value, required validity,
 * and syncing an inner <input>/<textarea> with the `value` prop.
 */
export function useTextValue<T extends HTMLInputElement | HTMLTextAreaElement>({
  value,
  required,
  label,
}: TextValueOptions) {
  const host = useHost();
  const internals = useInternals();
  const input = useRef<T>();

  useEffect(() => {
    const el = input.current;
    if (el && el.value !== (value ?? "")) el.value = value ?? "";
    internals.setFormValue(value ?? "");
    if (required && !value) {
      internals.setValidity({ valueMissing: true }, "Please fill out this field.", el ?? undefined);
    } else {
      internals.setValidity({});
    }
  }, [value, required]);

  useEffect(() => {
    const el = input.current;
    if (el) {
      if (label) el.setAttribute("aria-label", label);
      else el.removeAttribute("aria-label");
    }
  }, [label]);

  return { host, internals, input };
}
