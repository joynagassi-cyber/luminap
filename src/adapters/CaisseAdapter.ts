import type { Caisse, Account } from '@/types';

/**
 * CaisseAdapter — bridge between legacy Caisse and canonical Account
 *
 * The UI still references `Caisse`, but the canonical model uses `Account`.
 * This adapter maps between the two without changing the UI layer.
 */
export class CaisseAdapter {
  /** Convert a canonical Account to the legacy Caisse shape */
  static fromAccount(account: Account): Caisse {
    return {
      id: account.id,
      name: account.name,
      description: '',
      type: account.ownerType === 'ORGANIZATION' ? 'MAIN' : 'GROUP',
      color: '#FF6B00',
      orgId: account.orgId,
      createdAt: account.createdAt,
      updatedAt: account.updatedAt,
      archivedAt: account.archivedAt,
      archivedBy: account.archivedBy,
      archiveReason: account.archiveReason,
      status: account.status,
    };
  }

  /** Convert legacy Caisse to canonical Account shape */
  static toAccount(caisse: Caisse): Account {
    return {
      id: caisse.id,
      orgId: caisse.orgId,
      ownerType: caisse.type === 'MAIN' ? 'ORGANIZATION' : 'GROUP',
      ownerId: caisse.id,
      name: caisse.name,
      currency: 'XOF',
      status: caisse.status,
      archivedAt: caisse.archivedAt,
      archivedBy: caisse.archivedBy,
      archiveReason: caisse.archiveReason,
      createdAt: caisse.createdAt,
      updatedAt: caisse.updatedAt,
    };
  }

  /** Map a list of accounts to caisses */
  static mapAccountsToCaisses(accounts: Account[]): Caisse[] {
    return accounts.map(this.fromAccount);
  }

  /**
   * Merge legacy caisses with canonical accounts.
   * Caisses take priority for IDs already present; accounts fill gaps.
   */
  static merge(caisses: Caisse[], accounts: Account[]): Caisse[] {
    const map = new Map<string, Caisse>();
    caisses.forEach(c => map.set(c.id, c));
    accounts.forEach(a => {
      if (!map.has(a.id)) {
        map.set(a.id, this.fromAccount(a));
      }
    });
    return Array.from(map.values());
  }
}
