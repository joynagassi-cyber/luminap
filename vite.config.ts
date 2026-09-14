import { defineConfig } from "vite";
import dyadComponentTagger from "@dyad-sh/react-vite-component-tagger";
import react from "@vitejs/plugin-react-swc";
import { nitro } from "nitro/vite";
import wasm from "vite-plugin-wasm";
import topLevelAwait from "vite-plugin-top-level-await";
import path from "path";
import { readdirSync } from "node:fs";

const isCapacitorBuild = process.env.CAPACITOR_BUILD === "true";
const isDev = process.env.NODE_ENV !== "production";

// Nitro server layer : activé uniquement s'il existe de VRAIES routes
// serveur (fichiers .ts/.mts dans ./server, à part .gitkeep). L'app ne
// possède aujourd'hui aucune route API, et le worker Nitro en dev échoue
// (« transport invoke timed out — getBuiltin/fetchModule sur dev-entry.js »)
// ce qui bloque toute l'application avec l'overlay d'erreur Vite (écrans
// vides, pages inaccessibles). Ajouter un fichier dans `server/routes/`
// ré-activera le plugin automatiquement.
function hasNitroRoutesOnDisk(): boolean {
  try {
    const root = path.resolve(process.cwd(), "server");
    const stack = [root];
    while (stack.length > 0) {
      const dir = stack.pop()!;
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        if (entry.isDirectory()) {
          if (entry.name !== "node_modules") stack.push(path.join(dir, entry.name));
        } else if (
          (entry.name.endsWith(".ts") || entry.name.endsWith(".mts")) &&
          !entry.name.endsWith(".d.ts")
        ) {
          return true;
        }
      }
    }
    return false;
  } catch {
    return false; // pas de dossier server/ → pas de routes Nitro
  }
}

const hasNitroServerRoutes = hasNitroRoutesOnDisk();

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
        // nitro() doit rester le DERNIER plugin (apres les transforms Vite)
        // pour que le SPA fallback n'intercepte pas les URLs internes.
        ...(hasNitroServerRoutes ? [nitro()] : []),
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
