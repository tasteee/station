import type { Meta, StoryObj } from "@storybook/web-components-vite";

const meta: Meta = { title: "Controls/Inputs" };
export default meta;

export const TextFields: StoryObj = {
  render: () => `
    <st-column gap="2" style="width:240px">
      <st-text-field label="Name" value="Frame 12"></st-text-field>
      <st-text-field label="URL" placeholder="https://" icon="link" clearable></st-text-field>
      <st-text-field label="Outline" kind="outline" value="Outline field"></st-text-field>
      <st-search-field label="Search layers"></st-search-field>
      <st-text-field label="Invalid" invalid value="Bad value"></st-text-field>
      <st-text-field label="Disabled" disabled value="Disabled"></st-text-field>
      <st-textarea label="Notes" rows="3" placeholder="Write a note…"></st-textarea>
    </st-column>`,
};

export const NumberFields: StoryObj = {
  render: () => `
    <st-column gap="3">
      <st-text tone="muted" size="small">Drag the prefix. ↑/↓ steps (Shift ×10, Alt ×0.1). Type math like 12*2.</st-text>
      <div style="display:grid;grid-template-columns:repeat(2,100px);gap:6px 8px">
        <st-number-field label="X" abbr="X" value="24" unit="px"></st-number-field>
        <st-number-field label="Y" abbr="Y" value="16" unit="px"></st-number-field>
        <st-number-field label="Width" abbr="W" value="120" min="0" unit="px"></st-number-field>
        <st-number-field label="Height" abbr="H" value="80" min="0" unit="px"></st-number-field>
        <st-number-field label="Rotation" icon="angle" value="45" unit="°"></st-number-field>
        <st-number-field label="Radius" icon="border-radius" mixed></st-number-field>
      </div>
    </st-column>`,
};

export const Choices: StoryObj = {
  render: () => `
    <st-row gap="8" y-align="start">
      <st-column gap="1">
        <st-checkbox checked>Clip content</st-checkbox>
        <st-checkbox>Show grid</st-checkbox>
        <st-checkbox indeterminate>All layers</st-checkbox>
        <st-checkbox disabled>Disabled</st-checkbox>
      </st-column>
      <st-column gap="1">
        <st-switch checked>Snap to pixels</st-switch>
        <st-switch>Auto layout</st-switch>
      </st-column>
      <st-radio-group label="Format" value="png">
        <st-radio value="png">PNG</st-radio>
        <st-radio value="jpg">JPG</st-radio>
        <st-radio value="svg">SVG</st-radio>
      </st-radio-group>
    </st-row>`,
};

export const Sliders: StoryObj = {
  render: () => `
    <st-column gap="3" style="width:240px">
      <st-slider label="Opacity" value="60"></st-slider>
      <st-range-slider label="Frequency" start="20" end="70"></st-range-slider>
      <st-slider label="Small" value="30" size="small"></st-slider>
    </st-column>`,
};

export const SelectAndCombobox: StoryObj = {
  render: () => `
    <st-row gap="3" y-align="start">
      <st-select label="Blend mode" value="normal">
        <st-option value="normal">Normal</st-option>
        <st-divider></st-divider>
        <st-option value="darken">Darken</st-option>
        <st-option value="multiply">Multiply</st-option>
        <st-option value="burn" disabled>Color burn</st-option>
        <st-divider></st-divider>
        <st-option value="screen">Screen</st-option>
        <st-option value="overlay">Overlay</st-option>
      </st-select>
      <st-combobox label="Font" value="dm-sans" allow-custom>
        <st-option value="dm-sans">DM Sans</st-option>
        <st-option value="dm-mono">DM Mono</st-option>
        <st-option value="inter">Inter</st-option>
        <st-option value="geist">Geist</st-option>
      </st-combobox>
    </st-row>`,
};
