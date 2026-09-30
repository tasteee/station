import { registerIcons } from "@station/icons";
import {
  IconAlignCenter,
  IconAlignLeft,
  IconAlignRight,
  IconBold,
  IconItalic,
  IconPlus,
  IconTrash,
} from "@station/icons/tabler";
import { it } from "vitest";
import "../src/index.ts";
import { matchBothThemes } from "./visual.ts";

registerIcons({
  plus: IconPlus,
  trash: IconTrash,
  bold: IconBold,
  italic: IconItalic,
  "align-left": IconAlignLeft,
  "align-center": IconAlignCenter,
  "align-right": IconAlignRight,
});

it("buttons", async () => {
  await matchBothThemes(
    "buttons",
    `<st-column gap="2">
      ${["solid", "outline", "ghost"]
        .map(
          (k) =>
            `<st-row gap="2"><st-button kind="${k}">Neutral</st-button><st-button kind="${k}" tone="accent">Accent</st-button><st-button kind="${k}" tone="danger">Danger</st-button><st-button kind="${k}" icon="plus">Icon</st-button></st-row>`,
        )
        .join("")}
      <st-row gap="2">
        <st-icon-button icon="plus" label="Add"></st-icon-button>
        <st-icon-button icon="trash" label="Delete" tone="danger"></st-icon-button>
        <st-toggle-button icon="bold" label="Bold" pressed></st-toggle-button>
        <st-toggle-button icon="italic" label="Italic" tone="accent" pressed></st-toggle-button>
        <st-button-group kind="outline" attached><st-button>A</st-button><st-button>B</st-button></st-button-group>
        <st-segmented-control value="center">
          <st-segment value="left" icon="align-left" label="Left"></st-segment>
          <st-segment value="center" icon="align-center" label="Center"></st-segment>
          <st-segment value="right" icon="align-right" label="Right"></st-segment>
        </st-segmented-control>
      </st-row>
    </st-column>`,
    560,
  );
});

it("fields", async () => {
  await matchBothThemes(
    "fields",
    `<st-column gap="2">
      <st-row gap="2"><st-text-field label="Name" value="Frame 12"></st-text-field><st-text-field label="Empty" placeholder="Placeholder" kind="outline"></st-text-field></st-row>
      <st-row gap="2"><st-search-field label="Search" value="icon"></st-search-field><st-select label="Blend" value="a"><st-option value="a">Normal</st-option></st-select></st-row>
      <st-row gap="2">
        <st-number-field label="W" prefix="W" value="120" unit="px"></st-number-field>
        <st-number-field label="R" prefix="R" mixed></st-number-field>
        <st-slider label="Opacity" value="60"></st-slider>
      </st-row>
      <st-textarea label="Notes" rows="2" value="Two lines"></st-textarea>
    </st-column>`,
  );
});

it("choices", async () => {
  await matchBothThemes(
    "choices",
    `<st-row gap="6" y-align="start">
      <st-column gap="1"><st-checkbox checked>Checked</st-checkbox><st-checkbox>Unchecked</st-checkbox><st-checkbox indeterminate>Mixed</st-checkbox></st-column>
      <st-column gap="1"><st-switch checked>On</st-switch><st-switch>Off</st-switch></st-column>
      <st-radio-group value="a"><st-radio value="a">First</st-radio><st-radio value="b">Second</st-radio></st-radio-group>
    </st-row>`,
  );
});
