/** TEMPORAIRE — sonde PowerSync (à supprimer). */
describe('ZZ probe powersync', () => {
  before(function () {
    this.timeout(120_000);
    cy.loginOrgAccount();
  });
  it('reads local organizations + streams', function () {
    this.timeout(180_000);
    cy.ensureAuth();
    cy.visit('/dashboard');
    cy.wait(15_000);
    cy.window().then(async (win: any) => {
      const db = win.__powersyncDb || win.powersyncDb;
      const out: string[] = [];
      const anyWin = win as any;
      out.push(`globalKeys=${Object.keys(anyWin).filter((k) => /power|sync/i.test(k)).join(',')}`);
      const found = db || anyWin.PowerSyncDatabase || null;
      if (!found) {
        out.push('NO DB HANDLE on window');
      } else {
        try {
          const r = await found.execute('SELECT id, name, parent_org_id, status FROM organizations ORDER BY created_at DESC LIMIT 30');
          out.push('organizations=' + JSON.stringify(r?.array ?? []));
        } catch (e: any) { out.push('err organizations: ' + e?.message); }
      }
      cy.writeFile('/workspace/dump-ps.txt', out.join('\n'));
    });
  });
});
