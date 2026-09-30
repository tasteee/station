import type { StorybookConfig } from "@storybook/web-components-vite";

const config: StorybookConfig = {
  framework: "@storybook/web-components-vite",
  stories: ["../stories/**/*.stories.ts"],
  core: { disableTelemetry: true },
  async viteFinal(config) {
    // Station components are Atomico TSX.
    return { ...config, oxc: { jsx: { runtime: "automatic", importSource: "atomico" } } };
  },
};

export default config;
