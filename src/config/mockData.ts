/**
 * Mock data and default credentials for local development only.
 * In production, these should come from a secure backend API.
 */

import type {
  Transaction,
  Category,
  OrgUnit,
  AuditEntry,
  User,
  Organization,
} from '@/types';

export const MOCK_CREDENTIALS = [
  {
    email: 'admin@mfe-jc.org',
    passwordHash: btoa('lumina-admin-2026'),
    role: 'ADMIN',
    orgId: 'org-1',
  },
];

export const DEFAULT_CREDENTIALS = {
  email: 'admin@mfe-jc.org',
  // In production, passwords must never be stored in source code.
  // Use a proper password hash comparison against a secure backend.
  passwordPlaceholder: '***',
};

export const MOCK_ORG: Organization = {
  id: 'org-1',
  name: "Église MFE-JC Centrale",
  type: 'Eglise',
  accentColor: '#FF6B00',
};

export const MOCK_USER: User = {
  id: 'user-1',
  email: 'admin@mfe-jc.org',
  firstName: 'Pasteur',
  lastName: 'Jean',
  role: 'ADMIN',
  org: MOCK_ORG,
};

export const MOCK_CATEGORIES: Category[] = [
  { id: 'cat-1', key: 'dime', labelFr: 'Dîme', type: 'INCOME', orgId: 'org-1' },
  { id: 'cat-2', key: 'offrande', labelFr: 'Offrande', type: 'INCOME', orgId: 'org-1' },
  { id: 'cat-3', key: 'offrande_mission', labelFr: 'Offrande Mission', type: 'INCOME', orgId: 'org-1' },
  { id: 'cat-4', key: 'don', labelFr: 'Don', type: 'INCOME', orgId: 'org-1' },
  { id: 'cat-5', key: 'salaire_pasteur', labelFr: 'Salaire Pasteur', type: 'EXPENSE', orgId: 'org-1' },
  { id: 'cat-6', key: 'frais_fonctionnement', labelFr: 'Frais de Fonctionnement', type: 'EXPENSE', orgId: 'org-1' },
  { id: 'cat-7', key: 'mission', labelFr: 'Mission', type: 'EXPENSE', orgId: 'org-1' },
  { id: 'cat-8', key: 'entretien', labelFr: 'Entretien', type: 'EXPENSE', orgId: 'org-1' },
  { id: 'cat-9', key: 'aumone', labelFr: 'Aumône', type: 'EXPENSE', orgId: 'org-1' },
];

export const MOCK_ORG_UNITS: OrgUnit[] = [
  { id: 'ou-1', name: 'Diacres', type: 'groupe', orgId: 'org-1' },
  { id: 'ou-2', name: 'Jeunesse', type: 'groupe', orgId: 'org-1' },
  { id: 'ou-3', name: 'Dames', type: 'groupe', orgId: 'org-1' },
  { id: 'ou-4', name: 'Messieurs', type: 'groupe', orgId: 'org-1' },
  { id: 'ou-5', name: 'Chorale', type: 'groupe', orgId: 'org-1' },
];

const now = new Date();
const daysAgo = (n: number) => {
  const d = new Date(now);
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
};

export const MOCK_TRANSACTIONS: Transaction[] = [
  {
    id: 'tx-1',
    orgId: 'org-1',
    type: 'INCOME',
    amount: 5000000,
    description: 'Dîme dimanche',
    date: daysAgo(6),
    status: 'APPROVED',
    createdAt: new Date(now.getTime() - 7 * 86400000).toISOString(),
    updatedAt: new Date(now.getTime() - 6 * 86400000).toISOString(),
    createdById: 'user-1',
    approvedById: 'user-1',
    approvedAt: new Date(now.getTime() - 6 * 86400000).toISOString(),
    categoryId: 'cat-1',
    orgUnitId: null,
    compensatesFor: null,
    comment: null,
    version: 1,
    category: MOCK_CATEGORIES[0],
    creator: MOCK_USER,
    approver: MOCK_USER,
  },
  {
    id: 'tx-2',
    orgId: 'org-1',
    type: 'INCOME',
    amount: 1500000,
    description: 'Offrande oeuvre sociale',
    date: daysAgo(6),
    status: 'APPROVED',
    createdAt: new Date(now.getTime() - 7 * 86400000).toISOString(),
    updatedAt: new Date(now.getTime() - 6 * 86400000).toISOString(),
    createdById: 'user-1',
    approvedById: 'user-1',
    approvedAt: new Date(now.getTime() - 6 * 86400000).toISOString(),
    categoryId: 'cat-2',
    orgUnitId: null,
    compensatesFor: null,
    comment: null,
    version: 1,
    category: MOCK_CATEGORIES[1],
    creator: MOCK_USER,
    approver: MOCK_USER,
  },
  {
    id: 'tx-3',
    orgId: 'org-1',
    type: 'EXPENSE',
    amount: 250000,
    description: 'Frais électricité église',
    date: daysAgo(8),
    status: 'PENDING',
    createdAt: new Date(now.getTime() - 8 * 86400000).toISOString(),
    updatedAt: new Date(now.getTime() - 8 * 86400000).toISOString(),
    createdById: 'user-1',
    approvedById: null,
    approvedAt: null,
    categoryId: 'cat-6',
    orgUnitId: null,
    compensatesFor: null,
    comment: null,
    version: 1,
    category: MOCK_CATEGORIES[5],
    creator: MOCK_USER,
  },
  {
    id: 'tx-4',
    orgId: 'org-1',
    type: 'INCOME',
    amount: 750000,
    description: 'Offrande mission',
    date: daysAgo(3),
    status: 'DRAFT',
    createdAt: new Date(now.getTime() - 3 * 86400000).toISOString(),
    updatedAt: new Date(now.getTime() - 3 * 86400000).toISOString(),
    createdById: 'user-1',
    approvedById: null,
    approvedAt: null,
    categoryId: 'cat-3',
    orgUnitId: null,
    compensatesFor: null,
    comment: null,
    version: 1,
    category: MOCK_CATEGORIES[2],
    creator: MOCK_USER,
  },
  {
    id: 'tx-5',
    orgId: 'org-1',
    type: 'EXPENSE',
    amount: 100000,
    description: 'Aumône aux nécessiteux',
    date: daysAgo(10),
    status: 'APPROVED',
    createdAt: new Date(now.getTime() - 10 * 86400000).toISOString(),
    updatedAt: new Date(now.getTime() - 9 * 86400000).toISOString(),
    createdById: 'user-1',
    approvedById: 'user-1',
    approvedAt: new Date(now.getTime() - 9 * 86400000).toISOString(),
    categoryId: 'cat-9',
    orgUnitId: null,
    compensatesFor: null,
    comment: null,
    version: 1,
    category: MOCK_CATEGORIES[8],
    creator: MOCK_USER,
    approver: MOCK_USER,
  },
];

export const MOCK_AUDIT_ENTRIES: AuditEntry[] = [
  {
    id: 'audit-1',
    orgId: 'org-1',
    transactionId: 'tx-1',
    userId: 'user-1',
    action: 'CREATED',
    entityType: 'transaction',
    entityId: 'tx-1',
    comment: null,
    createdAt: new Date(now.getTime() - 7 * 86400000).toISOString(),
    user: MOCK_USER,
  },
  {
    id: 'audit-2',
    orgId: 'org-1',
    transactionId: 'tx-1',
    userId: 'user-1',
    action: 'APPROVED',
    entityType: 'transaction',
    entityId: 'tx-1',
    comment: null,
    createdAt: new Date(now.getTime() - 6 * 86400000).toISOString(),
    user: MOCK_USER,
  },
  {
    id: 'audit-3',
    orgId: 'org-1',
    transactionId: 'tx-3',
    userId: 'user-1',
    action: 'CREATED',
    entityType: 'transaction',
    entityId: 'tx-3',
    comment: null,
    createdAt: new Date(now.getTime() - 8 * 86400000).toISOString(),
    user: MOCK_USER,
  },
];
