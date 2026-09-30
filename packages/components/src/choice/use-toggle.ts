import { useEffect, useHost, useInternals, useProp } from "atomico";
import { fire } from "../shared/events.ts";
import { useFocusable } from "../shared/focusable.ts";

interface ToggleOptions {
  role: "checkbox" | "switch";
  disabled?: boolean;
  required?: boolean;
  value?: string;
  indeterminate?: boolean;
}

/** Checkbox / switch behavior: role, aria-checked, Space toggles, form value. */
export function useToggle({ role, disabled, required, value, indeterminate }: ToggleOptions) {
  const host = useHost();
  const internals = useInternals();
  const [checked, setChecked] = useProp<boolean>("checked");
  useFocusable(disabled);

  useEffect(() => {
    internals.role = role;
    internals.ariaChecked = indeterminate ? "mixed" : checked ? "true" : "false";
    internals.ariaDisabled = disabled ? "true" : null;
    internals.ariaRequired = required ? "true" : null;
    internals.setFormValue(checked ? (value ?? "on") : null);
    if (required && !checked) internals.setValidity({ valueMissing: true }, "Please check this box.");
    else internals.setValidity({});
  }, [checked, indeterminate, disabled, required, value]);

  const toggle = () => {
    if (disabled) return;
    const el = host.current as HTMLElement & { indeterminate?: boolean };
    el.indeterminate = false;
    setChecked(!checked);
    fire(el, "input");
    fire(el, "change");
  };

  return {
    checked,
    handlers: {
      onclick: (e: MouseEvent) => {
        // Let interactive children (links) work without toggling.
        if ((e.target as Element).closest?.("a")) return;
        toggle();
      },
      onkeydown: (e: KeyboardEvent) => {
        if (e.key === " " && e.target === host.current) e.preventDefault();
      },
      onkeyup: (e: KeyboardEvent) => {
        if (e.key === " " && e.target === host.current) toggle();
      },
    },
  };
}
