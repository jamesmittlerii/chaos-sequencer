import { cpSync, writeFileSync } from "node:fs";
import { defineConfig } from "vite";

export default defineConfig({
  // Relative assets work both at localhost and under a GitHub Pages project path.
  base: "./",
  plugins: [
    {
      name: "copy-static-presets",
      closeBundle() {
        cpSync("presets", "dist/presets", { recursive: true });
        writeFileSync("dist/.nojekyll", "");
      },
    },
  ],
});
