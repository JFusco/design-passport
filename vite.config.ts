import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";
import { buildDefines } from "./scripts/build-metadata.mjs";

export default defineConfig({
  root: "src/ui",
  define: buildDefines(),
  plugins: [react(), viteSingleFile()],
  build: {
    outDir: "../../dist",
    // Keep the plugin controller present while the UI bundle is rebuilt so an
    // open Figma development plugin never observes a transient missing code.js.
    emptyOutDir: false,
    target: "es2020",
    cssCodeSplit: false,
    sourcemap: false,
  },
});
