/**
 * Cypress E2E — Crawler « zéro écran noir » (contrat §2.2 / Phase 2, P0).
 *
 * But : parcourir TOUTES les routes déclarées et prouver qu'aucune ne laisse
 * l'utilisateur devant un écran muet. L'invariant est vérifiable sans cloud :
 * après visite, la page doit exposer un marqueur `data-screen-state` valide
 * (posé par le shell `LazyRoute`, les écrans d'état `RouteStates`, la 404, ou
 * l'écran d'erreur) OU avoir été redirigée vers une route légitime
 * (/auth, /splash, /dashboard, /onboarding).
 *
 * Le spec est OFFLINE (`cy.interceptCloud`) + session locale seedée : il ne
 * dépend ni de PowerSync ni du réseau, donc il est exploitable en repli là où
 * la suite E2E « cloud » échoue (R98).
 *
 * ⚠️ La liste des routes est une COPIE de `src/lib/routeResolver.ts`
 * (ROUTE_REGISTRY). Le test unitaire `route-registry-drift.test.ts` garde le
 * registre synchronisé avec les routes montées ; ici on veut le vérifier de
 * bout en bout dans un vrai navigateur.
 */

const ROUTES: string[] = [
  "/splash",
  "/auth",
  "/auth/callback",
  "/sessions",
  "/onboarding",
  "/dashboard",
  "/notifications",
  "/tutoriel",
  "/finance",
  "/transaction/new",
  "/transaction/:id",
  "/transaction/:id/edit",
  "/groups/:id/transaction/new",
  "/balance",
  "/versement",
  "/saisie-rapide/:id",
  "/budgets",
  "/budgets/:id",
  "/giving",
  "/giving/campaigns/:id",
  "/groups",
  "/groups/:id",
  "/groups/:id/cotisation",
  "/events",
  "/event/new",
  "/event/:id",
  "/event/:id/edit",
  "/members",
  "/membres-en-avance",
  "/membre/:id",
  "/culte/:id",
  "/archives",
  "/reports",
  "/report-builder",
  "/cotisations",
  "/forms",
  "/form/fill/:id",
  "/forms/:id/submissions",
  "/custom-fields",
  "/invitation/emit",
  "/invitation/claim",
  "/invitation/manage",
  "/org-setup",
  "/admin",
  "/admin/federation",
  "/admin/federation/tree",
  "/admin/units",
  "/admin/report-send",
  "/admin/reports",
  "/admin/reports/:id",
  "/admin/organizations/:id",
  "/admin/roles",
  "/trace",
  "/history",
  "/help",
  "/settings",
  "/settings/profil",
  "/settings/theme",
  "/settings/personnalisation",
  "/settings/features",
  "/settings/notifications",
  "/settings/gestion",
  "/settings/about",
  "/settings/health",
];

/** États autorisés par le contrat §5.1 (ensemble fini). */
const VALID_STATES = new Set([
  "loading",
  "ready",
  "empty",
  "error",
  "offline",
  "syncing",
  "forbidden",
  "notfound",
  "partial",
  "success",
  "destructive-confirm",
]);

/** Redirections légitimes (gardes) — une route qui y aboutit n'est pas noire. */
const VALID_REDIRECTS = ["/auth", "/splash", "/dashboard", "/onboarding"];

function materialize(pattern: string): string {
  return pattern.replace(/:id/g, "e2e-nonexistent");
}

describe("Lumina — crawler zéro écran noir (toutes routes, hors-ligne)", () => {
  before(function () {
    this.timeout(120_000);
    cy.interceptCloud();
  });

  beforeEach(function () {
    cy.clearLocalStorage();
    cy.seedLocalSession();
  });

  for (const pattern of ROUTES) {
    it(`${pattern} → écran marqué (jamais noir)`, function () {
      this.timeout(90_000);
      cy.visit(materialize(pattern));

      // Laisse le lazy-load + la garde de route se stabiliser.
      cy.wait(600);

      cy.location("pathname", { timeout: 30_000 }).then((pathname) => {
        // Cas 1 : la route a redirigé vers une route légitime.
        if (VALID_REDIRECTS.some((r) => pathname.startsWith(r))) {
          return;
        }
        // Cas 2 : on est resté sur place → un marqueur d'état DOIT exister.
        cy.get("[data-screen-state]", { timeout: 30_000 })
          .should("have.length.gte", 1)
          .then(($els) => {
            const states = $els
              .toArray()
              .map((el) => el.getAttribute("data-screen-state") || "");
            const valid = states.filter((s) => VALID_STATES.has(s));
            expect(
              valid.length,
              `route ${pattern} : aucun data-screen-state valide (vu : ${states.join(
                ",",
              )}) → écran potentiellement noir`,
            ).to.be.gte(1);
          });
      });
    });
  }
});
