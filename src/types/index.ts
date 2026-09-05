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

export type TransactionStatus = 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED';
export type TransactionType = 'INCOME' | 'EXPENSE';
export type FundSource = 'CAISSE' | 'COTISATION' | 'PERSONNE' | 'AUTRE';
export type CaisseType = 'MAIN' | 'GROUP';
export type EventStatus = 'PLANIFIED' | 'ONGOING' | 'COMPLETED' | 'CANCELLED';
export type MemberStatus = 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
export type GroupStatus = 'ACTIVE' | 'ARCHIVED';
export type AccountStatus = 'ACTIVE' | 'ARCHIVED';
export type VersementStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';

export type Organization = {
  id: string;
  name: string;
  type: OrgType;
  accentColor: string;
  logoUrl?: string;
};

export type User = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  org: Organization;
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
  description: string;
  orgId: string;
  isActive: boolean;
};

export type Caisse = {
  id: string;
  name: string;
  description: string;
  type: CaisseType;
  color: string;
  orgId: string;
  createdAt: string;
  updatedAt: string;
};

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
  eventId: string | null;
  source: FundSource | null;
  personName: string | null;
  compensatesFor: string | null;
  comment: string | null;
  version: number;
  sourceCaisseId: string | null;
  versementId: string | null;
  reversalOfId: string | null;
  category?: Category;
  orgUnit?: OrgUnit;
  event?: Event;
  creator?: User;
  approver?: User;
};

export type BudgetItem = {
  id: string;
  label: string;
  allocated: number;
  spent: number;
  fundedBy: 'main' | string;
  categoryId?: string;
  isCustom?: boolean;
};

export type ShoppingItem = {
  id: string;
  label: string;
  quantity: number;
  unitPrice: number;
  total: number;
  status: 'PENDING' | 'ORDERED' | 'RECEIVED' | 'CANCELLED';
  supplier?: string;
  notes?: string;
};

export type Event = {
  id: string;
  orgId: string;
  name: string;
  description: string;
  startDate: string;
  endDate: string | null;
  status: EventStatus;
  budget: number;
  budgetItems: BudgetItem[];
  shoppingItems: ShoppingItem[];
  createdAt: string;
  updatedAt: string;
};

export type AuditEntry = {
  id: string;
  orgId: string;
  transactionId: string | null;
  userId: string;
  actorRoleAtTime: string | null;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'APPROVE' | 'REJECT' | 'ARCHIVE' | 'RESTORE' | 'SUBMIT' | 'CLOSE' | 'REVISE';
  entityType: string;
  entityId: string;
  beforeState: any | null;
  afterState: any | null;
  comment: string | null;
  createdAt: string;
  user?: User;
};

export type AppConfig = {
  churchName: string;
  churchLogoUrl: string;
  userPhoto: string;
};

export type VersementRecord = {
  id: string;
  orgId: string;
  sourceCaisseId: string;
  targetCaisseId: string;
  amount: number;
  createdAt: string;
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

export type RoleAssignment = {
  sessionId: string;
  role: Role;
  orgId: string;
  createdAt: string;
};

export type SyncQueueItem = {
  id: string;
  operation: string;
  entityType: string;
  entityId: string;
  payload: any;
  attempts: number;
  lastAttempt: string | null;
  createdAt: string;
};

// === NEW TYPE: Member ===
export type Member = {
  id: string;
  orgId: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  email: string | null;
  status: MemberStatus;
  joinedAt: string;
  archivedAt: string | null;
  archivedBy: string | null;
  archiveReason: string | null;
  createdAt: string;
  updatedAt: string;
};

// === NEW TYPE: Group (canonical) ===
export type Group = {
  id: string;
  orgId: string;
  name: string;
  parentGroupId: string | null;
  responsableMemberId: string | null;
  status: GroupStatus;
  archivedAt: string | null;
  archivedBy: string | null;
  archiveReason: string | null;
  createdAt: string;
  updatedAt: string;
};

// === NEW TYPE: Account (canonical) ===
export type Account = {
  id: string;
  orgId: string;
  ownerType: 'ORGANIZATION' | 'GROUP';
  ownerId: string;
  name: string;
  currency: string;
  status: AccountStatus;
  archivedAt: string | null;
  archivedBy: string | null;
  archiveReason: string | null;
  createdAt: string;
  updatedAt: string;
};

// === NEW TYPE: GroupMembership ===
export type GroupMembership = {
  id: string;
  memberId: string;
  groupId: string;
  roleInGroup: 'MEMBRE' | 'RESPONSABLE';
  joinedAt: string;
  leftAt: string | null;
  createdAt: string;
};

// === NEW TYPE: Versement (canonical entity) ===
export type Versement = {
  id: string;
  orgId: string;
  fromAccountId: string;
  toAccountId: string;
  amountCents: number;
  date: string;
  status: VersementStatus;
  createdBy: string;
  approvedBy: string | null;
  approvedAt: string | null;
  createdAt: string;
};

// === NEW TYPE: EventBudget ===
export type EventBudget = {
  id: string;
  eventId: string;
  currency: string;
  revisedAt: string | null;
  revisedBy: string | null;
  createdAt: string;
};

// === NEW TYPE: BudgetLine ===
export type BudgetLine = {
  id: string;
  eventBudgetId: string;
  categoryId: string;
  plannedAmountCents: number;
  actualAmountCents: number;
  createdAt: string;
};

// === NEW TYPE: ReportDefinition ===
export type ReportDefinition = {
  id: string;
  orgId: string;
  name: string;
  dataSource: string;
  dimensions: string[];
  metrics: string[];
  filters: any[];
  groupBy: string[];
  sortBy: string | null;
  savedBy: string | null;
  isTemplate: boolean;
  createdAt: string;
  updatedAt: string;
};

// === NEW TYPE: FormFieldDefinition ===
export type FormFieldDefinition = {
  key: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select' | 'boolean' | 'currency' | 'reference' | 'textarea' | 'file';
  required: boolean;
  validation?: { min?: number; max?: number; regex?: string; custom?: string };
  options?: string[];
  referenceEntityType?: string;
  conditional?: { showIfField: string; showIfValue: any };
  mapsToEntityField?: string;
  order: number;
};

// === NEW TYPE: FormDefinition ===
export type FormDefinition = {
  id: string;
  orgId: string;
  key: string;
  name: string;
  description?: string;
  version: number;
  targetEntityType?: string;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  fields: FormFieldDefinition[];
  createdAt: string;
  updatedAt: string;
};

// === NEW TYPE: FormSubmission ===
export type FormSubmission = {
  id: string;
  orgId: string;
  formDefinitionId: string;
  formVersion: number;
  submittedBy: string;
  submittedAt: string;
  data: Record<string, any>;
  linkedEntityType?: string;
  linkedEntityId?: string;
  status: 'SUBMITTED' | 'PROCESSED' | 'REJECTED';
  createdAt: string;
};

// === NEW TYPE: CustomFieldDefinition ===
export type CustomFieldDefinition = {
  id: string;
  orgId: string;
  entityType: string;
  key: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select' | 'boolean';
  options?: string[];
  order: number;
};

// === NEW TYPE: CustomFieldValue ===
export type CustomFieldValue = {
  id: string;
  entityType: string;
  entityId: string;
  customFieldDefinitionId: string;
  value: any;
  createdAt: string;
  updatedAt: string;
};

// === NEW TYPE: ArchivableEntity ===
export type ArchivableEntity = 'Group' | 'Event' | 'Member' | 'Account' | 'Category' | 'Role';

// === NEW TYPE: Permission ===
export type Permission = string;

// === REPORT RESULT ===
export type ReportResult = {
  rows: Record<string, any>[];
  columns: string[];
  total: number;
};
