/**
 * Persistance inter-spec des credentials du compte d'organisation UNIQUE
 * du run (pattern `signupOrgAccount` → `loginOrgAccount`).
 *
 * ## Canal retenu : `Cypress.expose(key, value)`
 *
 * Cypress 16 expose (documenté) `Cypress.expose(key, value)` :
 *   « Set value for an exposed public configuration variable.
 *     Any value you change will be permanently changed for the
 *     remainder of your tests. »
 *
 * C'est le canal de persistance inter-spec officiel :
 *   - Écriture : le 1er spec (`signupOrgAccount`) appelle
 *     `setOrgCreds()` qui pousse les credentials dans le
 *     store `expose` de Cypress (Node-side, partagé par tous
 *     les specs du run).
 *   - Lecture : chaque spec suivant (`loginOrgAccount`) appelle
 *     `getOrgCreds()` qui relit ce même store ; le cache in-mem
 *     évite le round-trip quand le 1er spec a tourné dans la
 *     même session.
 *
 * Pour qu'un clé soit lisible via `Cypress.expose(key)`, elle doit
 * être pré-déclarée dans le bloc `expose` de `cypress.config.ts`
 * (cf. `expose: { ... orgCreds: null }` là-bas). Le 1er spec
 * l'écrit ensuite via `Cypress.expose('orgCreds', {...})`.
 *
 * ## Limite (documentée)
 *
 * Persistance PAR RUN : chaque `cypress run` démarre avec le
 * store `expose` initial (celui de cypress.config.ts). Le 1er
 * spec du run est TOUJOURS `auth-real.cy.ts` (il pose le compte
 * partagé) ; si on lance un sous-ensemble de specs qui n'inclut
 * pas le spec d'auth, `loginOrgAccount()` échoue avec un message
 * clair plutôt que de re-signup silencieusement.
 *
 * Pour un compte partagé INTER-run, on déclare `orgCreds` dans
 * le bloc `expose` de cypress.config.ts (ou une source `.env`)
 * — `getOrgCreds()` le lit alors au boot sans tourner le 1er spec.
 */

export interface OrgCreds {
  email: string;
  password: string;
}

/** Cache in-mem (même session) — évite le round-trip expose(). */
let _cache: OrgCreds | null = null;

function _isCreds(v: unknown): v is OrgCreds {
  return (
    !!v &&
    typeof v === 'object' &&
    typeof (v as OrgCreds).email === 'string' &&
    typeof (v as OrgCreds).password === 'string' &&
    (v as OrgCreds).email !== '' &&
    (v as OrgCreds).password !== ''
  );
}

/**
 * Lit les credentials du compte d'organisation unique du run.
 *
 * Ordre de résolution :
 *   1. cache in-mem (le 1er spec a tourné dans cette session) ;
 *   2. `Cypress.expose('orgCreds')` (le store exposé, pré-déclaré
 *      dans cypress.config.ts et/ou écrit par le 1er spec) ;
 *   3. `undefined` (le compte n'a pas encore été posé).
 */
export function getOrgCreds(): OrgCreds | undefined {
  if (_cache) return _cache;

  try {
    const raw = Cypress.expose('orgCreds');
    if (_isCreds(raw)) {
      _cache = raw;
      return raw;
    }
  } catch {
    /* store expose non initialisé (spec lancé hors contexte Cypress) */
  }
  return undefined;
}

/**
 * Écrit les credentials du 1er spec dans le store exposé de Cypress
 * (survit à tout le reste du run) + le cache in-mem.
 */
export function setOrgCreds(creds: OrgCreds): void {
  _cache = creds;
  try {
    // Cypress.expose(key, value) — setter documenté de Cypress 16 :
    // « Any value you change will be permanently changed for the
    // remainder of your tests ».
    Cypress.expose('orgCreds', creds);
  } catch {
    /* context Node indisponible — le cache in-mem porte la valeur
       pour le reste de la session (comportement dégradable). */
  }
}

/**
 * Efface les credentials (fin de run / reinit). Le prochain run
 * re-signupera via le 1er spec.
 */
export function clearOrgCreds(): void {
  _cache = null;
  try {
    Cypress.expose('orgCreds', undefined as unknown as OrgCreds);
  } catch {
    /* no-op */
  }
}
