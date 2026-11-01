/**
 * Helpers Cypress pour l'auth cloud — construits sur `authRetryPolicy.ts`
 * (module pur, testé en vitest).
 *
 * Ils ajoutent à la politique PURE ce qui ne peut exister qu'en contexte
 * Cypress :
 *   - la lecture de la bannière d'erreur affichée sur `/auth` (DOM) ;
 *   - un poller NON-échouant (nav OU bannière), pour ne pas payer le
 *     `defaultCommandTimeout` à chaque tentative ;
 *   - le skip Mocha (pending) — vérifié : `this.skip()` fonctionne depuis un
 *     hook, un spec, une commande custom, et DANS un setup `cy.session()`.
 */
import {
  AUTH_RETRY,
  classifyAuthAttempt,
  cloudBackoffDelayMs,
  cloudFailureMessage,
  cloudSkipReason,
  isRetryable,
  maySkipAfterBudget,
  type AuthOutcomeKind,
} from './authRetryPolicy';

export interface AuthAttemptResult {
  /** `true` si l'app a quitté /auth (login accepté). */
  navigated: boolean;
  /** Statut HTTP du POST login (0 = pas de réponse). */
  status: number;
  /** Texte de la bannière d'erreur affichée sur /auth ('' si aucune). */
  banner: string;
  kind: AuthOutcomeKind;
}

/**
 * Lit la bannière d'erreur de l'AuthPage. Elle est rendue dans un `<div>`
 * stylé (`backgroundColor` = `color-mix(… var(--data-expense) …)`) sans
 * `role`/`aria` — on scanne donc les `div` dont le texte matche les messages
 * connus de `src/lib/auth.ts`.
 */
function readAuthErrorBanner(win: Window): string {
  const patterns =
    /(invalid email or password|too many|already|no account|confirm your email|password must|déjà|identifiants|connexion)/i;
  const divs = Array.from(win.document.querySelectorAll('div'));
  for (const el of divs) {
    if (el.children.length > 0) continue; // feuille uniquement
    const text = (el.textContent || '').trim();
    if (text.length > 0 && text.length < 200 && patterns.test(text)) {
      return text;
    }
  }
  return '';
}

/** Récupère `[pathname, statusDuPost, bannière]` depuis la fenêtre courante. */
function readAttempt(
  win: Window,
  statusRef: { status: number },
): AuthAttemptResult {
  const path = win.location.pathname;
  const banner = readAuthErrorBanner(win);
  const navigated = path !== '/auth';
  const kind: AuthOutcomeKind = navigated
    ? 'success'
    : classifyAuthAttempt(statusRef.status, banner);
  return { navigated, status: statusRef.status, banner, kind };
}

/**
 * Attend, SANS échouer, que la tentative aboutisse : soit la nav quitte
 * `/auth`, soit une bannière apparaît. Renvoie l'état observé.
 *
 * `statusRef` est muté par l'intercept installé par l'appelant (statut du
 * POST `grant_type=password`).
 */
export function waitForAuthAttempt(
  statusRef: { status: number },
  timeoutMs: number,
): Cypress.Chainable<AuthAttemptResult> {
  const start = Date.now();
  const poll = (): Cypress.Chainable<AuthAttemptResult> => {
    return cy.window({ log: false }).then((win) => {
      const result = readAttempt(win, statusRef);
      if (result.navigated || result.kind !== 'pending') {
        return cy.wrap(result, { log: false });
      }
      if (Date.now() - start >= timeoutMs) {
        return cy.wrap(result, { log: false });
      }
      // `cy.wait` court (borné) : rend l'event-loop, évite un polling
      // synchrone serré. La récursion conserve le type Chainable.
      return cy.wait(150, { log: false }).then(poll);
    }) as unknown as Cypress.Chainable<AuthAttemptResult>;
  };
  return poll();
}

export interface CloudRetryOptions {
  /** Nom lisible pour les logs (ex. 'loginOrgAccount'). */
  label: string;
  /** Corps d'une tentative : remplit le formulaire et clique « Se connecter ». */
  attempt: () => void;
  /** Statut HTTP partagé, rempli par l'intercept POST login. */
  statusRef: { status: number };
  /** Autorisé à marquer la spec PENDING (pending) si le budget est épuisé. */
  allowSkip?: boolean;
  /** Contexte Mocha courant (pour `skip()`), requis par `runWithAuthRetry`. */
  ctx?: Mocha.Context;
}

/**
 * Boucle bornée, NON-ÉCHOUANTE : jusqu'à `AUTH_RETRY.maxAttempts` tentatives,
 * avec backoff exponentiel entre les TRANSITOIRES. Renvoie l'issue finale
 * (naviguée ou non) SANS lever ni skipper — l'appelant décide.
 */
export function attemptAuthWithRetry(
  opts: CloudRetryOptions,
): Cypress.Chainable<AuthAttemptResult> {
  const { label, attempt, statusRef } = opts;

  const oneAttempt = (n: number): Cypress.Chainable<AuthAttemptResult> => {
    statusRef.status = 0;
    attempt();
    return waitForAuthAttempt(statusRef, AUTH_RETRY.perAttemptMs).then(
      (result): Cypress.Chainable<AuthAttemptResult> => {
        if (result.navigated) return cy.wrap(result, { log: false });

        const retryable = isRetryable(result.kind);
        const hasBudget = n < AUTH_RETRY.maxAttempts;

        if (retryable && hasBudget) {
          const delay = cloudBackoffDelayMs(n);
          cy.log(
            `${label}: tentative ${n}/${AUTH_RETRY.maxAttempts} — ` +
              `${result.kind}${result.status ? ` (HTTP ${result.status})` : ''}` +
              ` → nouvel essai dans ${delay} ms`,
          );
          // Reset du formulaire avant de réessayer (le submit précédent a pu
          // laisser le bouton en état « loading »).
          cy.reload();
          return cy
            .wait(delay, { log: false })
            .then(() => oneAttempt(n + 1));
        }
        return cy.wrap(result, { log: false });
      },
    );
  };

  return oneAttempt(1);
}

/**
 * Enveloppe échouante/skippante de `attemptAuthWithRetry` :
 *   - nav réussie → renvoie l'issue ;
 *   - TRANSITOIRE après budget + `allowSkip` + cause infra → `ctx.skip()`
 *     (spec PENDING, jamais un échec rouge) ;
 *   - sinon → `throw` avec un message diagnostic (échec d'auth authentique
 *     jamais skippé, budget épuisé sans skip, bannière inconnue).
 */
export function runWithAuthRetry(
  opts: CloudRetryOptions & { ctx: Mocha.Context },
): Cypress.Chainable<AuthAttemptResult> {
  const { label, allowSkip, ctx } = opts;
  return attemptAuthWithRetry(opts).then((result) => {
    if (result.navigated) return result;

    if (isRetryable(result.kind)) {
      // Budget épuisé sur une cause INFRA.
      if (allowSkip && maySkipAfterBudget(result.kind, result.banner)) {
        cy.log(cloudSkipReason(label, AUTH_RETRY.maxAttempts));
        // Marque la spec PENDING (pending) — vérifié comme fonctionnel
        // depuis un hook, un spec, une commande custom et un cy.session().
        ctx.skip();
        return result;
      }
      throw new Error(
        `${label}: budget de retry épuisé (${AUTH_RETRY.maxAttempts}) ` +
          `sur une erreur infra (kind=${result.kind}` +
          `${result.status ? `, HTTP ${result.status}` : ''}) — ` +
          `allowSkip=${Boolean(allowSkip)}.`,
      );
    }

    // Échec AUTHENTIQUE : jamais retenté, jamais skippé.
    throw new Error(
      cloudFailureMessage(label, result.kind, result.banner, result.status),
    );
  });
}
