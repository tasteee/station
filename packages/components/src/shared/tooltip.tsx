import { autoPosition, type Placement } from "@station/behaviors";
import { c, css } from "atomico";
import "../define/kbd.ts";
import { define } from "./define.ts";
import { hostReset } from "./styles.ts";

/**
 * One shared tooltip bubble for the whole page, positioned next to whatever
 * is hovered or keyboard-focused. Used by icon buttons (from `label` +
 * `shortcut`) and by <st-tooltip>.
 */
export const TooltipBubble = c(
  ({ label, shortcut }) => (
    <host shadowDom role="tooltip" aria-hidden="true">
      <span class="label">{label}</span>
      {shortcut && <st-kbd shortcut={shortcut} />}
    </host>
  ),
  {
    props: { label: String, shortcut: String },
    styles: [
      hostReset,
      css`
        :host {
          display: none;
          align-items: center;
          gap: var(--st-space-2);
          max-width: 240px;
          padding: var(--st-space-1) var(--st-space-1-5);
          border: 0;
          border-radius: var(--st-radius-2);
          background: var(--st-gray-12);
          color: var(--st-gray-1);
          box-shadow: var(--st-shadow-popover);
          font: var(--st-weight-medium) var(--st-text-1) / var(--st-leading-tight) var(--st-font-sans);
          pointer-events: none;
          --st-text-muted: var(--st-gray-8);
          --st-text-faint: var(--st-gray-9);
        }
        :host(:popover-open) {
          display: inline-flex;
          animation: in var(--st-duration-fast) var(--st-ease);
        }
        @keyframes in {
          from {
            opacity: 0;
          }
        }
      `,
    ],
  },
);

define("st-tooltip-bubble", TooltipBubble);

type Bubble = HTMLElement & { label?: string; shortcut?: string };

export interface TooltipContent {
  label?: string | null;
  shortcut?: string | null;
  placement?: Placement;
}

const SHOW_DELAY = 500;
const WARM_WINDOW = 400;

let bubble: Bubble | null = null;
let owner: Element | null = null;
let stopPositioning: (() => void) | null = null;
let showTimer: ReturnType<typeof setTimeout> | undefined;
let lastHiddenAt = 0;

function getBubble(): Bubble {
  if (!bubble?.isConnected) {
    bubble = document.createElement("st-tooltip-bubble") as Bubble;
    bubble.popover = "manual";
    document.body.append(bubble);
  }
  return bubble;
}

function show(anchor: Element, content: TooltipContent) {
  if (!content.label) return;
  const el = getBubble();
  el.label = content.label;
  el.shortcut = content.shortcut ?? undefined;
  // Follow the anchor's theme, even inside a themed subtree.
  el.style.colorScheme = getComputedStyle(anchor).colorScheme;
  stopPositioning?.();
  owner = anchor;
  if (!el.matches(":popover-open")) el.showPopover();
  stopPositioning = autoPosition(anchor, el, { placement: content.placement ?? "bottom", offset: 6 });
}

export function hideTooltip(anchor?: Element) {
  clearTimeout(showTimer);
  if (anchor && owner !== anchor) return;
  if (bubble?.matches(":popover-open")) {
    bubble.hidePopover();
    lastHiddenAt = Date.now();
  }
  stopPositioning?.();
  stopPositioning = null;
  owner = null;
}

/** Wire hover + keyboard focus on `anchor` to the shared bubble. Returns cleanup. */
export function attachTooltip(anchor: HTMLElement, read: () => TooltipContent): () => void {
  const schedule = () => {
    clearTimeout(showTimer);
    const warm = Date.now() - lastHiddenAt < WARM_WINDOW || owner !== null;
    showTimer = setTimeout(() => show(anchor, read()), warm ? 0 : SHOW_DELAY);
  };
  const onEnter = (event: PointerEvent) => event.pointerType !== "touch" && schedule();
  const onLeave = () => hideTooltip(anchor);
  const onFocus = () => anchor.matches(":focus-visible") && schedule();
  const onKey = (event: KeyboardEvent) => event.key === "Escape" && hideTooltip(anchor);

  anchor.addEventListener("pointerenter", onEnter);
  anchor.addEventListener("pointerleave", onLeave);
  anchor.addEventListener("pointerdown", onLeave);
  anchor.addEventListener("focusin", onFocus);
  anchor.addEventListener("focusout", onLeave);
  anchor.addEventListener("keydown", onKey);
  return () => {
    hideTooltip(anchor);
    anchor.removeEventListener("pointerenter", onEnter);
    anchor.removeEventListener("pointerleave", onLeave);
    anchor.removeEventListener("pointerdown", onLeave);
    anchor.removeEventListener("focusin", onFocus);
    anchor.removeEventListener("focusout", onLeave);
    anchor.removeEventListener("keydown", onKey);
  };
}
