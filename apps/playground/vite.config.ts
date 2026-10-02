import { resolve } from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  // Relative URLs so the build works under any path (GitHub Pages: /station/playground/).
  base: "./",
  oxc: { jsx: { runtime: "automatic", importSource: "atomico" } },
  build: {
    rollupOptions: {
      input: {
        design: resolve(import.meta.dirname, "index.html"),
        paint: resolve(import.meta.dirname, "paint.html"),
        mixer: resolve(import.meta.dirname, "mixer.html"),
        assets: resolve(import.meta.dirname, "assets.html"),
        studio: resolve(import.meta.dirname, "studio.html"),
      },
    },
  },
});
