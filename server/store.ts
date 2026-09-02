import type { Category, OrgUnit, Transaction, AuditEntry, User } from '../src/types';
import {
  MOCK_USER,
  MOCK_CATEGORIES,
  MOCK_ORG_UNITS,
  MOCK_TRANSACTIONS,
  MOCK_AUDIT_ENTRIES,
} from '../src/config/mockData';

let transactions = [...MOCK_TRANSACTIONS] as Transaction[];
let auditEntries = [...MOCK_AUDIT_ENTRIES] as AuditEntry[];

export interface Store {
  isAuthenticated: boolean;
  user: User | null;
  transactions: Transaction[];
  categories: Category[];
  orgUnits: OrgUnit[];
  auditEntries: AuditEntry[];
}

export const store: Store = {
  isAuthenticated: true,
  user: MOCK_USER,
  transactions,
  categories: MOCK_CATEGORIES,
  orgUnits: MOCK_ORG_UNITS,
  auditEntries,
};
