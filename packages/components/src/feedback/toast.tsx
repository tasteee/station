import { c, css, useEffect, useHost, useRef } from "atomico";
import { define } from "../shared/define.ts";
import { fire } from "../shared/events.ts";
import { Close } from "../shared/glyphs.tsx";
import { hostReset } from "../shared/styles.ts";

type ToastEl = HTMLElement & { dismiss(): void; duration?: number };

/**
 * A short, temporary message. Usually created with toast():
 *   toast("Exported 3 frames", { tone: "success", action: { label: "Show", onClick } })
 * Pauses while hovered or focused. Fires `close` when it goes away.
 */
export const Toast = c(
  ({ closable, actionLabel }) => {
    const host = useHost<ToastEl>();
    const timer = useRef<ReturnType<typeof setTimeout>>();

    const dismiss = () => {
      const el = host.current;
      if (el.dataset.leaving != null) return;
      el.dataset.leaving = "";
      clearTimeout(timer.current);
      const finish = () => {
        el.remove();
        fire(el, "close");
      };
      if (matchMedia("(prefers-reduced-motion: reduce)").matches) finish();
      else setTimeout(finish, 150);
    };

    const start = () => {
      clearTimeout(timer.current);
      const ms = host.current.duration ?? 4000;
      if (ms > 0) timer.current = setTimeout(dismiss, ms);
    };

    useEffect(() => {
      const el = host.current;
      el.dismiss = dismiss;
      el.setAttribute("role", "status");
      start();
      return () => clearTimeout(timer.current);
    }, []);

    return (
      <host
        shadowDom
        onpointerenter={() => clearTimeout(timer.current)}
        onpointerleave={start}
        onfocusin={() => clearTimeout(timer.current)}
        onfocusout={start}
      >
        <span class="dot" part="indicator" />
        <span class="message" part="message">
          <slot />
        </span>
        <slot name="action" />
        {actionLabel && (
          <button
            type="button"
            class="action"
            onclick={() => {
              fire(host.current, "action");
              dismiss();
            }}
          >
            {actionLabel}
          </button>
        )}
        {closable && (
          <button type="button" class="close" aria-label="Dismiss" onclick={dismiss}>
            <Close />
          </button>
        )}
      </host>
    );
  },
  {
    props: {
      tone: { type: String, reflect: true },
      duration: { type: Number, reflect: true },
      closable: { type: Boolean, reflect: true },
      actionLabel: { type: String, reflect: true },
    },
    styles: [
      hostReset,
      css`
        :host {
          display: flex;
          align-items: center;
          gap: var(--st-space-2);
          min-width: 220px;
          max-width: min(440px, calc(100vw - 32px));
          min-height: 36px;
          padding: var(--st-space-1-5) var(--st-space-2) var(--st-space-1-5) var(--st-space-3);
          border-radius: var(--st-radius-4);
          background: var(--st-gray-12);
          color: var(--st-gray-1);
          box-shadow: var(--st-shadow-floating);
          font: var(--st-weight-medium) var(--st-text-2) / var(--st-leading-tight) var(--st-font-sans);
          pointer-events: auto;
          animation: in var(--st-duration-slow) var(--st-ease);
          transition:
            opacity var(--st-duration) var(--st-ease),
            translate var(--st-duration) var(--st-ease);
        }
        :host([data-leaving]) {
          opacity: 0;
          translate: 0 4px;
        }
        @keyframes in {
          from {
            opacity: 0;
            translate: 0 8px;
          }
        }
        .dot {
          display: none;
          width: 8px;
          height: 8px;
          flex: none;
          border-radius: 50%;
        }
        :host([tone]) .dot {
          display: block;
        }
        :host([tone="success"]) .dot {
          background: var(--st-success-9);
        }
        :host([tone="warning"]) .dot {
          background: var(--st-warning-9);
        }
        :host([tone="danger"]) .dot {
          background: var(--st-danger-9);
        }
        :host([tone="accent"]) .dot {
          background: var(--st-gray-1);
        }
        .message {
          flex: 1;
          min-width: 0;
        }
        button {
          all: unset;
          display: inline-grid;
          place-items: center;
          flex: none;
          height: 24px;
          border-radius: var(--st-radius-2);
          color: var(--st-gray-1);
          cursor: default;
        }
        button:hover {
          background: oklch(from var(--st-gray-1) l c h / 0.12);
        }
        button:focus-visible {
          outline: var(--st-focus-ring-width) solid var(--st-gray-1);
          outline-offset: 1px;
        }
        .action {
          padding-inline: var(--st-space-2);
          font-weight: var(--st-weight-strong);
        }
        .close {
          width: 24px;
          color: var(--st-gray-8);
        }
        .close svg {
          width: 12px;
          height: 12px;
        }
      `,
    ],
  },
);

/**
 * Where toasts appear. Created on demand; add one yourself to change `placement`.
 * <st-toaster placement="top-end"></st-toaster>
 */
export const Toaster = c(
  () => {
    const host = useHost();
    useEffect(() => {
      const el = host.current as HTMLElement;
      el.popover = "manual";
      el.setAttribute("role", "region");
      el.setAttribute("aria-label", "Notifications");
      el.setAttribute("aria-live", "polite");
    }, []);
    return (
      <host shadowDom>
        <slot />
      </host>
    );
  },
  {
    props: { placement: { type: String, reflect: true } },
    styles: [
      hostReset,
      css`
        :host {
          position: fixed;
          inset: auto;
          bottom: var(--st-space-4);
          left: 50%;
          translate: -50% 0;
          margin: 0;
          padding: 0;
          border: 0;
          background: none;
          overflow: visible;
          pointer-events: none;
        }
        :host(:popover-open) {
          display: flex;
          flex-direction: column-reverse;
          align-items: center;
          gap: var(--st-space-2);
        }
        :host([placement="bottom-end"]) {
          left: auto;
          right: var(--st-space-4);
          translate: none;
          align-items: flex-end;
        }
        :host([placement^="top"]) {
          bottom: auto;
          top: var(--st-space-4);
          flex-direction: column;
        }
        :host([placement="top-end"]) {
          left: auto;
          right: var(--st-space-4);
          translate: none;
          align-items: flex-end;
        }
      `,
    ],
  },
);

export interface ToastOptions {
  tone?: "accent" | "success" | "warning" | "danger";
  /** Milliseconds. 0 keeps it until dismissed. Default 4000. */
  duration?: number;
  closable?: boolean;
  action?: { label: string; onClick: () => void };
}

/** Show a toast. Returns a handle to dismiss it early. */
export function toast(message: string, options: ToastOptions = {}): { dismiss(): void } {
  define("st-toast", Toast);
  define("st-toaster", Toaster);
  let toaster = document.querySelector("st-toaster") as HTMLElement | null;
  if (!toaster) {
    toaster = document.createElement("st-toaster");
    document.body.append(toaster);
  }
  const el = document.createElement("st-toast") as ToastEl & Record<string, unknown>;
  el.textContent = message;
  if (options.tone) el.tone = options.tone;
  if (options.duration !== undefined) el.duration = options.duration;
  if (options.closable) el.closable = true;
  if (options.action) {
    el.actionLabel = options.action.label;
    el.addEventListener("action", options.action.onClick);
  }
  toaster.append(el);
  // Re-open so the toaster sits above any modal dialog opened since.
  if (toaster.matches(":popover-open")) toaster.hidePopover();
  if (!toaster.popover) toaster.popover = "manual";
  toaster.showPopover();
  return { dismiss: () => (el.dismiss ? el.dismiss() : el.remove()) };
}
