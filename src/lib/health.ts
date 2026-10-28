/**
 * Health snapshot — Phase 11 « exploitation autonome » (proposition PR4).
 *
 * But : donner au propriétaire (et au support) une vue « santé » de l'app sans
 * accès à Sentry : version, état de la base/synchronisation, dernière erreur
 * connue, contexte d'organisation, plateforme. Aucune PII : on n'affiche ni
 * email, ni nom, ni contenu utilisateur (cf. politique de `clientErrors.ts`).
 *
 * Le cœur (`buildHealthReport`) est une fonction PURE, donc testable sans
 * navigateur ni PowerSync. Le hook `useHealthSnapshot` ne fait que collecter
 * les entrées réelles et appeler la fonction pure.
 */
import { useEffect, useState } from "react";

import { Capacitor } from "@capacitor/core";

import { getRecentErrors } from "./clientErrors";
import { isPowerSyncReadyNow } from "./dataLayer";
import { getOrganizationId, hasResolvedOrganization } from "./orgContext";
import { normalizeText } from "./sanitize";

export type HealthLevel = "ok" | "warn" | "error";

/** Libellés FR d'un niveau de santé (partagés par la page et le diagnostic). */
export const HEALTH_LEVEL_LABEL: Record<HealthLevel, string> = {
  ok: "Bon",
  warn: "Attention",
  error: "Problème",
};

export interface HealthCheck {
  id: string;
  label: string;
  level: HealthLevel;
  detail: string;
}

export interface HealthInputs {
  appVersion: string;
  platform: string;
  online: boolean;
  syncReady: boolean;
  hasOrg: boolean;
  orgId: string;
  /** Nombre d'erreurs client récentes (buffer mémoire). */
  recentErrorCount: number;
  lastErrorMessage?: string;
  lastErrorAt?: string;
}

export interface HealthReport {
  generatedAt: string;
  overall: HealthLevel;
  checks: HealthCheck[];
}

/** Sévérité la plus élevée d'un ensemble de niveaux. */
export function worstLevel(levels: HealthLevel[]): HealthLevel {
  if (levels.includes("error")) return "error";
  if (levels.includes("warn")) return "warn";
  return "ok";
}

/**
 * Construit le rapport santé à partir d'entrées déjà collectées. Pur : aucune
 * horloge implicite (l'horodatage est passé par l'appelant).
 */
export function buildHealthReport(
  inputs: HealthInputs,
  generatedAt: string,
): HealthReport {
  const checks: HealthCheck[] = [
    {
      id: "version",
      label: "Version de l'application",
      level: inputs.appVersion ? "ok" : "warn",
      detail: inputs.appVersion || "inconnue",
    },
    {
      id: "platform",
      label: "Plateforme",
      level: "ok",
      detail: inputs.platform,
    },
    {
      id: "network",
      label: "Connexion réseau",
      level: inputs.online ? "ok" : "warn",
      detail: inputs.online ? "en ligne" : "hors ligne (mode local)",
    },
    {
      id: "sync",
      label: "Synchronisation PowerSync",
      level: inputs.syncReady ? "ok" : "warn",
      detail: inputs.syncReady
        ? "connectée et synchronisée"
        : "en attente de synchronisation",
    },
    {
      id: "org",
      label: "Organisation active",
      level: inputs.hasOrg ? "ok" : "error",
      detail: inputs.hasOrg ? inputs.orgId : "aucune organisation résolue",
    },
    {
      id: "errors",
      label: "Erreurs récentes",
      level:
        inputs.recentErrorCount === 0
          ? "ok"
          : inputs.recentErrorCount > 5
            ? "error"
            : "warn",
      detail:
        inputs.recentErrorCount === 0
          ? "aucune erreur depuis le démarrage"
          : `${inputs.recentErrorCount} erreur(s) — dernière : ${
              inputs.lastErrorMessage ?? "inconnue"
            }${inputs.lastErrorAt ? ` (${inputs.lastErrorAt})` : ""}`,
    },
  ];

  return {
    generatedAt,
    overall: worstLevel(checks.map((c) => c.level)),
    checks,
  };
}

/** Collecte les entrées réelles de l'environnement courant. */
export function collectHealthInputs(online: boolean): HealthInputs {
  const errors = getRecentErrors();
  const last = errors[0];
  return {
    appVersion: (import.meta.env.VITE_APP_VERSION as string | undefined) ?? "",
    platform: Capacitor.getPlatform?.() ?? "web",
    online,
    syncReady: isPowerSyncReadyNow(),
    hasOrg: hasResolvedOrganization(),
    orgId: getOrganizationId(),
    recentErrorCount: errors.length,
    lastErrorMessage: last?.message,
    lastErrorAt: last ? new Date().toISOString() : undefined,
  };
}

/**
 * Construit un rapport de diagnostic **copiable** (Phase 11, « Signaler un
 * problème »). Pur et sans PII : mêmes champs que le rapport santé, plus les
 * dernières erreurs **déjà expurgées** par `clientErrors.redact`. Utilisé par
 * le bouton « Copier le diagnostic » de la page Santé.
 */
export function buildDiagnosticReport(
  inputs: HealthInputs,
  errors: readonly { message: string; stack?: string }[],
  generatedAt: string,
): string {
  const lines: string[] = [
    "— Diagnostic Lumina —",
    `Généré : ${generatedAt}`,
    `Version : ${inputs.appVersion || "inconnue"}`,
    `Plateforme : ${inputs.platform}`,
    `Réseau : ${inputs.online ? "en ligne" : "hors ligne"}`,
    `Sync PowerSync : ${inputs.syncReady ? "connectée" : "en attente"}`,
    `Organisation : ${inputs.hasOrg ? inputs.orgId : "aucune"}`,
    `Erreurs récentes : ${errors.length}`,
  ];
  errors.slice(0, 5).forEach((e, i) => {
    // `e.message` provient d'une erreur runtime, donc indirectement de
    // données/entrées hostiles : on retire les caractères de contrôle (dont
    // les séquences ANSI ESC) et on plafonne, pour que le texte collé dans un
    // rapport de bug reste du texte inerte et borné.
    lines.push(`  ${i + 1}. ${normalizeText(e.message, { maxLength: 500 })}`);
  });
  return lines.join("\n");
}

/** Hook React : rapport santé, rafraîchi toutes les `intervalMs`. */
export function useHealthSnapshot(intervalMs = 5000): HealthReport {
  const [online, setOnline] = useState(
    typeof navigator === "undefined" ? true : navigator.onLine,
  );

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  const [report, setReport] = useState<HealthReport>(() =>
    buildHealthReport(collectHealthInputs(online), new Date().toISOString()),
  );

  useEffect(() => {
    const tick = () =>
      setReport(
        buildHealthReport(collectHealthInputs(online), new Date().toISOString()),
      );
    tick();
    const id = setInterval(tick, intervalMs);
    return () => clearInterval(id);
  }, [online, intervalMs]);

  return report;
}
