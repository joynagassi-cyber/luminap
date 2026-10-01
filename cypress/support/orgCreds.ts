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

/**
 * Identité de test UNIQUE (source de vérité : env vars).
 *
 * Le user l'a demandé : un seul compte d'organisation, réutilisé à chaque
 * run — jamais un fresh signup `org.<ts>@lumina.dev`. Cet identifiant est
 * déclaré une fois (CYPRESS_ORG_EMAIL / CYPRESS_ORG_PASSWORD dans
 * cypress/run.sh ou l'environnement de l'agent) et lu ici : le 1er spec
 * du run fait le sign-up COMPLET par l'UI (wizard onboarding + création
 * réelle de l'org) si le compte n'existe pas encore ; les runs suivants
 * login directement (l'org est déjà créée, onboarding complété en base).
 */
export interface OrgCredentials {
  /** Email fixe du compte d'organisation de test (jamais d'identifiant éphémère). */
  email: string;
  /** Mot de passe fixe (déclaré par l'agent, exposé via cypress.config.ts). */
  password: string;
  /** Nom de l'organisation créée par le wizard (stable entre runs). */
  orgName: string;
  /** Type d'organisation du wizard. */
  orgType: 'Église' | 'École' | 'Entreprise';
  /** Rôle choisi au wizard (PASTEUR_PRINCIPAL couvre les permissions de test). */
  role: string;
}

export interface OrgCreds {
  email: string;
  password: string;
}

/** Identité par défaut — override par CYPRESS_ORG_* dans cypress.config.ts. */
const DEFAULT_ORG: OrgCredentials = {
  email: 'lumina-org-e2e@lumina.dev',
  password: 'E2e-Lumina!1',
  orgName: 'Lumina E2E',
  orgType: 'Église',
  role: 'PASTEUR_PRINCIPAL',
};

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
 * Identité fixe du run, assemblée depuis les clés `expose` de
 * cypress.config.ts (CYPRESS_ORG_EMAIL / CYPRESS_ORG_PASSWORD) avec les
 * valeurs par défaut de l'identifiant unique de test. C'est la source
 * unique de vérité — aucun échantillon ne génère un email aléatoire.
 */
export function getOrgCredentials(): OrgCredentials {
  let email = DEFAULT_ORG.email;
  let password = DEFAULT_ORG.password;
  try {
    const e = Cypress.expose('ORG_EMAIL');
    const p = Cypress.expose('ORG_PASSWORD');
    if (typeof e === 'string' && e.trim() !== '') email = e.trim();
    if (typeof p === 'string' && p.trim() !== '') password = p.trim();
  } catch {
    /* context Node indisponible — valeurs par défaut */
  }
  return { ...DEFAULT_ORG, email, password };
}

/**
 * Lit les credentials du compte d'organisation unique du run.
 *
 * Ordre de résolution :
 *   1. cache in-mem (le 1er spec a tourné dans cette session) ;
 *   2. `Cypress.expose('orgCreds')` (le store exposé, pré-déclaré
 *      dans cypress.config.ts et/ou écrit par le 1er spec) ;
 *   3. l'identifiant FIXE (getOrgCredentials()) — la boucle de secours :
 *      le compte est connu, pas besoin que le 1er spec ait tourné.
 */
export function getOrgCreds(): OrgCreds {
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
  const fixed = getOrgCredentials();
  _cache = { email: fixed.email, password: fixed.password };
  return _cache;
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
