import { c, useEffect, useHost, useProp, useRef, useState } from "atomico";
import { fireOpenChange } from "../shared/events.ts";
import { Close } from "../shared/glyphs.tsx";
import { hostReset } from "../shared/styles.ts";
import { dialogStyles, focusInitial } from "./dialog-styles.ts";

type DialogEl = HTMLElement & { open?: boolean; show(): void; close(): void };

/**
 * Modal dialog (native <dialog>: focus trap, inert page, top layer).
 * Escape and backdrop clicks close it unless `persistent`.
 *
 * <st-dialog heading="Export" open>
 *   …
 *   <st-button slot="footer" kind="ghost">Cancel</st-button>
 *   <st-button slot="footer" kind="solid" tone="accent">Export</st-button>
 * </st-dialog>
 */
export const Dialog = c(
  ({ heading, persistent }) => {
    const host = useHost<DialogEl>();
    const [open, setOpen] = useProp<boolean>("open");
    const [hasFooter, setHasFooter] = useState(false);
    const dialog = useRef<HTMLDialogElement>();
    const closeButton = useRef<HTMLButtonElement>();

    useEffect(() => {
      const d = dialog.current!;
      if (open && !d.open) {
        d.showModal();
        focusInitial(host.current, closeButton.current ?? null);
      } else if (!open && d.open) d.close();
    }, [open]);

    const sync = () => {
      if (open) {
        setOpen(false);
        fireOpenChange(host.current, false);
      }
    };

    return (
      <host shadowDom>
        <dialog
          ref={dialog}
          part="dialog"
          aria-labelledby="heading"
          onclose={sync}
          oncancel={(e: Event) => persistent && e.preventDefault()}
          onclick={(e: MouseEvent) => {
            // A click on the <dialog> itself (not its content) is the backdrop.
            if (e.target !== dialog.current || persistent) return;
            const r = dialog.current!.getBoundingClientRect();
            const inside =
              e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
            if (!inside) dialog.current!.close();
          }}
        >
          <header part="header">
            <h2 id="heading">
              {heading}
              <slot name="heading" />
            </h2>
            <slot name="header-actions" />
            <button
              ref={closeButton}
              type="button"
              class="close"
              aria-label="Close"
              onclick={() => dialog.current!.close()}
            >
              <Close />
            </button>
          </header>
          <div class="body" part="body">
            <slot />
          </div>
          <footer part="footer" class={hasFooter ? "" : "empty"}>
            <slot
              name="footer"
              onslotchange={(e: Event) =>
                setHasFooter((e.target as HTMLSlotElement).assignedElements().length > 0)
              }
            />
          </footer>
        </dialog>
      </host>
    );
  },
  {
    props: {
      open: { type: Boolean, reflect: true },
      heading: { type: String, reflect: true },
      width: { type: String, reflect: true },
      persistent: { type: Boolean, reflect: true },
    },
    styles: [hostReset, dialogStyles],
  },
);

Object.assign(Dialog.prototype, {
  show(this: DialogEl) {
    this.open = true;
  },
  close(this: DialogEl) {
    this.open = false;
  },
});
