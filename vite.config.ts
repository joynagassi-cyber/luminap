import { defineConfig } from "vite";
import dyadComponentTagger from "@dyad-sh/react-vite-component-tagger";
import react from "@vitejs/plugin-react-swc";
import { nitro } from "nitro/vite";
import wasm from "vite-plugin-wasm";
import topLevelAwait from "vite-plugin-top-level-await";
import { sentryVitePlugin } from "@sentry/vite-plugin";
import path from "path";
import { readdirSync } from "node:fs";

const isCapacitorBuild = process.env.CAPACITOR_BUILD === "true";
const isDev = process.env.NODE_ENV !== "production";

// Upload des source maps vers Sentry — uniquement quand un token est fourni
// (CI de release / build APK). En local sans SENTRY_AUTH_TOKEN le plugin est
// absent : pas de tentative d'upload, pas d'échec de build.
const sentryAuthToken = process.env.SENTRY_AUTH_TOKEN;
const sentryUploadEnabled = Boolean(sentryAuthToken && process.env.SENTRY_ORG && process.env.SENTRY_PROJECT);

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
    ? [
        dyadComponentTagger(),
        react(),
        // Sentry doit rester en DERNIER : il s'exécute après la génération
        // des bundles/source maps pour les uploader.
        ...(sentryUploadEnabled
          ? [
              sentryVitePlugin({
                org: process.env.SENTRY_ORG,
                project: process.env.SENTRY_PROJECT,
                authToken: sentryAuthToken,
                release: { name: process.env.VITE_APP_VERSION },
                telemetry: false,
                // Supprime les .map du bundle APRÈS upload : elles ne doivent
                // jamais être servies ni embarquées dans l'APK.
                sourcemaps: { filesToDeleteAfterUpload: ["./dist/**/*.map"] },
              }),
            ]
          : []),
      ]
    : [
        dyadComponentTagger(),
        react(),
        wasm(),
        // Only enable top-level await in dev mode (not with Nitro)
        ...(isDev ? [topLevelAwait()] : []),
        // Sentry upload (source maps) — avant nitro() pour respecter
        // l'invariant « nitro() doit rester le DERNIER plugin ». Le plugin
        // n'agit qu'à `closeBundle`, l'ordre relatif est donc neutre.
        ...(sentryUploadEnabled
          ? [
              sentryVitePlugin({
                org: process.env.SENTRY_ORG,
                project: process.env.SENTRY_PROJECT,
                authToken: sentryAuthToken,
                release: { name: process.env.VITE_APP_VERSION },
                telemetry: false,
                // Supprime les .map du bundle APRÈS upload : elles ne doivent
                // jamais être servies ni embarquées dans l'APK.
                sourcemaps: { filesToDeleteAfterUpload: ["./dist/**/*.map"] },
              }),
            ]
          : []),
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
    // pdfjs worker : `?url` asset import est traité par Vite comme un
    // asset émis dans dist/ — on l'ajoute explicitement pour que le
    // bundler le copie dans le build (rolldown résout le module mais ne
    // le copie pas comme asset sans déclaration).
    // @ionic/react + @ionic/react-router : pré-bundlés ensemble pour éviter
    // le crash "IonPage is not defined" dans les lazy chunks (le wrapper de
    // IonPage de @ionic/react-router référence IonPage mais ne l'importe pas
    // dans son module ESM isolé ; pré-bundlé avec @ionic/react, les deux
    // partagent le même scope).
    include: [
      "pdfjs-dist/build/pdf.worker.min.mjs?url",
      "@ionic/react",
      "@ionic/react-router",
    ],
  },
  build: {
    // Source maps uniquement quand Sentry est configuré (CI de release).
    // « hidden » = maps générées sans commentaire sourceMappingURL → jamais
    // servies au navigateur ; le plugin Sentry les uploade puis les supprime
    // du bundle final. Hors CI Sentry : pas de maps du tout (pas de fuite de
    // source si `dist/` est déployé).
    sourcemap: sentryUploadEnabled ? ("hidden" as const) : false,
  },
  worker: {
    format: "es" as const,
    plugins: () => [wasm()],
  },
}));
