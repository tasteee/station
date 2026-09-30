import type { Meta, StoryObj } from "@storybook/web-components-vite";

interface Args {
  kind: string;
  tone: string;
  size: string;
  disabled: boolean;
  loading: boolean;
  label: string;
}

const meta: Meta<Args> = {
  title: "Controls/Buttons",
  argTypes: {
    kind: { control: "inline-radio", options: ["solid", "outline", "ghost"] },
    tone: { control: "inline-radio", options: ["", "accent", "danger"] },
    size: { control: "inline-radio", options: ["small", "medium", "large"] },
  },
  args: { kind: "outline", tone: "", size: "medium", disabled: false, loading: false, label: "Button" },
};
export default meta;

export const Button: StoryObj<Args> = {
  render: ({ kind, tone, size, disabled, loading, label }) =>
    `<st-button kind="${kind}" ${tone ? `tone="${tone}"` : ""} size="${size}" ${disabled ? "disabled" : ""} ${loading ? "loading" : ""}>${label}</st-button>`,
};

export const Matrix: StoryObj = {
  render: () => `
    <st-column gap="3">
      ${["solid", "outline", "ghost"]
        .map(
          (kind) => `<st-row gap="2">
            <st-text tone="muted" style="width:60px">${kind}</st-text>
            <st-button kind="${kind}">Neutral</st-button>
            <st-button kind="${kind}" tone="accent">Accent</st-button>
            <st-button kind="${kind}" tone="danger">Danger</st-button>
            <st-button kind="${kind}" icon="plus">With icon</st-button>
            <st-button kind="${kind}" disabled>Disabled</st-button>
          </st-row>`,
        )
        .join("")}
    </st-column>`,
};

export const IconButtons: StoryObj = {
  render: () => `
    <st-column gap="3">
      ${["small", "medium", "large"]
        .map(
          (size) => `<st-row gap="1" size="${size}">
            <st-icon-button icon="plus" label="Add" shortcut="Mod+N"></st-icon-button>
            <st-icon-button icon="copy" label="Duplicate" shortcut="Mod+D"></st-icon-button>
            <st-icon-button icon="trash" label="Delete" shortcut="Delete" tone="danger"></st-icon-button>
            <st-icon-button icon="settings" label="Settings" kind="outline"></st-icon-button>
          </st-row>`,
        )
        .join("")}
    </st-column>`,
};

export const GroupsAndToolbars: StoryObj = {
  render: () => `
    <st-column gap="4">
      <st-button-group kind="outline" attached label="Alignment">
        <st-button icon="align-left">Left</st-button><st-button icon="align-center">Center</st-button><st-button icon="align-right">Right</st-button>
      </st-button-group>
      <st-toolbar label="Text formatting">
        <st-toggle-button icon="bold" label="Bold" shortcut="Mod+B" pressed></st-toggle-button>
        <st-toggle-button icon="italic" label="Italic" shortcut="Mod+I"></st-toggle-button>
        <st-toggle-button icon="underline" label="Underline" shortcut="Mod+U"></st-toggle-button>
        <st-divider></st-divider>
        <st-icon-button icon="link" label="Link" shortcut="Mod+K"></st-icon-button>
      </st-toolbar>
      <st-segmented-control value="left" label="Text align">
        <st-segment value="left" icon="align-left" label="Left"></st-segment>
        <st-segment value="center" icon="align-center" label="Center"></st-segment>
        <st-segment value="right" icon="align-right" label="Right"></st-segment>
      </st-segmented-control>
      <st-segmented-control value="fill" block style="width:240px">
        <st-segment value="fixed">Fixed</st-segment><st-segment value="hug">Hug</st-segment><st-segment value="fill">Fill</st-segment>
      </st-segmented-control>
    </st-column>`,
};
