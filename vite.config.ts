import { defineConfig } from "vite";
import dyadComponentTagger from "@dyad-sh/react-vite-component-tagger";
import react from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import wasm from "vite-plugin-wasm";
import path from "path";

const isCapacitorBuild = process.env.CAPACITOR_BUILD === "true";

export default defineConfig(() => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: isCapacitorBuild
    ? [dyadComponentTagger(), react()]
    : [
        dyadComponentTagger(),
        react(),
        wasm(),
        nitro(),
      ],
  resolve: {
    alias: {
      "@": path.resolve(process.cwd(), "./src"),
    },
  },
  optimizeDeps: {
    exclude: ["@journeyapps/wa-sqlite", "@powersync/web"],
  },
  worker: {
    format: "es",
    plugins: () => [wasm()],
  },
}));
