/**
 * Cypress E2E — Point d'entrée PWA (`/` → `/splash`)
 *
 * R58 (session 2026-10-23) : `public/manifest.json` déclare
 * `"start_url": "/"`, et le conteneur de l'app reçoit l'URL `/` quand
 * l'utilisateur ouvre la PWA installée (ou tape le domaine nu). Or
 * `src/App.tsx:270` déclarait la redirection de façon invalide :
 *
 *     <Route path="/">
 *       <Navigate to="/splash" replace />   // ← enfant, ignoré
 *     </Route>
 *
 * React Router n'accepte un composant de redirection que via la prop
 * `element=` ; un `<Navigate>` placé en ENFANT n'est jamais rendu. La
 * route matchait donc `/` sans rien produire : AUCUNE page Ionic n'était
 * poussée dans le view-stack → écran BLANC total (sans BottomNav, sans
 * menu, sans moyen de sortir). C'est le pire défaut possible pour un
 * utilisateur qui installe la PWA et la rouvre plus tard.
 *
 * Preuve du défaut (sonde DOM avant correctif) :
 *   PATH=/  PAGES(ion-page)=0  BODYLEN=26
 */
describe("Lumina — redirection du point d'entrée PWA", () => {
  before(function () {
    this.timeout(90_000);
    cy.loginOrgAccount();
  });

  it("`/` (start_url de la PWA) redirige vers une page réelle, jamais un écran blanc", function () {
    this.timeout(120_000);
    cy.ensureAuth();
    cy.visit("/");
    // 1. La redirection aboutit (et ne reste PAS sur `/`).
    cy.location("pathname", { timeout: 60_000 }).should((p) => {
      expect(
        p,
        "`/` doit rediriger vers /splash (puis /dashboard) — rester sur / = écran blanc",
      ).to.be.oneOf(["/splash", "/dashboard"]);
    });
    // 2. Une page Ionic VISIBLE est montée (pas de view-stack vide) et
    //    contient un vrai sous-arbre rendu. On ne teste PAS la longueur du
    //    texte : `/splash` n'affiche qu'un logo (aucun texte), un corps de
    //    26 caractères (« Aller au contenu principal », le lien d'évitement)
    //    y est donc normal. Le défaut d'origine était `PAGES=0` (aucune
    //    page du tout) — c'est cela qu'on verrouille.
    cy.get("div.ion-page:not(.ion-page-hidden)", { timeout: 60_000 })
      .should("have.length.gte", 1)
      .then(($pages) => {
        const page = $pages[$pages.length - 1];
        expect(
          page.children.length,
          "page Ionic vide (écran blanc : la route a matché sans rien rendre)",
        ).to.be.greaterThan(0);
      });
  });

  it("`/` sans session aboutit à une page publique, jamais un écran blanc", function () {
    this.timeout(120_000);
    // Aucune session : /splash est publique, puis /auth prend le relais.
    cy.clearLocalStorage();
    cy.visit("/");
    cy.location("pathname", { timeout: 60_000 }).should((p) => {
      expect(p, "sans session, `/` doit mener à une route publique").to.be.oneOf([
        "/splash",
        "/auth",
      ]);
    });
    cy.get("div.ion-page:not(.ion-page-hidden)", { timeout: 60_000 })
      .should("have.length.gte", 1)
      .then(($pages) => {
        expect($pages[$pages.length - 1].children.length).to.be.greaterThan(0);
      });
  });
});
