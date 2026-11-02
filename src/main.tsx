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
// Ionic structural CSS: layout for ion-app / .ion-page / ion-content
// (absolute positioning, flex fill). Without it, pushed views collapse to
// the header height and the screen appears blank even though content is in
// the DOM.
import "@ionic/core/css/ionic.bundle.css";
import "./ionic/theme.css";
import { applyStoredTheme, applyStoredThemeMode } from "./ionic/themes";
import { initPowerSync } from "@/lib/powersync";
import { initFloatingLabelFix } from "@/lib/formLabelFix";
import { PowerSyncProvider } from "@/components/PowerSyncProvider";
import { prefetchNavViews, useFeatureConfig } from "@/lib/features";
import { initSentry } from "@/lib/sentry";
import { armBootWatchdog } from "@/lib/bootWatchdog";
import { installBreadcrumbCapture } from "@/lib/observability/breadcrumbs";
import { installLongTaskMonitor } from "@/lib/observability/perfMonitor";
import { flushPendingReports } from "@/lib/observability/errorReporter";

// ─── Gestionnaires d'erreur globaux — afficher à l'écran au lieu du noir ───
function showBootError(title: string, message: string, detail?: string): void {
  const prev = document.getElementById("lumina-boot-error");
  if (prev) prev.remove();

  const el = document.createElement("div");
  el.id = "lumina-boot-error";
  el.setAttribute("role", "alert");
  el.style.cssText =
    "position:fixed;inset:0;z-index:2147483647;display:flex;flex-direction:column;" +
    "align-items:center;justify-content:center;gap:16px;padding:24px;" +
    "background:#ffffff;color:#111;font-family:system-ui,sans-serif;text-align:center;" +
    "border:3px solid #dc2626;";
  el.innerHTML = `
    <div style="font-size:48px;line-height:1">🚨</div>
    <p style="margin:0;font-weight:800;font-size:20px">${title}</p>
    <p style="margin:0;font-size:15px;line-height:1.5;max-width:420px">${message}</p>
    ${detail ? `<p style="margin:8px 0 0 0;font-size:12px;opacity:.75;max-width:420px;word-break:break-word">${detail}</p>` : ""}
    <button id="lumina-boot-reload" style="margin-top:16px;padding:12px 28px;border:0;border-radius:8px;background:#111;color:#fff;font-weight:600;cursor:pointer;box-shadow:0 2px 4px rgba(0,0,0,.15)">Recharger l’application</button>
  `;
  el.querySelector("#lumina-boot-reload")?.addEventListener("click", () => {
    window.location.reload();
  });
  document.body.appendChild(el);
}

window.addEventListener("error", (e) => {
  showBootError(
    "Erreur JavaScript",
    e.message,
    e.filename ? `${e.filename}:${e.lineno ?? ""}:${e.colno ?? ""}` : undefined,
  );
});
window.addEventListener("unhandledrejection", (e) => {
  const reason = e.reason?.message ?? String(e.reason ?? "promesse rejetée");
  showBootError("Promesse rejetée", reason);
});

// ─── Sentry ───────────────────────────────────────────────────────────────
try {
  initSentry();
} catch (e) {
  console.warn("[Lumina] Sentry init failed:", e);
}

// ─── Watchdog de démarrage ────────────────────────────────────────────────
try {
  armBootWatchdog();
} catch (e) {
  console.warn("[Lumina] Boot watchdog failed:", e);
}

// ─── PowerSync — fire-and-forget, ne bloque JAMAIS le boot ────────────────
try {
  void initPowerSync().catch((err) => {
    console.warn("[Lumina] PowerSync init failed, staying offline:", err);
  });
} catch (e) {
  console.warn("[Lumina] PowerSync init threw:", e);
}

// ─── Thème (avant le premier paint) ───────────────────────────────────────
try {
  applyStoredTheme();
} catch (e) {
  console.warn("[Lumina] applyStoredTheme failed:", e);
}
try {
  applyStoredThemeMode();
} catch (e) {
  console.warn("[Lumina] applyStoredThemeMode failed:", e);
}

// ─── Montage React — protégé par try/catch ────────────────────────────────
try {
  const rootEl = document.getElementById("root");
  if (!rootEl) {
    showBootError("Élément #root introuvable", "Le conteneur racine est absent du DOM.");
    throw new Error("#root introuvable");
  }

  createRoot(rootEl).render(
    <PowerSyncProvider>
      <App />
    </PowerSyncProvider>,
  );

  rootEl.classList.add("is-hydrated");

  // Correction globale des labels flottants Ion (chevauchement avec la valeur)
  try {
    initFloatingLabelFix();
  } catch (e) {
    console.warn("[Lumina] formLabelFix failed:", e);
  }
} catch (e) {
  showBootError(
    "Échec du montage de l’application",
    e instanceof Error ? e.message : String(e),
    "Vérifiez la console du navigateur (F12) pour plus de détails.",
  );
}
// ─── Préchargement des vues de nav (hors chemin critique) ─────────────────
try {
  void prefetchNavViews(useFeatureConfig.getState().navTabs).catch(() => {});
} catch (e) {
  console.warn("[Lumina] prefetchNavViews failed:", e);
}
