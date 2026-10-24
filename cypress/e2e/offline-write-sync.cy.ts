/**
 * Cypress E2E — R85 : le chemin d'écriture hors ligne.
 *
 * POURQUOI CETTE SPEC EXISTE
 * --------------------------
 * `cloud-sync.cy.ts` NE teste PAS la synchronisation PowerSync : après la
 * reconnexion, il insère lui-même les entités par `cy.request` (contexte
 * Node, non intercepté) puis vérifie leur présence. L'assertion est
 * tautologique — elle valide le réseau et la RLS, pas la file d'upload.
 * Le chemin d'écriture réel n'avait donc AUCUNE couverture.
 *
 * CE QUE CETTE SPEC PROUVE (mesuré le 2026-10-24)
 * -----------------------------------------------
 *   1. Une transaction créée par l'interface atterrit dans la base locale
 *      (SQLite, table `transactions`).
 *   2. Elle entre dans la FILE D'UPLOAD locale (`ps_crud`) sous forme d'op
 *      `PUT` portant son id et son org_id — preuve que l'écriture hors
 *      ligne est bien capturée pour synchronisation ultérieure, et non
 *      simplement écrite en local.
 *   3. Elle n'est pas encore sur le serveur (contrôle négatif).
 *
 * CE QUE CETTE SPEC NE PEUT PAS PROUVER ICI — À VÉRIFIER À LA MAIN
 * ---------------------------------------------------------------
 * Le VIDAGE de la file (upload réel vers Supabase). En Chromium headless,
 * le worker WASM de PowerSync ne se connecte jamais : `currentStatus` reste
 * à `{ connected: false, hasSynced: false }` après 120 s, sans erreur
 * remontée. `window.__psFlushCrudUpload` (helper DEV) s'appuie sur
 * `getNextCrudTransaction()` du worker : il retourne `passes: 0,
 * opsTotal: 0` même quand `ps_crud` contient une op. Aucun test headless ne
 * peut donc vider la file — c'est la raison pour laquelle
 * `cloud-sync.cy.ts` contourne par des insertions directes.
 *
 * Le drain doit être vérifié dans un vrai navigateur : créer une
 * transaction, attendre ~40 s, puis contrôler côté serveur (procédure
 * décrite dans RUNBOOK.md). Voir RISQUES.md R85.
 */
describe('Lumina — écriture hors ligne (R85)', () => {
  const SUPABASE_URL =
    (Cypress.expose('SUPABASE_URL') as string) ||
    'https://hhgovvrnalibhgpakswi.supabase.co';
  const anonKey = Cypress.expose('SUPABASE_ANON_KEY') as string;
  const activeOrgId =
    (Cypress.expose('CYPRESS_ORG_ACTIVE_ID') as string) || 'org-e2e';

  before(function () {
    this.timeout(120_000);
    cy.loginOrgAccount();
  });

  it('une transaction créée hors ligne est capturée dans la file d’upload locale', function () {
    this.timeout(240_000);

    const label = 'R85 offline ' + Date.now();

    // ── 1. Contexte d'organisation ────────────────────────────────────
    // L'app lit `lumina-user` au boot ; sans lui, `getOrganizationId()`
    // retombe sur `__no_org__` et l'INSERT part avec un org_id invalide
    // (rejeté par la RLS à l'upload, sans erreur visible).
    cy.visit('/dashboard', { timeout: 90_000 });
    cy.window({ timeout: 60_000 }).then((win: any) => {
      const ls = win.localStorage;
      const raw = ls.getItem('lumina-user');
      const user = raw ? JSON.parse(raw) : null;
      const next = user ?? {
        id: '87afea21-bad7-453b-9ae5-4ad1da2ca13f',
        email: 'lumina-org-e2e@lumina.dev',
      };
      next.org = { id: activeOrgId, name: 'Lumina Org E2E', type: 'CHURCH' };
      next.role = 'PASTEUR_PRINCIPAL';
      ls.setItem('lumina-user', JSON.stringify(next));
      ls.setItem('lumina-active-org', activeOrgId);
      ls.setItem('lumina-role', 'PASTEUR_PRINCIPAL');
    });
    cy.visit('/dashboard', { timeout: 90_000 });

    // Le handle PowerSync doit être exposé (DEV-only) : sans lui, les
    // assertions sur la base locale et la file d'upload sont impossibles.
    cy.window({ timeout: 90_000 }).should((win: any) => {
      expect(win.__psDb, 'window.__psDb doit être exposé (DEV)').to.exist;
    });

    // ── 2. Écrire une transaction par l'interface ─────────────────────
    cy.visit('/transaction/new', { timeout: 90_000 });
    cy.get('h1, h2, h3, header', { timeout: 60_000 })
      .contains('Nouvelle transaction')
      .should('exist');
    cy.get('input[placeholder="0"]').first().clear().type('12345');
    cy.get('input[placeholder="Ex: Dîme du mois"]').first().type(label);
    cy.contains('Enregistrer la transaction').click();
    cy.location('pathname', { timeout: 90_000 }).should((path: string) => {
      expect(path, `chemin inattendu après enregistrement : ${path}`).to.not.match(
        /^\/transaction\/new/,
      );
    });

    // ── 3. La ligne est en base locale ET dans la file d'upload ───────
    // Les deux vérifications sont dans un même `cy.window()` : `cy.writeFile`
    // ne peut pas être appelé depuis un callback de `cy.should()` (Cypress
    // empile des commandes à chaque tentative) — d'où un `cy.then()` unique
    // avec des `expect` synchrones.
    cy.window({ timeout: 60_000 }).then(async (win: any) => {
      const rows = await win.__psDb.getAll(
        'SELECT id, amount, status, org_id FROM transactions WHERE description = ?',
        [label],
      );
      expect(
        rows.length,
        `la transaction doit exister en local (SQLite) — description=${label}`,
      ).to.be.greaterThan(0);
      expect(rows[0].org_id, 'org_id local').to.eq(activeOrgId);
      // 12345 saisi → 1234500 centimes : le stockage monétaire est en
      // centimes (`parseFloat(amount) * 100` dans TransactionNew.tsx).
      expect(rows[0].amount, 'montant stocké en centimes').to.eq(1234500);

      const txId = rows[0].id as string;

      // La file d'upload locale (`ps_crud`) doit contenir l'op PUT de
      // cette transaction. C'est LE point que `cloud-sync.cy.ts` ne
      // vérifiait pas : la capture hors ligne est-elle bien enregistrée
      // pour synchronisation ?
      const crud = await win.__psDb.getAll('SELECT * FROM ps_crud LIMIT 50');
      cy.writeFile('cypress/.r85-crud.json', JSON.stringify(crud, null, 2));

      const queued = crud
        .map((c: any) => {
          try {
            return JSON.parse(String(c.data));
          } catch {
            return null;
          }
        })
        .filter((d: any) => d && d.type === 'transactions' && d.id === txId);

      expect(
        queued.length,
        `l'op PUT de la transaction doit être dans la file d'upload locale ` +
          `(ps_crud). txId=${txId}, ops présentes=${crud.length}`,
      ).to.be.greaterThan(0);
      expect(queued[0].op, "type d'opération").to.eq('PUT');
      expect(queued[0].data.org_id, 'org_id dans la file').to.eq(activeOrgId);

      win.__r85TxId = txId;
    });

    // ── 4. Contrôle négatif : pas encore sur le serveur ───────────────
    // La ligne ne peut pas y être : le worker ne se connecte pas en
    // headless. Ce contrôle garantit que l'assertion précédente porte bien
    // sur une écriture LOCALE, non sur un aller-retour serveur.
    cy.window().then((win: any) => {
      const raw = win.localStorage.getItem(
        'sb-hhgovvrnalibhgpakswi-auth-token',
      );
      const token = JSON.parse(raw ?? '{}')?.access_token;
      expect(token, 'jeton réel requis pour interroger le serveur').to.be.a(
        'string',
      );
      cy.request({
        method: 'GET',
        url: `${SUPABASE_URL}/rest/v1/transactions?select=id&description=eq.${encodeURIComponent(label)}`,
        headers: { apikey: anonKey, Authorization: `Bearer ${token}` },
      }).then((res: any) => {
        expect(res.status).to.eq(200);
        expect(
          res.body.length,
          'la transaction ne doit pas encore être sur le serveur (aucun upload en headless)',
        ).to.eq(0);
      });
    });

    // ── 5. Nettoyage de la ligne locale ───────────────────────────────
    // La file d'upload (`ps_crud`) n'est pas purgée ici : elle ne peut pas
    // l'être sans le worker. Elle l'est automatiquement dans un navigateur
    // normal, dès le premier cycle d'upload.
    cy.window().then(async (win: any) => {
      await win.__psDb.execute('DELETE FROM transactions WHERE id = ?', [
        win.__r85TxId,
      ]);
    });
  });
});
