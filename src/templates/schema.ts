/**
 * Template Schema — domain-agnostic template definition interface
 *
 * A Template is a configuration bundle that describes:
 *   - Which capabilities a domain supports
 *   - What workflows (status transitions) exist for each entity type
 *   - The role-permission matrix (RBAC)
 *   - Pre-defined form definitions for common entity types
 *   - Branding and localization labels
 *
 * Usage:
 *   import { churchTemplate } from '@/templates/church'
 *   const cap = churchTemplate.capabilities   // ['workflow', ...]
 *   const wf  = churchTemplate.workflows      // { Transaction: {...}, Event: {...} }
 *   const perms = churchTemplate.permissions  // Record<Role, Permission[]>
 *   const forms = churchTemplate.forms        // Record<string, FormDefinition>
 *   const brand = churchTemplate.branding     // { colors, labels, ... }
 */

import type { Permission } from "@/types";
import type { Role } from "@/types";

// ─────────────────────────────────────────────────────────────────────────────
// Capability identifiers — domain-agnostic enum
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Supported capability keys.
 * A template declares which of these it enables.
 */
export type CapabilityKey =
  | "workflow"
  | "lifecycle"
  | "relationship"
  | "resource"
  | "security"
  | "notification"
  | "identity"
  | "organization";

// ─────────────────────────────────────────────────────────────────────────────
// Workflow definition
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A single allowed status transition in a workflow.
 */
export interface WorkflowTransition {
  /** Current status */
  from: string;
  /** Target status */
  to: string;
  /** Optional human-readable label for the transition */
  label?: string;
  /** Optional permission required to trigger this transition */
  requiredPermission?: Permission;
}

/**
 * Workflow definition for a single entity type.
 * Describes the status lifecycle of that entity.
 */
export interface WorkflowDefinition {
  /** Entity type this workflow applies to, e.g. 'Transaction', 'Event' */
  entityType: string;
  /** Initial status when a new entity is created */
  initialStatus: string;
  /** Set of terminal (immutable) statuses */
  terminalStatuses: string[];
  /** Allowed status transitions */
  transitions: WorkflowTransition[];
  /** Optional description */
  description?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Permission / RBAC
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Role-based permission matrix.
 * Maps each role to its list of allowed permissions.
 */
export type PermissionMatrix = Readonly<Record<Role, Permission[]>>;

/**
 * Role metadata for UI display.
 */
export interface RoleMeta {
  /** Display label (localized) */
  label: string;
  /** Hierarchy level (higher = more privileges) */
  hierarchy: number;
  /** Optional category for grouping in UI */
  category?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Form definition (aligned with existing FormDefinition type)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Field type used in template form definitions.
 */
export type FormFieldType =
  | "text"
  | "number"
  | "date"
  | "select"
  | "boolean"
  | "currency"
  | "reference"
  | "textarea"
  | "file";

/**
 * Single field in a template form definition.
 */
export interface TemplateFormField {
  key: string;
  label: string;
  type: FormFieldType;
  required: boolean;
  order: number;
  /** Pre-populated options for select fields */
  options?: string[];
  /** Regex or min/max validation rule */
  validation?: { min?: number; max?: number; regex?: string };
}

/**
 * A pre-defined form template for an entity type.
 */
export interface TemplateForm {
  /** Unique form key, e.g. 'member_enrollment' */
  key: string;
  /** Display name */
  label: string;
  /** Entity type this form targets */
  entityType: string;
  /** Fields in order */
  fields: TemplateFormField[];
  /** Optional description */
  description?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Branding
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Color tokens for the template's visual identity.
 */
export interface TemplateColors {
  primary: string;
  light: string;
  dark: string;
}

/**
 * Localized label overrides for domain-specific terminology.
 */
export interface TemplateLabels {
  /** Label for "member" entity */
  member: string;
  /** Plural */
  member_plural: string;
  /** Label for "event" entity */
  event: string;
  /** Plural */
  event_plural: string;
  /** Label for "transaction" entity */
  transaction: string;
  /** Plural */
  transaction_plural: string;
  /** Label for "group" entity */
  group: string;
  /** Plural */
  group_plural: string;
  /** Label for "cotisation" (contribution) */
  cotisation: string;
  /** Plural */
  cotisation_plural: string;
  /** Dashboard title */
  dashboard_title: string;
  /** App subtitle / tagline */
  tagline?: string;
  /** Additional free-form label overrides */
  [key: string]: string | undefined;
}

/**
 * Branding configuration for a template.
 */
export interface TemplateBranding {
  /** Primary / light / dark color tokens */
  colors: TemplateColors;
  /** Domain-specific terminology labels */
  labels: TemplateLabels;
  /** Optional logo URL */
  logoUrl?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Template — the top-level interface
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A Template is a portable configuration bundle.
 *
 * Schema level is domain-agnostic — church, school, NGO, and enterprise
 * templates all implement the same interface.
 *
 * Fields:
 *   id            — unique template identifier
 *   name          — human-readable name
 *   version       — semantic version of the template definition
 *   capabilities  — which capability modules are enabled
 *   workflows     — per-entity-type workflow definitions
 *   permissions   — role-permission matrix
 *   roleMeta      — display metadata for roles
 *   forms         — pre-defined form templates
 *   branding      — visual identity and labels
 *   policies      — optional domain-specific rules (archive guards, etc.)
 */
export interface Template {
  /** Unique machine-readable identifier, e.g. 'church' */
  id: string;
  /** Human-readable name, e.g. 'Eglise' */
  name: string;
  /** Semantic version of the template definition itself */
  version: string;
  /** Enabled capability keys */
  capabilities: CapabilityKey[];
  /** Workflow definitions keyed by entity type */
  workflows: Record<string, WorkflowDefinition>;
  /** Role-permission matrix (source of truth for RBAC) */
  permissions: PermissionMatrix;
  /** Role display metadata */
  roleMeta: Record<Role, RoleMeta>;
  /** Pre-defined form templates keyed by form key */
  forms: Record<string, TemplateForm>;
  /** Branding and localized labels */
  branding: TemplateBranding;
  /**
   * Optional lifecycle policies — entity-type-specific archive/restore guards.
   * Keyed by entity type. Return { ok: true } or { ok: false, reason: string }.
   */
  policies?: Record<
    string,
    {
      canArchive: (
        entityId: string,
      ) => Promise<{ ok: boolean; reason?: string }>;
      canRestore: (
        entityId: string,
      ) => Promise<{ ok: boolean; reason?: string }>;
    }
  >;
}

// ─────────────────────────────────────────────────────────────────────────────
// Runtime helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Check whether a template supports a given capability.
 */
export function hasCapability(t: Template, capability: CapabilityKey): boolean {
  return t.capabilities.includes(capability);
}

/**
 * Get the workflow definition for an entity type, if it exists.
 */
export function getWorkflow<T extends Template>(
  t: T,
  entityType: string,
): WorkflowDefinition | undefined {
  return t.workflows[entityType];
}

/**
 * Get all allowed transitions for an entity type from a given status.
 */
export function getAvailableTransitions(
  t: Template,
  entityType: string,
  currentStatus: string,
): WorkflowTransition[] {
  const wf = t.workflows[entityType];
  if (!wf) return [];
  return wf.transitions.filter((tr) => tr.from === currentStatus);
}

/**
 * Check whether a status is terminal for a given entity type.
 */
export function isTerminal(
  t: Template,
  entityType: string,
  status: string,
): boolean {
  return t.workflows[entityType]?.terminalStatuses.includes(status) ?? false;
}

/**
 * Check whether a role has a given permission (delegates to permissions matrix).
 */
export function hasPermission(
  t: Template,
  role: Role,
  permission: Permission,
): boolean {
  return t.permissions[role]?.includes(permission) ?? false;
}
