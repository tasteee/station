import type { Meta, StoryObj } from "@storybook/web-components-vite";

interface Args {
  tag: "st-row" | "st-column";
  xAlign: string;
  yAlign: string;
  gap: string;
}

const meta: Meta<Args> = {
  title: "Foundations/Layout",
  argTypes: {
    tag: { control: "inline-radio", options: ["st-row", "st-column"] },
    xAlign: {
      control: "select",
      options: ["start", "center", "end", "stretch", "between", "around", "evenly"],
    },
    yAlign: {
      control: "select",
      options: ["start", "center", "end", "stretch", "baseline", "between", "around", "evenly"],
    },
    gap: { control: "select", options: ["0", "0.5", "1", "1.5", "2", "3", "4", "6"] },
  },
  args: { tag: "st-row", xAlign: "start", yAlign: "center", gap: "2" },
};
export default meta;

const block = (label: string, size: string) =>
  `<st-surface level="section" bordered rounded="small" padding="2" style="${size}"><st-text size="small">${label}</st-text></st-surface>`;

export const RowAndColumn: StoryObj<Args> = {
  render: ({ tag, xAlign, yAlign, gap }) => `
    <st-surface level="well" rounded style="height:240px;display:flex">
      <${tag} grow x-align="${xAlign}" y-align="${yAlign}" gap="${gap}" padding="3">
        ${block("A", "min-width:60px;min-height:32px")}
        ${block("B", "min-width:90px;min-height:56px")}
        ${block("C", "min-width:40px;min-height:24px")}
      </${tag}>
    </st-surface>`,
};

export const Toolbar: StoryObj = {
  render: () => `
    <st-surface level="panel" bordered rounded="small">
      <st-row padding-x="2" gap="2" style="height:36px">
        <st-heading>Layers</st-heading>
        <st-spacer></st-spacer>
        <st-divider></st-divider>
        <st-kbd shortcut="Alt+1"></st-kbd>
      </st-row>
    </st-surface>`,
};
