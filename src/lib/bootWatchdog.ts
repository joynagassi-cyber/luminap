/**
 * Watchdog de démarrage (Phase 2, robustesse « zéro écran noir »).
 *
 * ⚠️ PORTÉE RÉELLE — corrigée le 2026-10-28.
 *
 * Ce module ne peut protéger que les blocages survenant APRÈS l'évaluation du
 * graphe de modules. Il est armé par une instruction de `main.tsx` ; or les
 * imports ES sont évalués avant toute instruction du module. Si un import lève
 * à l'évaluation (ex. `@/lib/auth` sans `VITE_SUPABASE_URL`), le corps de
 * `main.tsx` ne s'exécute jamais : `armBootWatchdog()` n'est jamais atteint, et
 * ce watchdog ne peut pas signaler l'échec.
 *
 * C'est le même défaut que celui décrit ci-dessous, un niveau plus haut : le
 * minuteur était dans l'arbre React (donc aveugle à « React n'a jamais monté »),
 * il a été déplacé dans le bundle (donc aveugle à « le bundle n'a jamais été
 * évalué »). Le dernier recours vit désormais HORS du bundle, en script inline
 * dans `index.html` (`#lumina-boot-recovery`).
 *
 * Les deux couches sont idempotentes : chacune vérifie la présence de
 * `#lumina-boot-recovery` avant d'afficher, et la couche HTML retire sa
 * surcouche dès que l'app devient prête.
 *
 * Ci-dessous : historique du premier correctif (toujours valable).
 *
 * Problème : le watchdog vivait DANS l'arbre React (`AppReadyBridge`). Or ce
 * composant ne s'exécute que si React a monté — il ne peut donc jamais
 * détecter « React n'a jamais monté ». Pire, son effet posait le drapeau de
 * disponibilité avant d'armer le minuteur, si bien que la condition d'échec
 * était toujours fausse : l'écran de récupération était **mort** (jamais
 * atteint), et un blocage de boot (chunk/chunk-error pendant l'hydratation,
 * échec de montage) laissait un écran noir silencieux.
 *
 * Correctif : armer le minuteur **avant** `createRoot` (donc indépendamment du
 * montage React) et afficher, à l'expiration, une surcouche HTML statique —
 * qui fonctionne même si React n'a jamais monté. `signalAppReady()` annule le
 * minuteur dès que la coquille a monté.
 *
 * Sans dépendance React ni Ionic : testable en jsdom.
 */

export const BOOT_WATCHDOG_MS = 12_000;
export const BOOT_READY_ATTR = "data-app-ready";
export const BOOT_RECOVERY_ID = "lumina-boot-recovery";

let timer: ReturnType<typeof setTimeout> | null = null;

/** Marque la coquille comme prête et annule le watchdog. */
export function signalAppReady(): void {
  if (timer !== null) {
    clearTimeout(timer);
    timer = null;
  }
}

/**
 * Arme le watchdog. Si `signalAppReady()` n'est pas appelé dans le délai, la
 * surcouche de récupération remplace l'écran (noir) silencieux.
 */
export function armBootWatchdog(timeoutMs = BOOT_WATCHDOG_MS): void {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  timer = setTimeout(() => {
    if (document.getElementById(BOOT_RECOVERY_ID)) return;
    renderBootRecoveryOverlay();
  }, timeoutMs);
}

/**
 * Surcouche de récupération statique (aucun framework requis). Rechargement
 * contrôlé : un blocage transitoire (chunk obsolète) est résolu par un
 * rechargement ; un blocage persistant réaffiche la surcouche après rechargement.
 */
export function renderBootRecoveryOverlay(): void {
  const el = document.createElement("div");
  el.id = BOOT_RECOVERY_ID;
  el.setAttribute("data-screen-state", "error");
  el.setAttribute("role", "alert");
  el.style.cssText =
    "position:fixed;inset:0;z-index:9999;display:flex;flex-direction:column;" +
    "align-items:center;justify-content:center;gap:12px;padding:24px;" +
    "text-align:center;background:var(--canvas,#0b0b0c);" +
    "color:var(--text-primary,#fff);font-family:var(--font-sans,system-ui,sans-serif)";
  el.innerHTML =
    '<div style="font-size:32px" aria-hidden="true">⚠</div>' +
    '<p style="margin:0;font-weight:700;font-size:18px">L’application n’a pas pu démarrer</p>' +
    '<p style="margin:0;font-size:14px;opacity:.8">Le chargement a échoué ou dépassé le délai attendu.</p>';
  const btn = document.createElement("button");
  btn.type = "button";
  btn.textContent = "Recharger l’application";
  btn.style.cssText =
    "margin-top:8px;padding:12px 28px;border:0;border-radius:9999px;" +
    "font-weight:600;cursor:pointer;background:var(--accent-primary,#6366f1);color:#fff";
  btn.addEventListener("click", () => window.location.reload());
  el.appendChild(btn);
  document.body.appendChild(el);
}
