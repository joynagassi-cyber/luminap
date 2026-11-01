/**
 * Politique de résilience pour l'auth cloud (GoTrue) — module PUR (aucune
 * dépendance à Cypress) pour être testable hors-ligne en vitest.
 *
 * ## Pourquoi
 *
 * Les specs « cloud-auth » (`loginOrgAccount()` / `ensureAuth()`) frappent le
 * projet Supabase PARTAGÉ (GoTrue) avec un compte unique de test. Mesuré sur
 * le run CI 41282690879 : pendant la fenêtre de run, GoTrue a renvoyé des
 * centaines de `400 Invalid login credentials` (compte non provisionné /
 * mot de passe divergent) + des `500` transitoires (« context canceled »,
 * « unexpected EOF ») + deux `422 User already registered` (course entre les
 * 2 conteneurs CI qui re-signup le même compte). Résultat : le POST login ne
 * « complete » jamais et le `should('/onboarding'|'/dashboard')` time out à
 * 90 s — un échec d'INFRA, pas une régression produit.
 *
 * ## Règle
 *
 *  - Un échec d'auth AUTHENTIQUE (identifiants invalides, compte inconnu)
 *    n'est JAMAIS retenté ni skippé : c'est un vrai défaut (produit ou
 *    provisionnement du compte) qui doit rester visible.
 *  - Une erreur TRANSITOIRE (429 rate-limit, 5xx, POST en vol) est retentée
 *    avec un budget BORNÉ et un backoff exponentiel ; épuisé, elle peut
 *    skipper (pending) — uniquement si l'appelant l'autorise explicitement
 *    (`allowSkip`), jamais en silence.
 */

/** Budget de retry borné (jamais de retry infini). */
export const AUTH_RETRY = {
  /** Nombre TOTAL de tentatives (1 essai + 2 retries). */
  maxAttempts: 3,
  /** Fenêtre d'attente par tentative : la nav OU une bannière doit arriver. */
  perAttemptMs: 20_000,
  /** Backoff : 1,5 s, puis 3 s (plafonné à 8 s). */
  baseDelayMs: 1_500,
  maxDelayMs: 8_000,
} as const;

export type AuthOutcomeKind =
  | 'success'
  | 'transient' // 429/5xx/408 ou POST encore en vol → retentable
  | 'invalid-credentials' // échec d'auth authentique → jamais retenté
  | 'already-registered' // signup d'un compte existant (course CI)
  | 'pending'; // pas encore de réponse (le POST est en vol)

/**
 * Classe une bannière d'erreur affichée sur `/auth`. Les libellés sont ceux
 * produits par `src/lib/auth.ts` (mapping Supabase → message utilisateur).
 */
export function classifyAuthBanner(text: string): AuthOutcomeKind {
  const t = (text || '').toLowerCase();
  if (!t) return 'pending';
  // Transitoire : rate limit GoTrue / indisponibilité partagée.
  if (
    /too many|rate limit|429|503|service unavailable|temporar|try again|unavailable|timeout|timed out|network|connexion/i.test(
      t,
    )
  ) {
    return 'transient';
  }
  // Compte déjà inscrit (course entre les 2 conteneurs CI).
  if (/already (exists|registered)|déjà (existe|inscrit)/i.test(t)) {
    return 'already-registered';
  }
  // Échec d'auth AUTHENTIQUE : on ne retente pas, on ne skippe pas.
  if (
    /invalid email or password|invalid login|identifiants|no account|not found|confirm your email|mot de passe|password must/i.test(
      t,
    )
  ) {
    return 'invalid-credentials';
  }
  return 'pending';
}

/**
 * Classe une tentative à partir du STATUT HTTP capturé (intercept du POST
 * `grant_type=password`) et de la bannière DOM. Le statut prime : c'est la
 * source de vérité la plus fiable (429/503 explicites).
 */
export function classifyAuthAttempt(
  status: number,
  banner: string,
): AuthOutcomeKind {
  if (status === 429 || status === 408 || status >= 500) return 'transient';
  const fromBanner = classifyAuthBanner(banner);
  if (fromBanner !== 'pending') return fromBanner;
  // 400/401/403/422 sans bannière reconnue = identifiants refusés.
  if (status >= 400 && status < 500) return 'invalid-credentials';
  return 'pending'; // status 0 : aucune réponse encore reçue
}

/** `true` si l'issue justifie une nouvelle tentative. */
export function isRetryable(kind: AuthOutcomeKind): boolean {
  return kind === 'transient' || kind === 'pending';
}

/** Délai (ms) avant la tentative `attempt` (1-indexé), backoff exponentiel. */
export function cloudBackoffDelayMs(attempt: number): number {
  const raw = AUTH_RETRY.baseDelayMs * 2 ** Math.max(0, attempt - 1);
  return Math.min(raw, AUTH_RETRY.maxDelayMs);
}

/**
 * `true` si, budget épuisé, on a le DROIT de skipper : uniquement pour une
 * cause INFRA (transitoire, ou aucune bannière = POST jamais revenu). Une
 * bannière non reconnue ⇒ on échoue (jamais de skip silencieux).
 */
export function maySkipAfterBudget(
  kind: AuthOutcomeKind,
  lastBanner: string,
): boolean {
  if (kind === 'transient') return true;
  if (kind === 'pending') return (lastBanner || '').trim() === '';
  return false;
}

/** Message de skip (pending) — explicite sur la cause infra. */
export function cloudSkipReason(label: string, attempts: number): string {
  return (
    `[cloud-auth] ${label}: GoTrue/Postgres partagé indisponible après ` +
    `${attempts} tentative(s) (429/5xx — cf. logs Supabase). Spec marquée ` +
    `PENDING : la cause est infra, pas produit. Les specs offline ` +
    `(interceptCloud + seedLocalSession) restent le gate déterministe.`
  );
}

/** Message d'échec diagnostic (échec d'auth authentique, jamais skippé). */
export function cloudFailureMessage(
  label: string,
  kind: AuthOutcomeKind,
  banner: string,
  status: number,
): string {
  return (
    `[cloud-auth] ${label}: échec d'auth AUTHENTIQUE (kind=${kind}, ` +
    `status=${status || 'n/a'}) — bannière « ${banner || '(vide)'} ». ` +
    `Ce n'est PAS un flake infra : vérifier le provisionnement du compte ` +
    `partagé (CYPRESS_ORG_EMAIL/_PASSWORD) ou le mot de passe.`
  );
}
