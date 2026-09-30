import { autoPosition, createRovingFocus, matchesShortcut, parseShortcut } from "@station/behaviors";
import { c, css, useEffect, useHost, useInternals, useProp, useRef, useState } from "atomico";
import { usePressable } from "../button/button-base.ts";
import { buttonStyles } from "../button/button-styles.ts";
import { fire } from "../shared/events.ts";
import { controlBase, hostReset } from "../shared/styles.ts";
import { attachTooltip } from "../shared/tooltip.tsx";

type ToolEl = HTMLElement & {
  value?: string;
  icon?: string;
  label?: string;
  shortcut?: string;
  disabled?: boolean;
  selected?: boolean;
};
type GroupEl = HTMLElement & { current?: string; selected?: boolean; update?: () => void };
type ToolboxEl = HTMLElement & { value?: string; hotkeys?: boolean };

const toolsIn = (group: Element) => [...group.children].filter((c) => c.localName === "st-tool") as ToolEl[];
/** Everything the user can press: loose tools and tool groups. */
const buttonsOf = (box: HTMLElement) =>
  [...box.children].filter(
    (c) => c.localName === "st-tool" || c.localName === "st-tool-group",
  ) as HTMLElement[];
const allTools = (box: HTMLElement) => [...box.querySelectorAll<ToolEl>("st-tool")];

/** Mark the selected tool and group; groups show their current tool's icon. */
function syncToolbox(box: ToolboxEl) {
  const value = box.value;
  for (const el of buttonsOf(box)) {
    if (el.localName === "st-tool") (el as ToolEl).selected = (el as ToolEl).value === value;
    else {
      const group = el as GroupEl;
      const tools = toolsIn(group);
      const hit = tools.find((t) => t.value === value);
      if (hit) group.current = hit.value;
      else if (!tools.some((t) => t.value === group.current)) group.current = tools[0]?.value;
      group.selected = !!hit;
      group.update?.();
    }
  }
}

function choose(box: ToolboxEl, value: string | undefined) {
  if (!value || value === box.value) return;
  box.value = value;
  syncToolbox(box);
  fire(box, "change", { value });
}

const isTyping = (e: KeyboardEvent) =>
  e.composedPath().some((n) => {
    const el = n as HTMLElement;
    return (
      el.isContentEditable ||
      el.localName === "input" ||
      el.localName === "textarea" ||
      el.localName === "select"
    );
  });

/**
 * Vertical (or horizontal) tool palette in the Photoshop / Illustrator style.
 * One tool is active (`value`). `hotkeys` makes each tool's single-key shortcut
 * select it; pressing it again (or Shift+key) cycles through its group.
 *
 * <st-toolbox value="move" hotkeys label="Tools">
 *   <st-tool value="move" icon="pointer" label="Move" shortcut="V"></st-tool>
 *   <st-tool-group label="Shapes">
 *     <st-tool value="rect" icon="square" label="Rectangle" shortcut="U"></st-tool>
 *     <st-tool value="ellipse" icon="circle" label="Ellipse" shortcut="U"></st-tool>
 *   </st-tool-group>
 * </st-toolbox>
 */
export const Toolbox = c(
  ({ label, orientation, hotkeys, columns }) => {
    const host = useHost<ToolboxEl>();
    const internals = useInternals();
    const [value] = useProp<string>("value");
    const roving = useRef<ReturnType<typeof createRovingFocus>>();

    useEffect(() => {
      internals.role = "toolbar";
      internals.ariaLabel = label ?? null;
      internals.ariaOrientation = orientation === "horizontal" ? "horizontal" : "vertical";
    }, [label, orientation]);

    useEffect(() => {
      roving.current = createRovingFocus(host.current, {
        orientation: "both",
        items: () => buttonsOf(host.current).filter((b) => !b.hasAttribute("disabled")),
      });
      const onPick = (e: Event) => {
        e.stopPropagation();
        choose(host.current, (e as CustomEvent).detail.value);
      };
      host.current.addEventListener("toolpick", onPick);
      return () => {
        roving.current?.destroy();
        host.current.removeEventListener("toolpick", onPick);
      };
    }, []);

    useEffect(() => syncToolbox(host.current), [value]);
    useEffect(() => host.current.style.setProperty("--_cols", String(columns ?? 1)), [columns]);

    useEffect(() => {
      if (!hotkeys) return;
      const onKey = (e: KeyboardEvent) => {
        if (e.defaultPrevented || isTyping(e) || e.metaKey || e.ctrlKey || e.altKey) return;
        const box = host.current;
        const matches = allTools(box).filter((t) => {
          if (!t.shortcut || t.disabled) return false;
          const { modifiers, key } = parseShortcut(t.shortcut);
          return modifiers.length === 0
            ? e.key.toLowerCase() === key.toLowerCase()
            : matchesShortcut(e, t.shortcut);
        });
        if (!matches.length) return;
        e.preventDefault();
        const currentIndex = matches.findIndex((t) => t.value === box.value);
        // Same key again (or Shift+key) cycles through tools that share it.
        const next =
          currentIndex >= 0 && (e.shiftKey || matches.length > 1)
            ? matches[(currentIndex + 1) % matches.length]!
            : matches[0]!;
        choose(box, next.value);
      };
      document.addEventListener("keydown", onKey);
      return () => document.removeEventListener("keydown", onKey);
    }, [hotkeys]);

    return (
      <host shadowDom>
        <slot
          onslotchange={() => {
            syncToolbox(host.current);
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
      orientation: { type: String, reflect: true, value: (): "vertical" | "horizontal" => "vertical" },
      columns: { type: Number, reflect: true },
      hotkeys: { type: Boolean, reflect: true },
      tone: { type: String, reflect: true },
      size: { type: String, reflect: true },
    },
    styles: [
      hostReset,
      css`
        :host {
          display: grid;
          grid-template-columns: repeat(var(--_cols, 1), auto);
          grid-auto-rows: auto;
          gap: 2px;
          align-content: start;
          justify-content: center;
          width: max-content;
          padding: var(--st-space-1);
        }
        :host([orientation="horizontal"]) {
          grid-auto-flow: column;
          grid-template-columns: none;
        }
        ::slotted(st-divider) {
          grid-column: 1 / -1;
          margin: var(--st-space-1) 2px;
          width: auto !important;
          height: 1px !important;
        }
      `,
    ],
  },
);

/** Pressed style for tools; `tone="accent"` on the toolbox inverts it. */
const toolStyles = css`
  :host {
    width: var(--_height);
    padding: 0;
  }
  :host([selected]) {
    --_bg: var(--st-bg-pressed);
    --_fg: var(--st-text-strong);
    --_hover-bg: var(--st-bg-pressed);
  }
  :host([selected][data-tone="accent"]) {
    --_bg: var(--st-accent-solid);
    --_fg: var(--st-text-on-accent);
    --_hover-bg: var(--st-accent-solid-hover);
    --_hover-fg: var(--st-text-on-accent);
  }
`;

/**
 * A tool. Inside st-toolbox it is a button; inside st-tool-group it is one of the
 * group's alternates (shown in the flyout).
 */
export const Tool = c(
  ({ icon, label, shortcut, disabled, selected }) => {
    const host = useHost<ToolEl>();
    const inGroup = (host.current.parentElement?.localName ?? "") === "st-tool-group";
    const { internals, ...handlers } = usePressable({
      disabled,
      onPress: () => fire(host.current, "toolpick", { value: host.current.value }),
    });

    useEffect(() => {
      internals.role = inGroup ? null : "button";
      internals.ariaLabel = label ?? null;
      internals.ariaPressed = inGroup ? null : selected ? "true" : "false";
      internals.ariaKeyShortcuts = shortcut ?? null;
      if (inGroup) host.current.removeAttribute("tabindex");
    }, [label, selected, shortcut, inGroup]);

    useEffect(() => {
      if (inGroup) return;
      return attachTooltip(host.current, () => ({
        label: host.current.label,
        shortcut: host.current.shortcut,
        placement: "right",
      }));
    }, [inGroup]);

    const tone = host.current.closest("st-toolbox")?.getAttribute("tone");
    return (
      <host
        shadowDom
        data-kind="ghost"
        data-icon-only
        data-tone={tone}
        hidden={inGroup}
        {...(inGroup ? {} : handlers)}
      >
        {icon && <st-icon name={icon} />}
      </host>
    );
  },
  {
    props: {
      value: { type: String, reflect: true },
      icon: { type: String, reflect: true },
      label: { type: String, reflect: true },
      shortcut: { type: String, reflect: true },
      selected: { type: Boolean, reflect: true },
      disabled: { type: Boolean, reflect: true },
    },
    styles: [hostReset, controlBase, buttonStyles, toolStyles],
  },
);

const LONG_PRESS = 350;

/**
 * Several related tools behind one button (Photoshop's shape / lasso groups).
 * Click selects the group's current tool. Long-press, right-click or Alt+click
 * opens the flyout; ↓/→ open it from the keyboard.
 */
export const ToolGroup = c(
  ({ label, current, selected }) => {
    const host = useHost<GroupEl & { label?: string }>();
    const internals = useInternals();
    const [open, setOpen] = useState(false);
    const flyout = useRef<HTMLElement>();
    const timer = useRef<ReturnType<typeof setTimeout>>();
    const longPressed = useRef(false);
    const flyoutRoving = useRef<ReturnType<typeof createRovingFocus>>();

    const tools = toolsIn(host.current);
    const tool = tools.find((t) => t.value === current) ?? tools[0];

    const pick = (value: string | undefined) => fire(host.current, "toolpick", { value });
    const { internals: _i, ...handlers } = usePressable({
      onPress: (e) => {
        if (longPressed.current) {
          longPressed.current = false;
          return;
        }
        if ((e as MouseEvent).altKey) return showFlyout(false);
        pick(tool?.value);
      },
    });
    void _i;

    const showFlyout = (focus: boolean) => {
      const f = flyout.current!;
      if (!f.matches(":popover-open")) f.showPopover();
      if (focus)
        requestAnimationFrame(() => {
          const items = [...f.querySelectorAll<HTMLElement>("button")];
          (items.find((b) => b.dataset.value === tool?.value) ?? items[0])?.focus();
        });
    };

    useEffect(() => {
      internals.role = "button";
      internals.ariaHasPopup = "menu";
      internals.ariaPressed = selected ? "true" : "false";
      internals.ariaLabel = [tool?.label, label].filter(Boolean).join(" · ") || null;
      internals.ariaExpanded = open ? "true" : "false";
    }, [selected, tool?.label, label, open]);

    useEffect(
      () =>
        attachTooltip(host.current, () => ({
          label:
            host.current.querySelector<ToolEl>(`st-tool[value="${host.current.current}"]`)?.label ?? label,
          shortcut: host.current.querySelector<ToolEl>(`st-tool[value="${host.current.current}"]`)?.shortcut,
          placement: "right",
        })),
      [],
    );

    useEffect(() => {
      if (!open) return;
      flyoutRoving.current = createRovingFocus(flyout.current!, {
        orientation: "vertical",
        items: () => [...flyout.current!.querySelectorAll<HTMLElement>("button")],
      });
      const stop = autoPosition(host.current, flyout.current!, { placement: "right-start", offset: 6 });
      return () => {
        stop();
        flyoutRoving.current?.destroy();
      };
    }, [open]);

    const tone = host.current.closest("st-toolbox")?.getAttribute("tone");

    return (
      <host
        shadowDom
        data-kind="ghost"
        data-icon-only
        data-tone={tone}
        {...handlers}
        onpointerdown={(e: PointerEvent) => {
          if (e.button !== 0) return;
          longPressed.current = false;
          clearTimeout(timer.current);
          timer.current = setTimeout(() => {
            longPressed.current = true;
            showFlyout(false);
          }, LONG_PRESS);
        }}
        onpointerup={() => clearTimeout(timer.current)}
        onpointerleave={() => clearTimeout(timer.current)}
        oncontextmenu={(e: MouseEvent) => {
          e.preventDefault();
          // Linux/macOS fire contextmenu with the button still down; opening now would be
          // light-dismissed on pointerup, so wait for it.
          if (e.buttons)
            window.addEventListener("pointerup", () => setTimeout(() => showFlyout(false)), {
              once: true,
              capture: true,
            });
          else showFlyout(false);
        }}
        onkeydown={(e: KeyboardEvent) => {
          if (e.target === host.current && (e.key === "ArrowRight" || (e.key === "ArrowDown" && e.altKey))) {
            e.preventDefault();
            e.stopPropagation();
            showFlyout(true);
          } else handlers.onkeydown(e);
        }}
      >
        {tool?.icon && <st-icon name={tool.icon} />}
        <svg class="corner" viewBox="0 0 4 4" aria-hidden="true">
          <path d="M4 0V4H0Z" fill="currentColor" />
        </svg>
        <slot hidden />
        <div
          ref={flyout}
          class="flyout"
          popover="auto"
          role="menu"
          aria-label={label}
          ontoggle={(e: ToggleEvent) => setOpen(e.newState === "open")}
          onkeydown={(e: KeyboardEvent) => {
            e.stopPropagation();
            if (e.key === "ArrowLeft" || e.key === "Escape") {
              e.preventDefault();
              flyout.current!.hidePopover();
              host.current.focus();
            }
          }}
        >
          {tools.map((t) => (
            <button
              type="button"
              role="menuitemradio"
              aria-checked={t.value === tool?.value ? "true" : "false"}
              data-value={t.value}
              disabled={t.disabled}
              onclick={(e: MouseEvent) => {
                e.stopPropagation();
                flyout.current!.hidePopover();
                pick(t.value);
                host.current.focus();
              }}
            >
              <span class="check">{t.value === tool?.value ? "•" : ""}</span>
              {t.icon && <st-icon name={t.icon} />}
              <span class="label">{t.label}</span>
              {t.shortcut && <st-kbd shortcut={t.shortcut} />}
            </button>
          ))}
        </div>
      </host>
    );
  },
  {
    props: {
      label: { type: String, reflect: true },
      current: { type: String, reflect: true },
      selected: { type: Boolean, reflect: true },
    },
    styles: [
      hostReset,
      controlBase,
      buttonStyles,
      toolStyles,
      css`
        .corner {
          position: absolute;
          right: 2px;
          bottom: 2px;
          width: 4px;
          height: 4px;
          color: var(--st-text-faint);
        }
        :host([selected]) .corner {
          color: currentColor;
          opacity: 0.6;
        }
        .flyout {
          min-width: 200px;
          padding: var(--st-space-1);
          margin: 0;
          inset: auto;
          box-sizing: border-box;
          border: 0;
          border-radius: var(--st-radius-3);
          background: var(--st-bg-panel);
          color: var(--st-text);
          box-shadow: var(--st-shadow-popover);
        }
        .flyout:popover-open {
          display: flex;
          flex-direction: column;
          gap: 1px;
        }
        .flyout button {
          all: unset;
          display: flex;
          align-items: center;
          gap: var(--st-space-1-5);
          height: var(--st-control-height);
          padding-inline: var(--st-space-1) var(--st-space-2);
          border-radius: var(--st-radius-1);
          color: var(--st-text-strong);
          font-weight: var(--st-weight-normal);
          --st-icon-size: 14px;
        }
        .flyout button:hover,
        .flyout button:focus {
          background: var(--st-bg-selected-strong);
          color: var(--st-text-on-accent);
          --st-text-muted: var(--st-text-on-accent);
        }
        .flyout button[disabled] {
          opacity: 0.45;
        }
        .check {
          width: 10px;
          text-align: center;
        }
        .label {
          flex: 1;
        }
      `,
    ],
  },
);
