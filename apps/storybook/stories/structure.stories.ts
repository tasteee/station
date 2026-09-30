import type { Meta, StoryObj } from "@storybook/web-components-vite";

const meta: Meta = { title: "Structure/Panels" };
export default meta;

export const Inspector: StoryObj = {
  render: () => `
    <st-panel style="width:264px;height:560px;border:1px solid var(--st-border-subtle)">
      <st-tabs value="design" divided grow>
        <st-tab value="design">Design</st-tab>
        <st-tab value="prototype">Prototype</st-tab>
        <st-tab-panel value="design">
          <st-scroll-area grow axis="y">
            <st-section heading="Appearance" divided>
              <st-property-row label="Opacity"><st-slider value="80"></st-slider><st-number-field value="80" unit="%" style="width:64px" shrink="none"></st-number-field></st-property-row>
              <st-property-row label="Blend"><st-select value="normal"><st-option value="normal">Normal</st-option><st-option value="multiply">Multiply</st-option></st-select></st-property-row>
            </st-section>
            <st-section heading="Effects" collapsible divided>
              <st-badge slot="heading">1</st-badge>
              <st-icon-button slot="actions" icon="plus" label="Add effect"></st-icon-button>
              <st-property-row label="Drop shadow"><st-switch checked></st-switch></st-property-row>
            </st-section>
          </st-scroll-area>
        </st-tab-panel>
        <st-tab-panel value="prototype">
          <st-empty-state grow><st-icon name="player-play"></st-icon><st-heading>No interactions</st-heading><st-text size="small">Connect frames to add one.</st-text></st-empty-state>
        </st-tab-panel>
      </st-tabs>
    </st-panel>`,
};

export const Badges: StoryObj = {
  render: () => `
    <st-column gap="3">
      <st-row gap="2"><st-badge>12</st-badge><st-badge tone="accent">New</st-badge><st-badge tone="danger">3</st-badge><st-badge tone="warning">Draft</st-badge><st-badge tone="success">Live</st-badge></st-row>
      <st-row gap="2"><st-badge kind="solid">12</st-badge><st-badge kind="solid" tone="accent">New</st-badge><st-badge kind="solid" tone="danger">3</st-badge></st-row>
      <st-row gap="3"><st-badge dot></st-badge><st-badge dot tone="success"></st-badge><st-badge dot tone="warning"></st-badge><st-badge dot tone="danger"></st-badge></st-row>
      <st-progress value="40" style="width:200px"></st-progress>
      <st-progress style="width:200px"></st-progress>
      <st-spinner></st-spinner>
    </st-column>`,
};
