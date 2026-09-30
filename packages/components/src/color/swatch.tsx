import { createRovingFocus, formatHex, parseColor } from "@station/behaviors";
import { c, css, useEffect, useHost, useInternals, useProp, useRef } from "atomico";
import { fire } from "../shared/events.ts";
import { hostReset } from "../shared/styles.ts";

/** Checkerboard behind translucent colors. */
export const checker = css`
  .checker {
    background:
      linear-gradient(var(--_color), var(--_color)),
      repeating-conic-gradient(#ccc 0 25%, #fff 0 50%) 0 0 / 8px 8px;
  }
`;

/**
 * A color chip. Shows alpha over a checkerboard. Inside st-swatches it is a selectable option.
 * <st-color-swatch color="#ff8800" label="Orange"></st-color-swatch>
 */
export const ColorSwatch = c(
  ({ color, label, selected }) => {
    const host = useHost();
    const internals = useInternals();
    const inGroup = (host.current as HTMLElement).parentElement?.localName === "st-swatches";
    // A custom property, not the style attribute, so user styles survive.
    useEffect(
      () => (host.current as HTMLElement).style.setProperty("--_color", color ?? "transparent"),
      [color],
    );
    useEffect(() => {
      internals.role = inGroup ? "option" : "img";
      internals.ariaLabel = label ?? color ?? null;
      internals.ariaSelected = inGroup ? (selected ? "true" : "false") : null;
    }, [label, color, selected, inGroup]);
    return (
      <host shadowDom>
        <span class="chip checker" part="chip" />
      </host>
    );
  },
  {
    props: {
      color: { type: String, reflect: true },
      label: { type: String, reflect: true },
      selected: { type: Boolean, reflect: true },
    },
    styles: [
      hostReset,
      checker,
      css`
        :host {
          display: inline-block;
          flex: none;
          width: var(--st-swatch-size, var(--st-icon-size, 16px));
          height: var(--st-swatch-size, var(--st-icon-size, 16px));
          border-radius: var(--st-radius-1);
          outline: none;
        }
        .chip {
          display: block;
          width: 100%;
          height: 100%;
          border-radius: inherit;
          box-shadow: inset 0 0 0 1px var(--st-gray-a5);
        }
        :host([selected]) {
          box-shadow:
            0 0 0 1px var(--st-bg-panel),
            0 0 0 2.5px var(--st-border-focus);
        }
        :host(:focus-visible) {
          outline: var(--st-focus-ring-width) solid var(--st-border-focus);
          outline-offset: 2px;
        }
      `,
    ],
  },
);

type SwatchEl = HTMLElement & { color?: string; selected?: boolean };
const swatchesOf = (host: HTMLElement) =>
  [...host.children].filter((c) => c.localName === "st-color-swatch") as SwatchEl[];
const same = (a?: string, b?: string) => {
  const x = a ? parseColor(a) : null;
  const y = b ? parseColor(b) : null;
  return !!x && !!y && formatHex(x) === formatHex(y);
};

/**
 * A palette of swatches (Photoshop's Swatches panel). Arrow keys move and select.
 * <st-swatches value="#ff0000" label="Swatches">
 *   <st-color-swatch color="#ff0000" label="Red"></st-color-swatch>…
 * </st-swatches>
 */
export const Swatches = c(
  ({ label }) => {
    const host = useHost();
    const internals = useInternals();
    const [value, setValue] = useProp<string>("value");
    const roving = useRef<ReturnType<typeof createRovingFocus>>();

    const pick = (s: SwatchEl) => {
      if (same(s.color, (host.current as SwatchEl & { value?: string }).value)) return;
      setValue(s.color);
      fire(host.current, "input");
      fire(host.current, "change");
    };

    useEffect(() => {
      internals.role = "listbox";
      internals.ariaLabel = label ?? null;
    }, [label]);

    useEffect(() => {
      for (const s of swatchesOf(host.current)) s.selected = same(s.color, value);
      const current = swatchesOf(host.current).find((s) => s.selected);
      if (current && roving.current && roving.current.active !== current)
        roving.current.activate(current, false);
    }, [value]);

    useEffect(() => {
      roving.current = createRovingFocus(host.current, {
        orientation: "both",
        items: () => swatchesOf(host.current),
        onActivate: (s) => pick(s as SwatchEl),
      });
      return () => roving.current?.destroy();
    }, []);

    return (
      <host
        shadowDom
        onclick={(e: Event) => {
          const s = e.composedPath().find((n) => (n as Element).localName === "st-color-swatch") as
            | SwatchEl
            | undefined;
          if (s) pick(s);
        }}
      >
        <slot
          onslotchange={() => {
            for (const s of swatchesOf(host.current))
              s.selected = same(s.color, (host.current as SwatchEl & { value?: string }).value);
            roving.current?.update();
          }}
        />
      </host>
    );
  },
  {
    props: {
      value: { type: String, reflect: true },
      label: { type: String, reflect: true },
    },
    styles: [
      hostReset,
      css`
        :host {
          display: grid;
          grid-template-columns: repeat(auto-fill, var(--st-swatch-size, 16px));
          gap: var(--st-space-1);
          --st-swatch-size: 16px;
        }
      `,
    ],
  },
);
