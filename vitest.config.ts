import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

// Playwright's pinned Chromium may differ from the one installed; allow an override.
const executablePath =
  process.env.STATION_CHROMIUM ??
  (process.env.PLAYWRIGHT_BROWSERS_PATH ? `${process.env.PLAYWRIGHT_BROWSERS_PATH}/chromium` : undefined);

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: "node",
          include: ["packages/*/test/**/*.test.ts"],
          exclude: ["**/*.browser.test.*", "**/*.visual.test.*"],
          environment: "node",
        },
      },
      {
        oxc: { jsx: { runtime: "automatic", importSource: "atomico" } },
        optimizeDeps: { include: ["atomico", "atomico/jsx-runtime", "atomico/jsx-dev-runtime"] },
        test: {
          name: "browser",
          include: ["packages/*/test/**/*.browser.test.{ts,tsx}", "apps/*/test/**/*.browser.test.{ts,tsx}"],
          browser: {
            enabled: true,
            headless: true,
            provider: playwright({ launchOptions: executablePath ? { executablePath } : {} }),
            instances: [{ browser: "chromium" }],
          },
        },
      },
      {
        oxc: { jsx: { runtime: "automatic", importSource: "atomico" } },
        optimizeDeps: { include: ["atomico", "atomico/jsx-runtime", "atomico/jsx-dev-runtime"] },
        test: {
          name: "visual",
          include: ["packages/*/test/**/*.visual.test.{ts,tsx}"],
          browser: {
            enabled: true,
            headless: true,
            provider: playwright({ launchOptions: executablePath ? { executablePath } : {} }),
            instances: [{ browser: "chromium" }],
            viewport: { width: 800, height: 600 },
            expect: {
              toMatchScreenshot: {
                // Baselines are committed. Regenerate with `pnpm test:visual --update`.
                screenshotDirectory: "__visual__",
                comparatorName: "pixelmatch",
                comparatorOptions: { threshold: 0.2, allowedMismatchedPixelRatio: 0.002 },
              },
            },
          },
        },
      },
    ],
  },
});
