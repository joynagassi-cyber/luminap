import { createRoot } from "react-dom/client";
import App from "./App.tsx";
// Inter embarquée (addendum B2) : sous-ensembles latin + latin étendu, woff2.
// Aucun appel à Google Fonts à l'exécution — l'app doit marcher hors ligne.
import "@fontsource/inter/latin-400.css";
import "@fontsource/inter/latin-500.css";
import "@fontsource/inter/latin-600.css";
import "@fontsource/inter/latin-700.css";
import "@fontsource/inter/latin-ext-400.css";
import "@fontsource/inter/latin-ext-500.css";
import "@fontsource/inter/latin-ext-600.css";
import "@fontsource/inter/latin-ext-700.css";
import "./App.css";
import "./globals.css";
import "./design-system/tokens/semantic.css";
import "./design-system/tokens/themes.generated.css";
import "./design-system/tokens/violet-legacy.css";
import "./design-system/tokens/effects.css";
import "./design-system/theme/transition.css";
import { ThemeProvider } from "./design-system/theme/ThemeProvider";
import { applyEffects, getInitialEffects } from "./design-system/theme/effects";
// Ionic structural CSS: layout for ion-app / .ion-page / ion-content
// (absolute positioning, flex fill). Without it, pushed views collapse to
// the header height and the screen appears blank even though content is in
// the DOM.
import "@ionic/core/css/ionic.bundle.css";
import "./ionic/theme.css";
import { applyStoredTheme, applyStoredThemeMode } from "./ionic/themes";
import { initPowerSync } from "@/lib/powersync";
import { PowerSyncProvider } from "@/components/PowerSyncProvider";
import { prefetchNavViews, useFeatureConfig } from "@/lib/features";
import { initSentry } from "@/lib/sentry";
import { armBootWatchdog } from "@/lib/bootWatchdog";
import { installBreadcrumbCapture } from "@/lib/observability/breadcrumbs";
import { installLongTaskMonitor } from "@/lib/observability/perfMonitor";
import { flushPendingReports } from "@/lib/observability/errorReporter";
import { Capacitor } from "@capacitor/core";

// Arme le watchdog de démarrage AVANT tout montage React : si la coquille ne
// signale jamais sa disponibilité (chunk manquant, échec d'hydratation, blocage
// PowerSync), une surcouche de récupération remplace l'écran noir silencieux.
armBootWatchdog();

// Initialise Sentry avant tout : il capture les erreurs de la phase de
// boot (initPowerSync, applyStoredTheme, loadIonicDefinitions…). Silencieux
// si le DSN (VITE_SENTRY_DSN) n'est pas défini — le SDK reste actif sans envoi.
initSentry();

// Observabilité — capture automatique du fil d'Ariane (clics, navigations,
// réseau) et surveillance des tâches longues (interface gelée). Armés tôt pour
// couvrir la phase de boot. Les rapports déjà en file (hors-ligne, rechargement)
// sont ré-émis dès que possible.
installBreadcrumbCapture();
installLongTaskMonitor();
void flushPendingReports().catch(() => {
  /* fire-and-forget : la file est réessayée à la reconnexion / au prochain boot */
});


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
// paint. Sets `data-mode` on <html> so every CSS token + Ionic var is
// already in the right state (index.html also primes it pre-bundle).
applyStoredThemeMode();

// Même résolution que l’anti-flash ; ne persiste que le choix explicite.
applyEffects(getInitialEffects(), false);

// OneSignal est initialisé à la demande (flux déclenché par l'utilisateur,
// ex. SettingsNotifications), jamais au boot : le plugin a
// promptForNotifications:true, donc l'init au premier lancement demanderait
// la permission push avant tout usage des notifications.

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

// Le `<PowerSyncProvider>` DOIT envelopper `<App />` : les hooks de lecture
// du dataLayer (`useQuery` de @powersync/react) lisent la base via
// `PowerSyncContext`. Sans provider, `useQuery` renvoie
// `{ data: [], error: new Error("PowerSync not configured.") }` : toutes
// les listes de l'app retombaient sur le repli local (vide au premier
// lancement) — la base SQLite contenait pourtant bien les lignes
// synchronisées. Le provider était défini mais jamais monté.
// C-09 (A3) — sur Android natif, l'inset bas est géré par MainActivity
// (padding WindowInsets de la WebView) : cette classe force à 0 les
// utilitaires CSS basés sur env(safe-area-inset-bottom) (App.css et
// --ion-safe-area-bottom), interdisant toute double compensation.
// Sur le web et iOS, env() reste la source (indicateur d'accueil,
// encoches). Posée avant le premier rendu pour éviter tout saut visuel.
if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android") {
  document.documentElement.classList.add("lumina-native-android");
}

createRoot(document.getElementById("root")!).render(
  <ThemeProvider>
    <PowerSyncProvider>
      <App />
    </PowerSyncProvider>
  </ThemeProvider>,
);

// Affichage fluide : dès le départ, on préchauffe (hors du chemin critique
// de rendu, au repos du navigateur) les chunks des vues de la nav que
// l'utilisateur a configurée (défaut sinon). Le premier clic sur un onglet
// n'affiche alors plus le squelette de chargement.
prefetchNavViews(useFeatureConfig.getState().navTabs);
