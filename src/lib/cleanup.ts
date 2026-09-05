/**
 * First-run cleanup: removes all group-related data from IndexedDB
 * and resets state to a clean slate (only main caisse remains).
 * Called once on first app launch (when lumina-onboarded is not set).
 */
import { db } from './db';

export async function cleanInitialData() {
  try {
    // Clear everything except categories, events, audit, config, notifications
    const keep = ['transactions', 'categories', 'events', 'auditEntries', 'syncQueue', 'config', 'notifications', 'versements', 'event_budgets', 'budget_lines', 'form_definitions', 'form_submissions', 'custom_field_definitions', 'custom_field_values'];
    for (const store of ['orgUnits', 'accounts', 'caisses', 'groups', 'group_memberships', 'members']) {
      try { await db.clear(store as any); } catch {}
    }

    // Re-insert only the main caisse + org unit
    await db.put('caisses', {
      id: 'main', name: 'Caisse principale', description: 'Fonds de l\'église',
      type: 'MAIN', color: '#FF6B00', orgId: 'org-1',
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      archivedAt: null, archivedBy: null, archiveReason: null, status: 'ACTIVE',
    });
    await db.put('accounts', {
      id: 'main', orgId: 'org-1', ownerType: 'ORGANIZATION', ownerId: 'org-1',
      name: 'Caisse principale', currency: 'XOF', status: 'ACTIVE',
      archivedAt: null, archivedBy: null, archiveReason: null,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    });
    await db.put('orgUnits', {
      id: 'org-1', name: 'Église MFE-JC Centrale', type: 'eglise',
      description: 'Église mère', orgId: 'org-1', isActive: true,
    });
    console.log('[cleanup] IndexedDB cleared — only main caisse remains');
  } catch (e) {
    console.error('[cleanup] failed', e);
  }
}
