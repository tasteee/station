import type { Meta, StoryObj } from "@storybook/web-components-vite";

const meta: Meta = { title: "Foundations/Tokens" };
export default meta;

const scale = (name: string) =>
  `<div style="display:grid;grid-template-columns:repeat(12,1fr);gap:2px">${Array.from(
    { length: 12 },
    (_, i) =>
      `<div style="height:36px;border-radius:var(--st-radius-1);background:var(--st-${name}${name.endsWith("-a") ? "" : "-"}${i + 1});display:flex;align-items:end;padding:3px 4px;font-size:10px;color:${i < 8 ? "var(--st-gray-12)" : "var(--st-gray-1)"}">${i + 1}</div>`,
  ).join("")}</div>`;

export const Scales: StoryObj = {
  render: () => `
    <st-column gap="4" style="max-width:720px">
      ${["gray", "gray-a", "accent", "danger", "warning", "success"]
        .map(
          (n) =>
            `<st-column gap="1.5"><st-heading size="small" tone="muted">${n.toUpperCase()}</st-heading>${scale(n)}</st-column>`,
        )
        .join("")}
    </st-column>`,
};

export const TextLadder: StoryObj = {
  render: () => `
    <st-column gap="1.5">
      <st-text tone="strong" weight="medium">Strong — titles, selected names</st-text>
      <st-text>Default — body text</st-text>
      <st-text tone="muted">Muted — labels, metadata</st-text>
      <st-text tone="faint">Faint — placeholder, disabled</st-text>
    </st-column>`,
};

export const Surfaces: StoryObj = {
  render: () => `
    <st-surface level="canvas" padding="4">
      <st-surface level="panel" bordered rounded padding="3">
        <st-column gap="2">
          <st-heading>Panel</st-heading>
          <st-surface level="section" rounded="small" padding="2"><st-text>Section</st-text></st-surface>
          <st-surface level="well" rounded="small" padding="2"><st-text>Well</st-text></st-surface>
        </st-column>
      </st-surface>
    </st-surface>`,
};
