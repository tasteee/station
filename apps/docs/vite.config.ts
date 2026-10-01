import { defineConfig } from "vite";

export default defineConfig({
  // Relative URLs so the build works under any path (GitHub Pages: /station/).
  base: "./",
  oxc: { jsx: { runtime: "automatic", importSource: "atomico" } },
});
