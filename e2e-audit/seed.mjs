// Seed localStorage like cypress/support/local.ts + visualSeed.ts, offline.
export async function seedLocalSession(page, overrides = {}) {
  const role = overrides.role ?? (process.env.SEED_ROLE ?? 'PASTEUR_PRINCIPAL');
  const orgName = overrides.orgName ?? 'Église MFE-JC Centrale';
  const userId = overrides.userId ?? 'local-user';
  const userEmail = overrides.userEmail ?? 'pasteur@lumina.demo';
  const projectId = 'dummy';
  const sessionKey = `sb-${projectId}-auth-token`;
  const futureExpiry = Math.floor(Date.now() / 1000) + 30 * 24 * 3600;
  const session = {
    access_token: 'fake-jwt-for-e2e', token_type: 'bearer',
    expires_at: futureExpiry, expires_in: 30 * 24 * 3600, refresh_token: 'fake-refresh',
    user: { id: userId, email: userEmail, user_metadata: {}, identities: [], aud: 'authenticated',
      created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  };
  await page.addInitScript(({ sessionKey, session, role, orgName, userId, userEmail }) => {
    const ls = window.localStorage;
    ls.setItem(sessionKey, JSON.stringify(session));
    ls.setItem('__e2e-ps-ready', '1');
    ls.setItem('lumina-onboarded', 'true');
    ls.setItem('lumina-onboarding', JSON.stringify({ screen: 0, branch: 'creator',
      org: { name: orgName, sigle: 'EMC', type: 'Eglise', theme: 'orange', features: [] },
      role, completed: true }));
    ls.setItem('lumina-user', JSON.stringify({ id: userId, email: userEmail, firstName: 'Jean', role,
      org: { id: 'default-org', name: orgName, type: 'Eglise' } }));
    ls.setItem('lumina-role', role);
    ls.setItem('lumina-config', JSON.stringify({ churchName: orgName }));
    ls.setItem('lumina-session', userId);
    ls.setItem('lumina-active-org', 'default-org');
    ls.setItem('lumina-orgs', JSON.stringify([{ id: 'default-org', name: orgName, type: 'Eglise', role }]));
  }, { sessionKey, session, role, orgName, userId, userEmail });
}

export async function interceptCloud(page) {
  await page.route('**/*supabase*/**', (r) => r.abort());
  await page.route('**/*.powersync.journeyapps.com/**', (r) => r.abort());
  await page.route('**/*.supabase.co/**', (r) => r.abort());
}
