/**
 * Configuration Vite réservée à l'aperçu autonome de composants
 * (`preview/howto.html`). Elle réutilise la configuration de l'application
 * (qui est une fonction) et ajoute seulement l'autorisation d'hôte nécessaire
 * au proxy d'aperçu. Fichier de développement — non utilisé par le build.
 */
import { defineConfig } from "vite";
// Extension explicite : le chargeur de config natif de Vite l'exige, et il
// deviendra le défaut. Sans elle, `vite --config` fonctionne mais émet un
// avertissement de dépréciation à chaque démarrage.
import baseConfig from "../vite.config.ts";

export default defineConfig(async (env) => {
  const base = await (baseConfig as (e: unknown) => unknown)(env);
  return {
    ...(base as Record<string, unknown>),
    server: {
      ...((base as { server?: Record<string, unknown> }).server ?? {}),
      host: "0.0.0.0",
      port: 5180,
      strictPort: true,
      allowedHosts: true,
    },
  };
});
