/**
 * Fil d'Ariane (breadcrumbs) — contexte d'exécution des dernières actions.
 *
 * Objectif : quand une erreur est capturée, savoir CE QUE FAISAIT l'utilisateur
 * juste avant (navigation, clic, appel réseau). Sans cela un rapport d'erreur
 * se limite à une stack trace, souvent insuffisante pour reproduire un bug de
 * logique métier (échec de formulaire, conflit de synchronisation).
 *
 * Politique (identique à `clientErrors.ts`) : SANS PII. Toute donnée libre est
 * expurgée (`redact` : e-mails, jetons, téléphones) puis neutralisée
 * (`normalizeText` : caractères de contrôle, longueur). Le tampon est BORNÉ
 * (ring buffer) et vit en mémoire — jamais persisté.
 */
import { redact } from "@/lib/clientErrors";
import { normalizeText } from "@/lib/sanitize";

/** Catégories d'action tracées (vocabulaire fermé et stable). */
export type BreadcrumbCategory =
  | "navigation"
  | "ui"
  | "network"
  | "sync"
  | "auth"
  | "system";

export interface Breadcrumb {
  /** Horodatage epoch (ms). */
  at: number;
  category: BreadcrumbCategory;
  /** Message court, expurgé (ex. « clic sur bouton-enregistrer »). */
  message: string;
  /** Données structurées optionnelles (primitives uniquement), expurgées. */
  data?: Record<string, string>;
}

/** Nombre maximal d'actions conservées (ring buffer borné). */
export const MAX_BREADCRUMBS = 50;

const MAX_MESSAGE_LENGTH = 200;
const MAX_VALUE_LENGTH = 120;
const MAX_DATA_KEYS = 12;

const buffer: Breadcrumb[] = [];

/** Expurge un message court (PII + caractères de contrôle). */
function sanitizeMessage(value: unknown): string {
  return normalizeText(redact(String(value ?? "")), {
    maxLength: MAX_MESSAGE_LENGTH,
    collapseWhitespace: true,
  });
}

/** Expurge une carte de données structurées (primitives uniquement). */
function sanitizeData(
  data: Record<string, unknown> | undefined,
): Record<string, string> | undefined {
  if (!data) return undefined;
  const out: Record<string, string> = {};
  let keys = 0;
  for (const [key, value] of Object.entries(data)) {
    if (keys >= MAX_DATA_KEYS) break;
    if (value === null || value === undefined) continue;
    if (typeof value === "object") continue; // primitives uniquement
    out[sanitizeMessage(key)] = normalizeText(redact(String(value)), {
      maxLength: MAX_VALUE_LENGTH,
      collapseWhitespace: true,
    });
    keys += 1;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

/**
 * Ajoute une action au fil d'Ariane. Le plus ancien est évincé au-delà de
 * `MAX_BREADCRUMBS`. Ne lève JAMAIS : un échec de journalisation ne doit pas
 * perturber le flux appelant.
 */
export function pushBreadcrumb(
  category: BreadcrumbCategory,
  message: string,
  data?: Record<string, unknown>,
): void {
  try {
    buffer.push({
      at: Date.now(),
      category,
      message: sanitizeMessage(message),
      data: sanitizeData(data),
    });
    if (buffer.length > MAX_BREADCRUMBS) {
      buffer.splice(0, buffer.length - MAX_BREADCRUMBS);
    }
  } catch {
    /* jamais propager une erreur de journalisation */
  }
}

/** Les `limit` dernières actions (de la plus ancienne à la plus récente). */
export function getBreadcrumbs(limit = MAX_BREADCRUMBS): Breadcrumb[] {
  const n = Math.max(0, Math.min(limit, buffer.length));
  return buffer.slice(buffer.length - n);
}

/** Test helper — vide le fil d'Ariane. */
export function clearBreadcrumbs(): void {
  buffer.length = 0;
}

/** Extrait une description courte et sûre d'un élément DOM cliqué. */
function describeElement(el: Element | null): string {
  if (!el) return "inconnu";
  const testId = el.getAttribute?.("data-testid");
  if (testId) return testId;
  const aria = el.getAttribute?.("aria-label");
  if (aria) return aria;
  const id = el.getAttribute?.("id");
  if (id) return id;
  const text = (el.textContent ?? "").trim();
  if (text) return text.slice(0, 40);
  return el.tagName?.toLowerCase() ?? "inconnu";
}

/** Chemin court et sans PII d'une URL (hôte masqué, chemin + recherche). */
function safeUrl(raw: string): string {
  try {
    const url = new URL(raw, "http://local");
    return `${url.pathname}${url.search}`.slice(0, MAX_VALUE_LENGTH);
  } catch {
    return normalizeText(redact(raw), { maxLength: MAX_VALUE_LENGTH });
  }
}

/**
 * Branche la capture automatique du fil d'Ariane : clics, navigations,
 * transitions réseau, et appels `fetch` (méthode + statut, jamais le corps).
 * Idempotent — un second appel est sans effet. Renvoie une fonction de
 * désinstallation (tests).
 */
export function installBreadcrumbCapture(): () => void {
  if (typeof window === "undefined") return () => {};

  const onClick = (event: MouseEvent) => {
    const target = event.target as Element | null;
    const el = target?.closest?.(
      "[data-testid],button,a,[role='button'],input,select,textarea",
    );
    if (!el) return;
    pushBreadcrumb("ui", `clic sur ${describeElement(el)}`, {
      tag: el.tagName?.toLowerCase(),
    });
  };

  const onPopState = () => {
    pushBreadcrumb("navigation", `navigation vers ${safeUrl(window.location.href)}`);
  };

  const onOnline = () => pushBreadcrumb("network", "connexion rétablie (online)");
  const onOffline = () =>
    pushBreadcrumb("network", "perte de connexion (offline)");

  window.addEventListener("click", onClick, { capture: true });
  window.addEventListener("popstate", onPopState);
  window.addEventListener("online", onOnline);
  window.addEventListener("offline", onOffline);

  // Appels réseau : on journalise l'échec (statut ≥ 400 ou rejet), sans jamais
  // lire le corps de la réponse (coût + PII). Le `fetch` d'origine est préservé.
  // Absent (SSR, environnements non-Web) → pas de surveillance réseau.
  const originalFetch = window.fetch;
  let wrappedFetch: typeof window.fetch | null = null;
  if (typeof originalFetch === "function") {
    wrappedFetch = async (input, init) => {
      const method = (
        init?.method ??
        (typeof input === "object" && input && "method" in input
          ? (input as Request).method
          : "GET")
      ).toUpperCase();
      const url = typeof input === "string" ? input : (input as Request)?.url ?? "";
      try {
        const response = await originalFetch(input, init);
        if (!response.ok) {
          pushBreadcrumb("network", `${method} ${safeUrl(url)} → ${response.status}`, {
            status: String(response.status),
          });
        }
        return response;
      } catch (err) {
        pushBreadcrumb("network", `${method} ${safeUrl(url)} → échec réseau`, {
          error: (err as Error)?.message,
        });
        throw err;
      }
    };
    window.fetch = wrappedFetch;
  }

  return () => {
    window.removeEventListener("click", onClick, { capture: true });
    window.removeEventListener("popstate", onPopState);
    window.removeEventListener("online", onOnline);
    window.removeEventListener("offline", onOffline);
    if (wrappedFetch && window.fetch === wrappedFetch) window.fetch = originalFetch;
  };
}
