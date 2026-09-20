import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./App.css";
import "./globals.css";
// Ionic structural CSS: layout for ion-app / .ion-page / ion-content
// (absolute positioning, flex fill). Without it, pushed views collapse to
// the header height and the screen appears blank even though content is in
// the DOM.
import "@ionic/core/css/ionic.bundle.css";
import "./ionic/theme.css";
import { applyStoredTheme, applyStoredThemeMode } from "./ionic/themes";
import { initOneSignal } from "@/lib/onesignal";
import { initPowerSync } from "@/lib/powersync";
import { prefetchNavViews, useFeatureConfig } from "@/lib/features";

// Initialize PowerSync before React mounts. This is fire-and-forget: it
// registers the shared database/connector singletons synchronously so the
// data layer can use `getPowerSyncDatabase()` on first render, while the
// actual first sync runs in the background and retries on failure. Without
// this call the data layer would throw "Database not initialized" and the
// app would stay stuck on its offline fallback.
initPowerSync().catch((err) => {
  console.warn("[Lumina] PowerSync init failed, staying offline:", err);
});

// Restore the persisted brand theme (chosen during onboarding) before the
// first paint. No-op when no theme has been stored yet.
applyStoredTheme();

// Restore the persisted light/dark mode (dark by default) before the first
// paint. Sets `data-theme` on <html> so every CSS token + Ionic var is
// already in the right state (index.html also primes it pre-bundle).
applyStoredThemeMode();

// Initialize OneSignal after app mounts
initOneSignal();

// Best effort : précharger les définitions d'éléments personnalisés Ionic.
// Avec React 19, monter un custom element NON encore défini peut faire
// perdre ses enfants React (barre d'onglets / boutons ionic vides). Les
// composants critiques (BottomNav, boutons du header) sont désormais en
// HTML natif — ce préchargement couvre les autres éléments ionic.
import("@ionic/core")
  .then((m) => {
    const loader = (
      m as {
        loadIonicDefinitions?: () => Promise<void>;
        registerIonContent?: () => void;
      }
    ).loadIonicDefinitions;
    return loader?.();
  })
  .catch(() => {});

createRoot(document.getElementById("root")!).render(<App />);

// Affichage fluide : dès le départ, on préchauffe (hors du chemin critique
// de rendu, au repos du navigateur) les chunks des vues de la nav que
// l'utilisateur a configurée (défaut sinon). Le premier clic sur un onglet
// n'affiche alors plus le squelette de chargement.
prefetchNavViews(useFeatureConfig.getState().navTabs);
