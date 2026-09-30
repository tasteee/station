import { createRovingFocus } from "@station/behaviors";
import { c, css, useEffect, useHost, useInternals, useProp, useRef } from "atomico";
import { fire } from "../shared/events.ts";
import { controlBase, hostReset } from "../shared/styles.ts";

type Segment = HTMLElement & { value?: string; disabled?: boolean; selected?: boolean };

const segmentsOf = (host: HTMLElement) => [...host.querySelectorAll<Segment>(":scope > st-segment")];

/**
 * Pick one of a few options. Arrow keys move and select.
 *
 * <st-segmented-control value="left" label="Text align">
 *   <st-segment value="left" icon="align-left" label="Left"></st-segment>
 *   <st-segment value="center" icon="align-center" label="Center"></st-segment>
 * </st-segmented-control>
 */
export const SegmentedControl = c(
  ({ name, label, disabled }) => {
    const host = useHost();
    const internals = useInternals();
    const [value, setValue] = useProp<string>("value");
    const roving = useRef<ReturnType<typeof createRovingFocus>>();

    const select = (segment: Segment, emit: boolean) => {
      // Read the live value: roving focus holds this callback across renders.
      if (segment.disabled || segment.value === (host.current as Segment).value) return;
      setValue(segment.value);
      if (emit) {
        fire(host.current, "input");
        fire(host.current, "change");
      }
    };

    useEffect(() => {
      internals.role = "radiogroup";
      internals.ariaLabel = label ?? null;
      internals.ariaDisabled = disabled ? "true" : null;
    }, [label, disabled]);

    useEffect(() => {
      internals.setFormValue(value ?? null);
      const el = host.current as HTMLElement;
      for (const s of segmentsOf(el)) s.selected = s.value === value;
      const current = segmentsOf(el).find((s) => s.value === value);
      if (current && roving.current && roving.current.active !== current)
        roving.current.activate(current, false);
    }, [value, name]);

    useEffect(() => {
      const el = host.current as HTMLElement;
      roving.current = createRovingFocus(el, {
        items: () => segmentsOf(el).filter((s) => !s.disabled),
        onActivate: (item) => select(item as Segment, true),
      });
      return () => roving.current?.destroy();
    }, []);

    const onclick = (event: Event) => {
      const segment = event.composedPath().find((n) => (n as Element).localName === "st-segment") as
        | Segment
        | undefined;
      if (segment && !disabled) select(segment, true);
    };

    return (
      <host shadowDom onclick={onclick}>
        <slot
          onslotchange={() => {
            const el = host.current as HTMLElement;
            for (const s of segmentsOf(el)) s.selected = s.value === value;
            roving.current?.update();
          }}
        />
      </host>
    );
  },
  {
    form: true,
    props: {
      value: { type: String, reflect: true },
      name: { type: String, reflect: true },
      label: { type: String, reflect: true },
      size: { type: String, reflect: true },
      disabled: { type: Boolean, reflect: true },
      block: { type: Boolean, reflect: true },
    },
    styles: [
      hostReset,
      controlBase,
      css`
        :host {
          display: inline-flex;
          align-items: center;
          gap: 1px;
          height: var(--_height);
          padding: 2px;
          border-radius: var(--st-radius-2);
          background: var(--st-gray-a3);
          --_segment-height: calc(var(--_height) - 4px);
        }
        :host(:focus-visible) {
          outline: none;
        }
        :host([block]) {
          display: flex;
          width: 100%;
        }
        :host([block]) ::slotted(st-segment) {
          flex: 1 1 0;
        }
      `,
    ],
  },
);
