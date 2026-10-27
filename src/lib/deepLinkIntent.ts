/**
 * Deep-link intent — « ce lien vise l'organisation X ».
 *
 * PM2 : `resolveRoute` sait produire `org-switch-required` quand un deep link
 * porte une organisation différente de l'active, mais `linkOrgId` n'était
 * JAMAIS alimenté → la branche était morte et un lien `?org=B` s'ouvrait sur
 * l'organisation A (ou sur des listes vides si A n'a rien).
 *
 * Ce module porte l'intention le temps de la navigation : `useAppUrlOpen`
 * l'écrit, `RouteGuard` la lit, la confirmation la consomme. Persistée en
 * `sessionStorage` pour survivre à la redirection du routeur (la navigation
 * change d'URL sans repasser par le listener natif).
 */
export interface DeepLinkOrgIntent {
  orgId: string;
  /** Chemin interne visé par le lien (déjà validé par `parseDeepLink`). */
  path: string;
}

const KEY = "lumina-deeplink-org-intent";

let _pending: DeepLinkOrgIntent | null = null;

function persist(intent: DeepLinkOrgIntent | null): void {
  try {
    if (intent) sessionStorage.setItem(KEY, JSON.stringify(intent));
    else sessionStorage.removeItem(KEY);
  } catch {
    /* stockage indisponible (SSR / test) — l'état mémoire suffit */
  }
}

function restore(): DeepLinkOrgIntent | null {
  if (_pending) return _pending;
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DeepLinkOrgIntent;
    if (parsed?.orgId && parsed?.path) {
      _pending = parsed;
      return parsed;
    }
  } catch {
    /* malformed — ignore */
  }
  return null;
}

/** Mémorise l'organisation visée par un deep link. */
export function setDeepLinkOrgIntent(intent: DeepLinkOrgIntent): void {
  _pending = intent;
  persist(intent);
}

/** Lit l'intention courante (mémoire puis sessionStorage). */
export function getDeepLinkOrgIntent(): DeepLinkOrgIntent | null {
  return restore();
}

/** Efface l'intention (après confirmation, refus, ou navigation aboutie). */
export function clearDeepLinkOrgIntent(): void {
  _pending = null;
  persist(null);
}
