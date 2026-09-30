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

export const controls = (
  <st-toolbar label="Tools" size="small">
    <st-icon-button icon="plus" label="Add" shortcut="Mod+N" />
    <st-toggle-button icon="bold" label="Bold" pressed onChange={(e) => e.currentTarget.pressed} />
    <st-number-field prefix="W" value={120} unit="px" onInput={(e) => e.currentTarget.value} />
    <st-select value="a" kind="outline">
      <st-option value="a">A</st-option>
    </st-select>
  </st-toolbar>
);
// @ts-expect-error: tone must be accent | danger
export const badTone = <st-button tone="blue" />;
