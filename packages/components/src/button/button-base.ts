import { useEffect, useHost, useInternals } from "atomico";
import { useFocusable } from "../shared/focusable.ts";

type Kind = "solid" | "outline" | "ghost";
const GROUPS = "st-button-group, st-toolbar";

/** Own `kind`, else the nearest group's, else the component default. */
export function useEffectiveKind(kind: string | undefined, fallback: Kind): Kind {
  const host = useHost();
  if (kind) return kind as Kind;
  const group = (host.current as HTMLElement).parentElement?.closest(GROUPS) as
    | (HTMLElement & { kind?: string })
    | null;
  return (group?.kind as Kind) || fallback;
}

export interface PressOptions {
  disabled?: boolean;
  loading?: boolean;
  role?: string;
  onPress?: (event: Event) => void;
}

/**
 * Host-as-button behavior: ARIA via ElementInternals, focusability,
 * Enter/Space activation, and swallowing clicks while disabled/loading.
 */
export function usePressable({ disabled, loading, role = "button", onPress }: PressOptions) {
  const host = useHost();
  const internals = useInternals();
  useFocusable(disabled);

  useEffect(() => {
    internals.role = role;
  }, [role]);
  useEffect(() => {
    internals.ariaDisabled = disabled ? "true" : null;
    internals.ariaBusy = loading ? "true" : null;
  }, [disabled, loading]);

  const onclick = (event: MouseEvent) => {
    if (disabled || loading) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }
    onPress?.(event);
  };

  const onkeydown = (event: KeyboardEvent) => {
    if (event.target !== host.current || event.repeat) return;
    if (event.key === "Enter") {
      event.preventDefault();
      (host.current as HTMLElement).click();
    } else if (event.key === " ") {
      event.preventDefault();
      (host.current as HTMLElement).dataset.active = "";
    }
  };

  const onkeyup = (event: KeyboardEvent) => {
    if (event.target !== host.current || event.key !== " ") return;
    const el = host.current as HTMLElement;
    delete el.dataset.active;
    el.click();
  };

  return { internals, onclick, onkeydown, onkeyup };
}
