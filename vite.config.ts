import { defineConfig } from "vite";
import dyadComponentTagger from "@dyad-sh/react-vite-component-tagger";
import react from "@vitejs/plugin-react-swc";
import { nitro } from "nitro/vite";
import wasm from "vite-plugin-wasm";
import topLevelAwait from "vite-plugin-top-level-await";
import path from "path";

const isCapacitorBuild = process.env.CAPACITOR_BUILD === "true";
const isDev = process.env.NODE_ENV !== "production";

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
        // Only enable top-level await in dev mode (not with Nitro)
        ...(isDev ? [topLevelAwait()] : []),
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
