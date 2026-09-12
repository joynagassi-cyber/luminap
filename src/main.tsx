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
import { applyStoredTheme } from "./ionic/themes";
import { initOneSignal } from "@/lib/onesignal";
import { initPowerSync } from "@/lib/powersync";

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

// Initialize OneSignal after app mounts
initOneSignal();

createRoot(document.getElementById("root")!).render(<App />);
