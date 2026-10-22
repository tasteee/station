import { c, css, useEffect, useHost } from "atomico";
import { fire } from "../shared/events.ts";
import { hostReset } from "../shared/styles.ts";

/**
 * A frame on an st-viewport canvas: a fixed-size page in document coordinates
 * with its name above it. The name stays the same screen size at any zoom;
 * clicking it fires `select` ({ ids: [id], add }).
 *
 * <st-viewport>
 *   <st-artboard id="desktop" x="0" y="0" width="1440" height="900" label="Desktop"></st-artboard>
 * </st-viewport>
 */
export const Artboard = c(
  ({ x, y, width, height, label, selected }) => {
    const host = useHost();
    // Inline geometry, set directly so an author's own style attribute survives.
    useEffect(() => {
      const st = host.current.style;
      st.left = `${x ?? 0}px`;
      st.top = `${y ?? 0}px`;
      st.width = `${width ?? 0}px`;
      st.height = `${height ?? 0}px`;
    }, [x, y, width, height]);
    return (
      <host shadowDom role="region" aria-label={label ? `Artboard: ${label}` : "Artboard"}>
        {label && (
          <button
            type="button"
            class="name"
            part="name"
            tabindex="-1"
            aria-pressed={selected ? "true" : "false"}
            onclick={(e: MouseEvent) =>
              fire(host.current, "select", { ids: [host.current.id || label], add: e.shiftKey })
            }
          >
            {label}
          </button>
        )}
        <div class="body" part="body">
          <slot />
        </div>
      </host>
    );
  },
  {
    props: {
      x: { type: Number, reflect: true, value: () => 0 },
      y: { type: Number, reflect: true, value: () => 0 },
      width: { type: Number, reflect: true, value: () => 0 },
      height: { type: Number, reflect: true, value: () => 0 },
      label: { type: String, reflect: true },
      clip: { type: Boolean, reflect: true },
      selected: { type: Boolean, reflect: true },
    },
    styles: [
      hostReset,
      css`
        :host {
          --_zoom: var(--st-view-zoom, 1);
          position: absolute;
          display: block;
        }
        .body {
          position: absolute;
          inset: 0;
          background: var(--st-artboard-fill, light-dark(oklch(100% 0 0), var(--st-gray-3)));
          box-shadow: 0 0 0 calc(1px / var(--_zoom)) light-dark(oklch(0% 0 0 / 0.06), oklch(100% 0 0 / 0.06));
        }
        :host([clip]) .body {
          overflow: hidden;
        }
        :host([selected]) .body {
          outline: calc(1.5px / var(--_zoom)) solid var(--st-canvas-mark, var(--st-signal));
        }
        /* Constant screen size: undo the world's scale. */
        .name {
          all: unset;
          position: absolute;
          left: 0;
          bottom: 100%;
          max-width: 100%;
          padding-bottom: calc(5px / var(--_zoom));
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-family: var(--st-font-sans);
          font-size: calc(11px / var(--_zoom));
          line-height: 1.2;
          color: var(--st-text-muted);
          cursor: default;
        }
        .name:hover,
        :host([selected]) .name {
          color: var(--st-text-strong);
        }
      `,
    ],
  },
);
