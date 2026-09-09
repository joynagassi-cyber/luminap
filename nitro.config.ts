import { defineConfig } from "nitro";

export default defineConfig({
  serverDir: "./server",
  // Load security plugin before all handlers
  plugins: ["./server/plugins/security.ts"],
});
