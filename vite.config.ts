import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

export default defineConfig({
  // Relative paths so the page works on GitHub Pages (under /<repo>/) and opened from disk.
  base: "./",
  // Inline all JS and CSS into dist/index.html so it works offline as a single file.
  plugins: [viteSingleFile()],
});
