export type OrgType = 'Eglise' | 'Ecole' | 'ONG' | 'Entreprise' | 'Institution' | 'Custom';

export const ORG_PRESETS: Record<OrgType, { primary: string; light: string; dark: string }> = {
  Eglise: { primary: '#FF6B00', light: '#FF8533', dark: '#CC5500' },
  Ecole: { primary: '#00A896', light: '#00D4B6', dark: '#007F72' },
  ONG: { primary: '#4CAF50', light: '#81C784', dark: '#388E3C' },
  Entreprise: { primary: '#2196F3', light: '#64B5F6', dark: '#1976D2' },
  Institution: { primary: '#3F51B5', light: '#7986CB', dark: '#303F9F' },
  Custom: { primary: '#FF6B00', light: '#FF8533', dark: '#CC5500' },
};

export type Role = 'PASTEUR' | 'SECRETAIRE' | 'TREASURIER' | 'COMPTABLE' | 'TREASURIER_ADJOINT' | 'SECRETAIRE_ADJOINT';

export type UserRole = Role;

export type User = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  org: Organization;
};

export type Organization = {
  id: string;
  name: string;
  type: OrgType;
  accentColor: string;
};

export type TransactionStatus = 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED';

export type TransactionType = 'INCOME' | 'EXPENSE';

export type Transaction = {
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
  category?: Category;
  orgUnit?: OrgUnit;
  creator?: User;
  approver?: User;
};

export type Category = {
  id: string;
  key: string;
  labelFr: string;
  type: TransactionType;
  orgId: string;
  isCustom?: boolean;
};

export type OrgUnit = {
  id: string;
  name: string;
  type: string;
  orgId: string;
};

export type AuditEntry = {
  id: string;
  orgId: string;
  transactionId: string;
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  comment: string | null;
  createdAt: string;
  user?: User;
};

export type NotificationItem = {
  id: string;
  orgId: string;
  actionType: string;
  title: string;
  message: string;
  isRead: boolean;
  sourceTransactionId: string | null;
  createdAt: string;
};

export type BalanceResult = {
  totalIncome: number;
  totalExpense: number;
  netResult: number;
  byCategory: { categoryId: string; income: number; expense: number; category?: Category }[];
  byOrgUnit: { orgUnitId: string; income: number; expense: number; orgUnit?: OrgUnit }[];
  transactionCount: number;
};
