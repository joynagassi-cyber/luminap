/**
 * Cypress E2E — Mode thème (system/light/dark) : tokens CSS complets sur
 * les surfaces clés (dashboard), cohérence du mode « système » et
 * persistance du choix.
 *
 * Généré par Cypress Author le 2026-10-10.
 * Mis à jour le 2026-11-01 (régression #193) : le défaut est passé de
 * `dark` à `system` (suit prefers-color-scheme) et la palette light/dark
 * a été remplacée par les valeurs de la maquette dashboard-MF.
 *
 * Périmètre (conforme à la demande utilisateur) :
 *   - Le token `--canvas` / `--surface` / `--card` / `--text-primary` /
 *     `--border` est DIFFÉRENT entre [data-mode="dark"] et
 *     [data-mode="light"] (cf. src/App.css).
 *   - Le choix est PERSISTÉ dans localStorage sous `lumina-theme-mode`
 *     (src/ionic/themes.ts — `THEME_MODE_STORAGE_KEY`) : au
 *     rechargement de la page, le script inline de index.html lit cette
 *     clé AVANT le 1er paint et pose `data-mode` sur <html> — le rendu
 *     React retrouve donc le bon mode.
 *
 * Trois modes possibles depuis #193 : « system » (DÉFAUT, résolu vers
 * dark/light selon l'OS via prefers-color-scheme), « dark » et
 * « light ». Le mode RÉSOLU (dark|light) est ce que porte `data-mode`
 * sur <html> ; `data-mode` ne vaut JAMAIS « system ».
 *
 * Pattern d'activation d'un mode PRÉCIS : `cy.visit('/dashboard', {
 * onBeforeLoad(win) { win.localStorage.setItem('lumina-theme-mode',
 * 'light'); } })` — le script inline d'index.html applique le mode
 * résolu avant le 1er paint (pas besoin de relancer le wizard des
 * settings).
 *
 * Les tokens CSS sont lus via `getComputedStyle(document
 * .documentElement).getPropertyValue('--…')` — la valeur est celle
 * EFFECTIVEMENT appliquée au <html> (donc celle qui pilote tous
 * les composants qui consomment `var(--…)`) — c'est l'assertion
 * de la complétude du mode, pas seulement du `data-mode`.
 */

describe('Lumina — mode thème system/light/dark (tokens complets + persistance)', () => {
  // Le spec est OFFLINE (interceptCloud) : le dashboard sort du
  // skeleton grâce à l'org active pré-seedée (voir beforeEach).
  before(() => {
    cy.interceptCloud();
  });

  beforeEach(() => {
    cy.clearLocalStorage();
    cy.seedLocalSession();
    // Le spec thème est OFFLINE mais le dashboard doit SORTIR du
    // skeleton (c'est l'objet du spec : vérifier les tokens light/dark
    // SUR LE DASHBOARD COMPLET, pas seulement le skeleton). On pré-
    // seed l'org active AVANT le 1er cy.visit : sans elle,
    // getOrganizationId() retourne '__no_org__' (src/lib/orgContext.
    // ts:25) et les hooks useAccounts/useTransactions retournent des
    // arrays vides → `mainAccount` (Dashboard.tsx:699) reste null →
    // la page reste en skeleton (isLoading=true, pas de data à
    // afficher). Avec l'org seedée, `churchSeedData()` (src/packs/
    // church/index.ts:35) pré-remplit le Zustand store avec la
    // caisse racine « Caisse principale » (line 65-68) → le
    // dashboard sort du skeleton et rend le HeroCard (line 788-802).
    cy.window().then((win) => {
      win.localStorage.setItem('lumina-active-org', 'default-org');
    });
  });

  // ── Helpers de tokens ─────────────────────────────────────────────────
  /**
   * Normalise une couleur hex en 6 chiffres (le computed style
   * retourne les valeurs courtes quand possible : `#fff` pour
   * `#ffffff`, `#0f0f10` ne change pas car il n'a pas d'abrégié).
   * Sans cette normalisation, l'assertion `.should('eq', '#ffffff')`
   * échoue si le navigateur retourne `#fff` (c'est le cas de
   * Chrome/Electron : les couleurs courtes sont préférées).
   */
  function normalizeHex(c: string): string {
    // Les couleurs sont en MINUSCULES (le computed style de Chrome/
    // Electron peut les retourner en MAJUSCULES pour certains
    // tokens, ex. #FF6B00 pour --accent-primary) — on fait
    // lowercase avant de comparer.
    const lower = c.toLowerCase();
    const m = lower.match(/^#([0-9a-f]{3})$/);
    if (m) return '#' + m[1].split('').map((x) => x + x).join('');
    return lower;
  }

  /**
   * Lit la valeur EFFECTIVE d'un token CSS sur <html> (donc la
   * valeur qui pilote tout le DOM via var(…) — cf. le mapping
   * Tailwind dans src/globals.css).
   * `cy.window()` (pas `cy.get`) pour éviter le problème des
   * custom elements Ionic : le html n'est pas dans le light DOM
   * d'un ion-page. Le résultat est NORMALISÉ en hex 6 chiffres
   * (voir `normalizeHex`) pour que les assertions `.should('eq', …)`
   * soient stables quel que soit le format de retour du
   * getComputedStyle (court vs long).
   */
  function readCssToken(token: string): Cypress.Chainable<string> {
    return cy.window().then((win) => {
      const val = normalizeHex(
        win.getComputedStyle(win.document.documentElement)
          .getPropertyValue(token)
          .trim()
      );
      expect(val, `le token ${token} est vide (data-mode non appliqué ?)`).to.be.a('string');
      expect(val).to.not.eq('');
      return val;
    });
  }

  /** Récupère le <html> dataset.mode effectif (dark|light). */
  function readThemeMode(): Cypress.Chainable<'dark' | 'light'> {
    return cy.window().then((win) => {
      const t = win.document.documentElement.dataset.mode;
      expect(t, 'data-mode absent du <html> — le script inline n\'a pas tourné').to.be.oneOf(['dark', 'light']);
      return t as 'dark' | 'light';
    });
  }

  /** Pose la clé localStorage du mode AVANT le 1er paint du dashboard. */
  function visitWithStoredMode(mode: 'system' | 'dark' | 'light') {
    cy.visit('/dashboard', {
      onBeforeLoad(win) {
        win.localStorage.setItem('lumina-theme-mode', mode);
      },
    });
    cy.location('pathname', { timeout: 60_000 }).should('eq', '/dashboard');
  }

  it('les alias sur html suivent le thème historique et atteignent les overlays', () => {
    visitWithStoredMode('light');
    cy.window().then((win) => {
      const root = win.document.documentElement;
      const styles = win.getComputedStyle(root);
      for (const [alias, old] of [['--lu-bg', '--canvas'], ['--lu-fg', '--text-primary'],
        ['--lu-accent', '--accent-primary'], ['--lu-income', '--in'], ['--lu-fg-subtle', '--text-tertiary']]) {
        expect(styles.getPropertyValue(alias).trim(), alias).to.eq(styles.getPropertyValue(old).trim());
      }
      const overlay = win.document.createElement('div');
      win.document.body.appendChild(overlay);
      overlay.style.color = 'var(--lu-fg)';
      const probe = win.document.createElement('div');
      probe.style.color = 'var(--text-primary)';
      win.document.body.appendChild(probe);
      expect(win.getComputedStyle(overlay).color).to.eq(win.getComputedStyle(probe).color);
      overlay.remove();
      probe.remove();
    });
  });

  it('mode par défaut = SYSTEM : le mode résolu suit prefers-color-scheme', function () {
    this.timeout(90_000);

    // localStorage vierge (cf. beforeEach) → aucun choix persisté → le
    // défaut est « system » (src/ionic/themes.ts:204-212,
    // getStoredThemeMode() retombe sur "system" quand la clé est
    // absente). `data-mode` porte le mode RÉSOLU : soit dark, soit
    // light, selon la préférence de l'OS.
    cy.visit('/dashboard');
    cy.location('pathname', { timeout: 60_000 }).should('eq', '/dashboard');

    // 1. Le mode résolu est COHÉRENT avec matchMedia — on lit la
    //    préférence de l'environnement de test (l'OS clair de la CI
    //    résout donc en light, un OS sombre en dark) et on vérifie
    //    que <html> porte EXACTEMENT ce mode. C'est l'assertion
    //    déterministe qui remplace l'ancien « dark par défaut ».
    cy.window().then((win) => {
      const prefersDark = win.matchMedia('(prefers-color-scheme: dark)').matches;
      const expected = prefersDark ? 'dark' : 'light';
      expect(
        win.document.documentElement.dataset.mode,
        `data-mode doit suivre prefers-color-scheme (attendu ${expected})`
      ).to.eq(expected);
    });

    // 2. La clé persistée est bien « system » (applyThemeMode persiste
    //    le CHOIX, pas le mode résolu).
    cy.window().then((win) => {
      expect(win.localStorage.getItem('lumina-theme-mode')).to.eq('system');
    });

    // 3. La page /dashboard s'affiche (pas un écran noir / une page
    //    blanche) — les tokens des modes dark/light sont couverts par
    //    les deux tests suivants (assertions de la complétude du mode).
    cy.get('body').should('not.be.empty');
  });

  it('mode DARK explicite (clé localStorage) → tokens sombres appliqués', function () {
    this.timeout(90_000);

    // On force le mode « dark » AVANT le 1er paint (le script inline
    // d'index.html lit la clé au chargement du document).
    visitWithStoredMode('dark');

    // 1. Le <html> porte data-mode="dark".
    readThemeMode().should('eq', 'dark');

    // 2. Les tokens dark sont EN EFFET appliqués (src/App.css, bloc
    //    `:root, [data-mode="dark"]` — valeurs de la maquette
    //    dashboard-MF, #193) : chaque surface qui consomme var(--…)
    //    a la valeur dark.
    readCssToken('--canvas').should('eq', '#0f0f10');
    readCssToken('--surface').should('eq', '#1a1a1c');
    readCssToken('--card').should('eq', '#1a1a1c');
    readCssToken('--text-primary').should('eq', '#f4f4f5');
    readCssToken('--border').should('eq', '#2c2c30');
    // L'accent est INVARIANT (src/App.css, comment « elles ne changent
    // jamais avec le mode ») — on vérifie qu'il est présent dans les
    // deux modes.
    readCssToken('--accent-primary').should('eq', '#ff6b00');

    cy.get('body').should('not.be.empty');
  });

  it('mode LIGHT explicite (clé localStorage) → tokens clairs appliqués', function () {
    this.timeout(90_000);

    // On force le mode « light » AVANT le 1er paint.
    visitWithStoredMode('light');

    // 1. Le <html> porte data-mode="light".
    readThemeMode().should('eq', 'light');

    // 2. Les tokens light (src/App.css, bloc [data-mode="light"] —
    //    valeurs de la maquette dashboard-MF, #193) sont EN EFFET
    //    appliqués : le canvas est clair (#f7f7f8), le texte est
    //    sombre (#18181b), le border est clair (#e4e4e7).
    readCssToken('--canvas').should('eq', '#f7f7f8');
    readCssToken('--surface').should('eq', '#ffffff');
    readCssToken('--card').should('eq', '#ffffff');
    readCssToken('--text-primary').should('eq', '#18181b');
    readCssToken('--border').should('eq', '#e4e4e7');
    // L'accent est invariant (toujours #ff6b00, même en mode clair).
    readCssToken('--accent-primary').should('eq', '#ff6b00');

    cy.get('body').should('not.be.empty');
  });

  it('persiste le mode LIGHT au rechargement (le thème survit au F5)', function () {
    this.timeout(90_000);

    // 1. Bascule en light (la clé est PERSISTÉE par
    //    applyThemeMode → persistThemeMode, src/ionic/themes.ts —
    //    écrit `lumina-theme-mode`).
    visitWithStoredMode('light');
    readThemeMode().should('eq', 'light');

    // 2. RELOAD (F5) : le mode doit survivre — le script inline
    //    d'index.html relit la clé au 2e chargement et
    //    ré-applique data-mode="light" AVANT le 1er paint.
    cy.reload();
    cy.location('pathname', { timeout: 60_000 }).should('eq', '/dashboard');
    readThemeMode().should('eq', 'light');
    // Le token --canvas light (#f7f7f8) est toujours appliqué
    // après le F5 : la PERSISTANCE est confirmée (si le mode était
    // retombé en dark, --canvas serait #0f0f10).
    readCssToken('--canvas').should('eq', '#f7f7f8');
  });
});
