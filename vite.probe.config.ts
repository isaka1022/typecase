import { defineConfig } from "vite";

/**
 * The probe ships as one self-contained file so it can be pasted into a console
 * or loaded by a bookmarklet. It is built separately from the studio because it
 * has no React, no HTML host and no module loading at the other end.
 */
export default defineConfig({
  build: {
    emptyOutDir: false,
    outDir: "public",
    lib: {
      entry: "src/probe/index.ts",
      formats: ["iife"],
      name: "TypecaseProbe",
      fileName: () => "probe.js",
    },
  },
});
