import { useEffect, useHost } from "atomico";

/**
 * Host-as-control focus handling.
 * Enabled: focusable (tabindex 0 unless a roving group already set it).
 * Disabled: removed from the tab order.
 */
export function useFocusable(disabled: boolean | undefined) {
  const host = useHost();
  useEffect(() => {
    const el = host.current as HTMLElement;
    if (disabled) el.removeAttribute("tabindex");
    else if (!el.hasAttribute("tabindex")) el.tabIndex = 0;
  }, [disabled]);
}
