import "@station/tokens";
import "@station/tokens/fonts.css";
import "@station/components";
import { registerIcons } from "@station/icons";
import { tablerIcons } from "@station/icons/tabler/all";
import type { Preview } from "@storybook/web-components-vite";
import "./preview.css";

// Stories may use any icon by its Tabler name. Apps should register only what they use.
registerIcons(tablerIcons);

const preview: Preview = {
  globalTypes: {
    theme: {
      description: "Theme",
      toolbar: { title: "Theme", icon: "mirror", items: ["light", "dark"], dynamicTitle: true },
    },
    density: {
      description: "Density",
      toolbar: {
        title: "Density",
        icon: "component",
        items: ["compact", "default", "comfortable"],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { theme: "light", density: "default" },
  decorators: [
    (story, { globals }) => {
      document.documentElement.setAttribute("theme", globals.theme ?? "light");
      document.documentElement.setAttribute("density", globals.density ?? "default");
      return story();
    },
  ],
  parameters: {
    layout: "padded",
    backgrounds: { disable: true },
    controls: { expanded: true },
  },
};

export default preview;
