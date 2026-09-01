/**
 * Server-side type definitions.
 * Keep in sync with src/types/index.ts but defined locally to avoid
 * importing Vite-resolved aliases in the Nitro server build.
 */

export type OrgType = 'Eglise' | 'Ecole' | 'ONG' | 'Entreprise' | 'Institution' | 'Custom';

export type Role = 'ADMIN' | 'TREASURER' | 'APPROVER';

export type TransactionStatus = 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED';

export type TransactionType = 'INCOME' | 'EXPENSE';

export interface ServerCategory {
  id: string;
  key: string;
  labelFr: string;
  type: TransactionType;
  orgId: string;
}

export interface ServerOrgUnit {
  id: string;
  name: string;
  type: string;
  orgId: string;
}

export interface ServerTransaction {
  id: string;
  orgId: string;
  type: TransactionType;
  amount: number;
  description: string;
  date: string;
  status: TransactionStatus;
  createdAt: string;
  updatedAt: string;
  createdById: string;
  approvedById: string | null;
  approvedAt: string | null;
  categoryId: string;
  orgUnitId: string | null;
  compensatesFor: string | null;
  comment: string | null;
  version: number;
  category?: ServerCategory;
  orgUnit?: ServerOrgUnit;
}
