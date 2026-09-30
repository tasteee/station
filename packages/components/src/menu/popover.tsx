import type { Placement } from "@station/behaviors";
import { c, css, useEffect, useHost, useProp, useRef } from "atomico";
import { fireOpenChange } from "../shared/events.ts";
import { bindTrigger, createFloating } from "../shared/floating.ts";
import { floatingSurface, hostReset } from "../shared/styles.ts";

type PopoverEl = HTMLElement & {
  placement?: Placement;
  show(anchor?: Element | { x: number; y: number }): void;
  hide(): void;
};
const CONTROLLER = Symbol("popover");

const FOCUSABLE =
  "button, [href], input, select, textarea, [tabindex]:not([tabindex='-1']), st-button, st-icon-button, st-toggle-button, st-text-field, st-number-field, st-select, st-combobox, st-slider, st-checkbox, st-switch";

/**
 * Floating panel for rich content (color pickers, filters, settings).
 * Light-dismiss and Escape close it.
 *
 * <st-button id="filters">Filters</st-button>
 * <st-popover for="filters" placement="bottom-start">…</st-popover>
 */
export const Popover = c(
  ({ for: forId, label }) => {
    const host = useHost<PopoverEl & { [CONTROLLER]?: ReturnType<typeof createFloating> }>();
    const [open, setOpen] = useProp<boolean>("open");
    const floating = useRef<ReturnType<typeof createFloating>>();
    const el = host.current;

    useEffect(() => {
      el.popover = "auto";
      el.tabIndex = -1;
      el.setAttribute("role", "dialog");
      floating.current = createFloating(el, () => el.placement ?? "bottom", 6);
      el[CONTROLLER] = floating.current;
    }, []);

    useEffect(() => {
      if (label) el.setAttribute("aria-label", label);
    }, [label]);

    useEffect(() => {
      if (!forId) return;
      return bindTrigger(el, forId, "click", {
        open: (anchor) => el.show(anchor as HTMLElement),
        isOpen: () => el.matches(":popover-open"),
      });
    }, [forId]);

    // `open` set from outside: show against the `for` element.
    useEffect(() => {
      const isOpen = el.matches(":popover-open");
      if (open && !isOpen) el.show();
      if (!open && isOpen) el.hide();
    }, [open]);

    return (
      <host
        shadowDom
        ontoggle={(e: ToggleEvent) => {
          if (e.target !== el) return;
          const isOpen = e.newState === "open";
          if (isOpen)
            requestAnimationFrame(() =>
              ((el.querySelector(FOCUSABLE) as HTMLElement | null) ?? el).focus({ preventScroll: true }),
            );
          else floating.current?.closed();
          if (isOpen !== !!open) {
            setOpen(isOpen);
            fireOpenChange(el, isOpen);
          }
        }}
      >
        <slot />
      </host>
    );
  },
  {
    props: {
      for: { type: String, reflect: true },
      placement: { type: String, reflect: true },
      label: { type: String, reflect: true },
      open: { type: Boolean, reflect: true },
    },
    styles: [
      hostReset,
      floatingSurface,
      css`
        :host {
          min-width: 160px;
          max-width: min(360px, calc(100vw - 16px));
          max-height: var(--st-available-height, 480px);
          overflow: auto;
          padding: var(--st-space-3);
          margin: 0;
          outline: none;
        }
      `,
    ],
  },
);

Object.assign(Popover.prototype, {
  async show(
    this: PopoverEl & {
      [CONTROLLER]?: ReturnType<typeof createFloating>;
      updated: Promise<void>;
      for?: string;
    },
    anchor?: Element | { x: number; y: number },
  ) {
    if (!this[CONTROLLER]) await this.updated;
    const target = anchor ?? (this.for ? (this.getRootNode() as Document).getElementById?.(this.for) : null);
    if (target) this[CONTROLLER]!.show(target as Element);
  },
  hide(this: PopoverEl & { [CONTROLLER]?: ReturnType<typeof createFloating> }) {
    this[CONTROLLER]?.hide();
  },
});
