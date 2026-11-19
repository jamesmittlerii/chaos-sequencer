import { defineConfig } from "vite";

/** Bundle the shared js/ pipeline into a Max-loadable IIFE (`Lorenz` global). */
export default defineConfig({
  build: {
    lib: {
      entry: "./m4l/pipeline.js",
      name: "Lorenz",
      formats: ["iife"],
      fileName: () => "chaos-pipeline.js",
    },
    outDir: "m4l",
    emptyOutDir: false,
    target: "es2018",
    minify: false,
  },
});
