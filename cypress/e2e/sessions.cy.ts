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
  // ── Diagnostic : capture complète du console (app side) dans la session
  //    Node de Cypress, imprimée à la fin du spec (passant ou non). ─────
  const diagLines: string[] = [];
  const isDiag = (s: string) =>
    /loginOrgAccount|org\] refetch|auth\] hydrateProfile|sessions-diag|handleNewUser|upsert_profile|ensureProfile/.test(s);

  beforeEach(() => {
    cy.on('window:console', (event) => {
      const s = event.args.map((a: unknown) => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ');
      if (isDiag(s)) {
        diagLines.push(`[${event.type}] ${s}`);
      }
    });
  });

  afterEach(() => {
    if (diagLines.length > 0) {
      console.info(`[sessions-diag-dump] ${diagLines.length} trace(s) capturée(s):`);
      diagLines.slice(0, 80).forEach((l) => console.info(`[sessions-diag-dump] ${l}`));
      diagLines.length = 0;
    }
  });

  before(function () {
    this.timeout(90_000);
    cy.loginOrgAccount();
  });

  it('logout → /sessions shows the active account → click reconnects without re-login', function () {
    this.timeout(120_000);

    // Spy post-login (avant tout cy.visit) — capture les traces produit
    // émises pendant la phase login (onboarding, etc.).
    cy.window().then((win) => {
      (win as any).__diag = [];
      for (const lvl of ['info', 'warn', 'error', 'log'] as const) {
        const orig = win.console[lvl];
        win.console[lvl] = (...args: unknown[]) => {
          const s = args
            .map((a) => (typeof a === 'string' ? a : JSON.stringify(a)))
            .join(' ');
          if (/loginOrgAccount|org\] refetch|auth\] hydrateProfile|sessions-diag/.test(s)) {
            (win as any).__diag.push(`[${lvl}] ${s}`);
          }
          orig.apply(win.console, args);
        };
      }
    });
    const dumpDiag = () => {
      cy.window().then((win) => {
        const cap = ((win as any).__diag as string[]) ?? [];
        const flags = Object.keys(win.localStorage)
          .map((k) => {
            const v = win.localStorage.getItem(k);
            return v && v.length > 120 ? `${k}=${v.slice(0, 80)}…` : `${k}=${v}`;
          })
          .join(' ');
        console.info(`[sessions-diag] flags: ${flags}`);
        for (const c of cap) console.info(`[sessions-diag] ${c}`);
      });
    };

    // ── 1. Se déconnecter depuis le hub /sessions ────────────────────
    cy.visit('/sessions');
    cy.get('button[aria-label^="Re-ouvrir"]').should('exist');
    cy.contains('Actif').should('be.visible');
    dumpDiag();

    cy.contains('button', 'Se déconnecter').click();
    // Le sign-out navigue vers /auth (la session Supabase est effacée,
    // mais les comptes restent listés dans /sessions — localStorage
    // lumina-removed-accounts / my-orgs persistent côté client).
    cy.location('pathname', { timeout: 60_000 }).should('eq', '/auth');

    // ── 2. Retourner au hub /sessions (route publique) ──────────────
    cy.visit('/sessions');
    // Re-spied après le reload (le window a été rechargé).
    cy.window().then((win) => {
      (win as any).__diag = [];
      for (const lvl of ['info', 'warn', 'error', 'log'] as const) {
        const orig = win.console[lvl];
        win.console[lvl] = (...args: unknown[]) => {
          const s = args
            .map((a) => (typeof a === 'string' ? a : JSON.stringify(a)))
            .join(' ');
          if (/loginOrgAccount|org\] refetch|auth\] hydrateProfile|sessions-diag/.test(s)) {
            (win as any).__diag.push(`[${lvl}] ${s}`);
          }
          orig.apply(win.console, args);
        };
      }
    });
    cy.get('button[aria-label^="Re-ouvrir"]').should('exist');
    dumpDiag();

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
});
