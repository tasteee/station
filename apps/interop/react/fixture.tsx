import type {} from "@station/components/react";

export const ok = (
  <st-row x-align="between" y-align="center" gap="2" className="bar" onClick={() => {}}>
    <st-heading size="small">Layers</st-heading>
    <st-icon name="plus" label="Add" />
    <st-kbd shortcut="Mod+K" kind="boxed" />
    <st-text tone="muted" truncate grow>
      Label
    </st-text>
  </st-row>
);

// @ts-expect-error: "sideways" is not a valid x-align
export const badAlign = <st-row x-align="sideways" />;
// @ts-expect-error: gap must be a spacing step
export const badGap = <st-column gap="7" />;
// @ts-expect-error: unknown kind
export const badKind = <st-kbd kind="fancy" />;

const el = document.createElement("st-kbd");
el.shortcut = "Mod+S";
