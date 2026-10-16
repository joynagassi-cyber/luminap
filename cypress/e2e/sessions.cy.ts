/**
 * Cypress E2E — Session persistence (« Mes comptes »)
 *
 * Le flux exact demandé : après déconnexion, le hub /sessions liste le
 * compte actif de l'organisation ; l'utilisateur clique dessus et est
 * re-s'authentifié SANS retaper ses identifiants (le refresh token est
 * restauré depuis localStorage, voir `handleEnter` de Sessions.tsx).
 *
 * Le spec utilise le compte d'organisation UNIQUE du run (créé par
 * cy.signupOrgAccount() dans le spec d'auth) via cy.loginOrgAccount().
 */

describe('Lumina — Session persistence (Mes comptes, reconnect sans retaper)', () => {
  // ── Diagnostic : capture du localStorage + des traces produit émises
  //    dans la console de l'app, imprimées dans le terminal Cypress.
  //    Mécanisme : un spy sur console (installé après chaque cy.visit)
  //    pousse les lignes qui match nos marqueurs dans (win).__diag ;
  //    dumpDiag() les relit et les repousse dans le terminal Cypress via
  //    console.info (Cypress capture les console du context Node).
  const dumpDiag = (win: Window) => {
    const cap = ((win as any).__diag as string[]) ?? [];
    const flags = Object.keys(win.localStorage)
      .map((k) => {
        const v = win.localStorage.getItem(k);
        return v && v.length > 120 ? `${k}=${v.slice(0, 80)}…` : `${k}=${v}`;
      })
      .join(' ');
    console.info(`[sessions-diag] flags: ${flags}`);
    for (const c of cap) console.info(`[sessions-diag] ${c}`);
    (win as any).__diag = [];
  };
  const installSpy = (win: Window) => {
    (win as any).__diag = [];
    for (const lvl of ['info', 'warn', 'error', 'log'] as const) {
      const orig = win.console[lvl];
      win.console[lvl] = (...args: unknown[]) => {
        const s = args
          .map((a) => (typeof a === 'string' ? a : JSON.stringify(a)))
          .join(' ');
        if (/loginOrgAccount|org\] refetch|auth\] hydrateProfile|dataLayer|listUserOrgs|sessions-diag/.test(s)) {
          ((win as any).__diag as string[]).push(`[${lvl}] ${s}`);
        }
        orig.apply(win.console, args);
      };
    }
  };

  before(function () {
    this.timeout(90_000);
    cy.loginOrgAccount();
  });

  it('logout → /sessions shows the active account → click reconnects without re-login', function () {
    this.timeout(120_000);

    // ── 1. Se déconnecter depuis le hub /sessions ────────────────────
    cy.visit('/sessions');
    cy.window().then(installSpy);
    cy.get('button[aria-label^="Re-ouvrir"]').should('exist');
    cy.contains('Actif').should('be.visible');
    cy.window().then((win) => dumpDiag(win));

    cy.contains('button', 'Se déconnecter').click();
    // Le sign-out navigue vers /auth (la session Supabase est effacée,
    // mais les comptes restent listés dans /sessions — localStorage
    // lumina-removed-accounts / my-orgs persistent côté client).
    cy.location('pathname', { timeout: 60_000 }).should('eq', '/auth');

    // ── 2. Retourner au hub /sessions (route publique) ──────────────
    cy.visit('/sessions');
    cy.window().then(installSpy);
    cy.get('button[aria-label^="Re-ouvrir"]').should('exist');
    cy.window().then((win) => dumpDiag(win));

    // ── 3. Cliquer sur le compte : reconnexion SANS retaper ────────
    // `handleEnter` re-hydrate la session Supabase depuis le token
    // local (refresh token), puis entre dans le contexte org. On ne
    // retape AUCUN identifiant : le test échoue si /auth réapparaît.
    cy.get('button[aria-label^="Re-ouvrir"]').first().click();
    cy.location('pathname', { timeout: 90_000 })
      .should('eq', '/dashboard')
      .then(() => {
        cy.window().then((win) => {
          const sbKey = Object.keys(win.localStorage).find((k) => /-auth-token$/.test(k));
          expect(sbKey, 'token Supabase re-persisté après reconnexion').to.be.a('string');
          const raw = JSON.parse(win.localStorage.getItem(sbKey!) || 'null');
          expect(raw?.access_token, 'access_token présent').to.be.a('string');
        });
      });
  });

  it('le bouton « Retirer » d’une carte cible bien cette org-là (bug list[0] corrigé)', function () {
    this.timeout(90_000);

    // Reconnecté au dashboard par le test précédent. Chaque carte
    // porte maintenant son propre bouton « Retirer » avec l’aria-label
    // exact de son compte visuel — le bouton global list[0] a été
    // retiré. On vérifie que le bouton « Retirer » de la 1re carte
    // cible bien LA org visuellement associée, sans appuyer (le run
    // doit garder son compte unique pour les specs suivants).
    cy.visit('/sessions');
    cy.get('button[aria-label^="Re-ouvrir"]').first().then((btn) => {
      const rawLabel = (btn.attr('aria-label') || '').replace('Re-ouvrir ', '');
      // Le bouton « Retirer » associé porte l’aria-label exact du même org.
      cy.get(`button[aria-label="Retirer ${rawLabel} de la liste"]`).should('be.visible');
    });
  });

  // ── PERSISTANCE DE LA SESSION (complément de la demande utilisateur) ────
  // La demande : « vérifier que la session est bien enregistrée en local
  // et accessible pour se connecter, permettant ainsi d’utiliser
  // plusieurs organisations différentes avec des comptes différents ;
  // que la persistance de la connexion tient ; que quand on sort de
  // l’app on revienne exactement où on s’était ; que l’utilisateur ne
  // se déconnecte pas à chaque fois qu’il sort de l’app ».
  //
  // Ce qui est testé ici (le 1er it de ce spec, lignes 53-89, a déjà
  // vérifié la ré-ouverture du compte après déconnexion depuis /sessions) :
  //   1. La session (token Supabase) est PERSISTÉE en localStorage sous
  //      la clé `sb-<projectId>-auth-token` (supabase-js, src/lib/auth.ts
  //      : createClient sans option `storage` → dérive la clé du project
  //      ref) — on lit la clé dans le DOM du test.
  //   2. Sortir de l’app = cy.visit('/') (le root de l’app, qui redirige
  //      sur /splash) : le token est encore présent dans localStorage →
  //      le Splash hydrate la session via authService.getSession() et
  //      navigue vers /dashboard (ou /onboarding) SANS réafficher /auth.
  //      C’est le comportement « revenir exactement où on s’était ».
  //   3. Revenir sur /sessions (la page est PUBLIQUE — elle ne redirige
  //      PAS sur /auth, cf. le spec existant ligne 69-73) : les comptes
  //      sont TOUJOURS listés (ils ne sont PAS effacés par la
  //      déconnexion — c’est le point exact de la demande « permettant
  //      d’utiliser plusieurs organisations différentes »).
  it('la session persiste en local et survit à une sortie de l’app (revenue sur l’état précédent)', function () {
    this.timeout(120_000);

    // 1. On est au dashboard (le test précédent a terminé sur
    //    /dashboard après la reconnexion). On vérifie que le token
    //    Supabase est PERSISTÉ en localStorage (la clé est dérivée
    //    du project ref, cf. cypress/support/local.ts:89-94 —
    //    `sb-<projectId>-auth-token`).
    cy.visit('/dashboard');
    cy.location('pathname', { timeout: 60_000 }).should('eq', '/dashboard');
    cy.window().then((win) => {
      const sbKey = Object.keys(win.localStorage).find((k) => /-auth-token$/.test(k));
      expect(
        sbKey,
        'le token Supabase n est PAS persisté en localStorage (la session ne tiendra pas à la sortie de l app)',
      ).to.be.a('string');
      const raw = JSON.parse(win.localStorage.getItem(sbKey!) || 'null');
      expect(raw?.access_token, 'access_token absent de la session persistée').to.be.a('string');
      expect(raw?.refresh_token, 'refresh_token absent (la session ne pourra pas se re-valider)').to.be.a('string');
    });

    // 2. « Sortir de l’app » = visiter le root (qui redirige sur
    //    /splash, le point d’entrée de l’app — cf. les routes dans
    //    src/App.tsx : '/' n est pas une page de feature, c est
    //    le hub de redirection vers /splash). Le token est encore
    //    dans localStorage → le Splash hydrate la session et
    //    navigue vers /dashboard (l’état précédent, « revenu
    //    exactement où on s’était » — l’utilisateur n a PAS été
    //    déconnecté, il ne retombe PAS sur /auth).
    cy.visit('/');
    // Le root redirige sur /splash (puis /splash → /dashboard si
    // onboarding complet + données prêtes). On attend /splash ou
    // /dashboard (les deux sont des états « authentifié »).
    cy.location('pathname', { timeout: 60_000 }).should((path) => {
      expect(
        path,
        `sortie de l’app : le root a mené à ${path} (attendu /splash ou /dashboard — /auth = déconnexion involontaire)`,
      ).to.be.oneOf(['/splash', '/dashboard']);
      return true;
    });
    // Si on est tombé sur /splash, on l laisse naviguer jusqu à
    // /dashboard (le Splash navigue quand initialDataLoaded=true).
    cy.location('pathname', { timeout: 60_000 }).should('eq', '/dashboard');

    // 3. Le /sessions liste TOUJOURS les comptes (la
    //    déconnexion S UI depuis le 1er it a retiré le token
    //    Supabase, mais la RECONNEXION du 2e it l a reposé —
    //    l org reste listée car la clé `lumina-removed-accounts`
    //    (line 38 de Sessions.tsx) ne l a PAS effacée — on n a
    //    pas cliqué « Retirer » dans ce spec, on a cliqué
    //    « Re-ouvrir »).
    cy.visit('/sessions');
    cy.get('button[aria-label^="Re-ouvrir"]', { timeout: 60_000 }).should('exist');
    // L’état « Actif » est affiché (le compte courant est toujours
    // l’org active — la persistance de la connexion tient).
    cy.contains('Actif').should('be.visible');
  });
});
