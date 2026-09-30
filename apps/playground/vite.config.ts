import { resolve } from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  oxc: { jsx: { runtime: "automatic", importSource: "atomico" } },
  build: {
    rollupOptions: {
      input: {
        design: resolve(import.meta.dirname, "index.html"),
        paint: resolve(import.meta.dirname, "paint.html"),
        mixer: resolve(import.meta.dirname, "mixer.html"),
      },
    },
  },
});
