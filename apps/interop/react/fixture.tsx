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
    <st-number-field abbr="W" value={120} unit="px" onInput={(e) => e.currentTarget.value} />
    <st-select value="a" kind="outline">
      <st-option value="a">A</st-option>
    </st-select>
  </st-toolbar>
);
// @ts-expect-error: tone must be accent | danger
export const badTone = <st-button tone="blue" />;

export const structure = (
  <st-panel>
    <st-panel-header divided>
      <st-heading>Layers</st-heading>
      <st-badge tone="accent">12</st-badge>
    </st-panel-header>
    <st-section heading="Layout" collapsible onopenchange={(e) => e.detail.open}>
      <st-property-row label="Opacity">
        <st-slider value={50} />
      </st-property-row>
    </st-section>
    <st-menu for="more" onselect={(e) => e.detail.value}>
      <st-menu-item shortcut="Mod+D">Duplicate</st-menu-item>
      <st-menu-item type="checkbox" checked>
        Grid
      </st-menu-item>
    </st-menu>
    <st-dialog heading="Export" width="small" onopenchange={(e) => e.detail.open} />
    <st-progress value={40} />
  </st-panel>
);
// @ts-expect-error: invalid placement
export const badPlacement = <st-menu placement="middle" />;

const menu = document.createElement("st-menu");
menu.show({ x: 10, y: 10 });

export const editors = (
  <st-split autosave="main">
    <st-pane size={240} min={160} collapsible>
      <st-tree
        items={[{ id: "a", label: "Layer", thumbnail: "/a.png", visible: true }]}
        toggles={[{ key: "visible", label: "Visibility", icon: "eye", position: "start" }]}
        reorderable
        onmove={(e) => e.detail.position}
        onitemchange={(e) => e.detail.value}
      />
    </st-pane>
    <st-pane>
      <st-ruler zoom={2} offset={-40} format="time" />
      <st-toolbox value="move" hotkeys columns={2} onChange={(e) => e.currentTarget.value}>
        <st-tool value="move" icon="pointer" label="Move" shortcut="V" />
        <st-tool-group label="Shapes">
          <st-tool value="rect" icon="square" label="Rectangle" shortcut="U" />
        </st-tool-group>
      </st-toolbox>
      <st-knob value={0} min={-50} max={50} bipolar show-value />
      <st-meter value={-12} peak={-3} />
      <st-color-field value="#3366cc" alpha />
      <st-command-palette
        hotkey="Mod+K"
        commands={[{ id: "x", label: "Flatten" }]}
        onselect={(e) => e.detail.id}
      />
    </st-pane>
  </st-split>
);
// @ts-expect-error: format must be number | time
export const badRuler = <st-ruler format="bars" />;
