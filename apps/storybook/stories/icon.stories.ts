import type { Meta, StoryObj } from "@storybook/web-components-vite";

const meta: Meta = { title: "Foundations/Icon & Kbd" };
export default meta;

export const Icons: StoryObj = {
  render: () => `
    <st-column gap="3">
      ${["small", "medium", "large"]
        .map(
          (size) => `<st-row gap="2" size="${size}">
            <st-text tone="muted" style="width:56px">${size}</st-text>
            ${[
              "plus",
              "trash",
              "folder",
              "eye",
              "lock",
              "vector-bezier-2",
              "typography",
              "photo",
              "heart-filled",
            ]
              .map((n) => `<st-icon name="${n}"></st-icon>`)
              .join("")}
          </st-row>`,
        )
        .join("")}
      <st-row gap="2">
        <st-icon name="circle-check" style="color:var(--st-success-text)"></st-icon>
        <st-icon name="alert-triangle" style="color:var(--st-warning-text)"></st-icon>
        <st-icon name="alert-circle" style="color:var(--st-danger-text)"></st-icon>
      </st-row>
    </st-column>`,
};

export const Shortcuts: StoryObj = {
  render: () => `
    <st-column gap="2">
      <st-row gap="3"><st-kbd shortcut="Mod+Shift+D"></st-kbd><st-kbd shortcut="Alt+Backspace"></st-kbd><st-kbd shortcut="Mod+Enter"></st-kbd></st-row>
      <st-row gap="1.5"><st-kbd kind="boxed" shortcut="Mod+K"></st-kbd><st-kbd kind="boxed" shortcut="Shift+?"></st-kbd></st-row>
    </st-column>`,
};
