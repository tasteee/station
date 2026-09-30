import { c, css, useEffect, useHost, useProp, useRef } from "atomico";
import { fire, fireOpenChange } from "../shared/events.ts";
import { hostReset } from "../shared/styles.ts";
import "../define/button.ts";
import { dialogStyles } from "./dialog-styles.ts";

type AlertEl = HTMLElement & { open?: boolean };

/**
 * Asks for confirmation. Never closes on backdrop click.
 * Fires `confirm` or `cancel`. Focus starts on Cancel (the safe choice).
 *
 * <st-alert-dialog heading="Delete 3 layers?" confirm-label="Delete" tone="danger" open>
 *   This can't be undone.
 * </st-alert-dialog>
 */
export const AlertDialog = c(
  ({ heading, confirmLabel, cancelLabel, tone }) => {
    const host = useHost<AlertEl>();
    const [open, setOpen] = useProp<boolean>("open");
    const dialog = useRef<HTMLDialogElement>();
    const cancelButton = useRef<HTMLElement>();
    const result = useRef<"confirm" | "cancel">("cancel");

    useEffect(() => {
      const d = dialog.current!;
      if (open && !d.open) {
        result.current = "cancel";
        d.showModal();
        requestAnimationFrame(() => cancelButton.current?.focus());
      } else if (!open && d.open) d.close();
    }, [open]);

    const finish = (choice: "confirm" | "cancel") => {
      result.current = choice;
      dialog.current!.close();
    };

    return (
      <host shadowDom>
        <dialog
          ref={dialog}
          part="dialog"
          role="alertdialog"
          aria-labelledby="heading"
          aria-describedby="body"
          onclose={() => {
            setOpen(false);
            fire(host.current, result.current);
            fireOpenChange(host.current, false);
          }}
        >
          <header part="header">
            <h2 id="heading">
              {heading}
              <slot name="heading" />
            </h2>
          </header>
          <div class="body" id="body" part="body">
            <slot />
          </div>
          <footer part="footer">
            <st-button ref={cancelButton} kind="ghost" onclick={() => finish("cancel")}>
              {cancelLabel ?? "Cancel"}
            </st-button>
            <st-button
              kind="solid"
              tone={tone === "danger" ? "danger" : "accent"}
              onclick={() => finish("confirm")}
            >
              {confirmLabel ?? "Confirm"}
            </st-button>
          </footer>
        </dialog>
      </host>
    );
  },
  {
    props: {
      open: { type: Boolean, reflect: true },
      heading: { type: String, reflect: true },
      confirmLabel: { type: String, reflect: true },
      cancelLabel: { type: String, reflect: true },
      tone: { type: String, reflect: true },
    },
    styles: [
      hostReset,
      dialogStyles,
      css`
        dialog {
          width: 360px;
        }
        header {
          padding: var(--st-space-4) var(--st-space-4) var(--st-space-1);
          min-height: 0;
        }
        .body {
          color: var(--st-text);
        }
        footer {
          border-top: 0;
          padding-top: var(--st-space-1);
        }
      `,
    ],
  },
);

export interface ConfirmOptions {
  heading: string;
  body?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger";
}

/**
 * Promise-based confirmation.
 *   if (await confirm({ heading: "Delete 3 layers?", confirmLabel: "Delete", tone: "danger" })) …
 */
export function confirm(options: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    const el = document.createElement("st-alert-dialog") as AlertEl & Record<string, unknown>;
    el.heading = options.heading;
    if (options.confirmLabel) el.confirmLabel = options.confirmLabel;
    if (options.cancelLabel) el.cancelLabel = options.cancelLabel;
    if (options.tone) el.tone = options.tone;
    if (options.body) el.textContent = options.body;
    const done = (value: boolean) => () => {
      el.remove();
      resolve(value);
    };
    el.addEventListener("confirm", done(true), { once: true });
    el.addEventListener("cancel", done(false), { once: true });
    document.body.append(el);
    el.open = true;
  });
}
