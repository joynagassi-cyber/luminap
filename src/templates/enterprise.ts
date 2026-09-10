/**
 * Enterprise Template — multi-store business with branches and equipment
 *
 * This template demonstrates how a domain-specific configuration
 * implements the domain-agnostic Template interface defined in schema.ts.
 *
 * Capabilities: workflow, lifecycle, relationship, resource, security, notification
 * Entity types: Store, Equipment, Transaction, Employee
 *
 * Do NOT import from this file into shared infrastructure.
 * Templates are data — they are consumed by UI and capability layers.
 */

import type { Template } from "./schema";
import type { Role, Permission } from "@/types";
import { ORG_PRESETS } from "@/types";

// ─────────────────────────────────────────────────────────────────────────────
// Workflow definitions
// ─────────────────────────────────────────────────────────────────────────────

const transactionWorkflow: Template["workflows"]["Transaction"] = {
  entityType: "Transaction",
  initialStatus: "DRAFT",
  terminalStatuses: ["APPROVED", "REJECTED"],
  transitions: [
    {
      from: "DRAFT",
      to: "PENDING",
      label: "Soumettre",
      requiredPermission: "transaction:create",
    },
    {
      from: "PENDING",
      to: "APPROVED",
      label: "Approuver",
      requiredPermission: "transaction:approve",
    },
    {
      from: "PENDING",
      to: "REJECTED",
      label: "Rejeter",
      requiredPermission: "transaction:reject",
    },
    {
      from: "DRAFT",
      to: "REJECTED",
      label: "Supprimer",
      requiredPermission: "transaction:delete",
    },
  ],
  description: "Cycle de vie d'une transaction de point de vente",
};

const storeWorkflow: Template["workflows"]["Store"] = {
  entityType: "Store",
  initialStatus: "ACTIVE",
  terminalStatuses: ["CLOSED"],
  transitions: [
    {
      from: "ACTIVE",
      to: "CLOSED",
      label: "Fermer",
      requiredPermission: "store:close",
    },
    {
      from: "CLOSED",
      to: "ACTIVE",
      label: "Ouvrir",
      requiredPermission: "store:open",
    },
  ],
  description: "Cycle de vie d'un point de vente",
};

const equipmentWorkflow: Template["workflows"]["Equipment"] = {
  entityType: "Equipment",
  initialStatus: "IN_USE",
  terminalStatuses: ["RETIRED"],
  transitions: [
    {
      from: "IN_USE",
      to: "MAINTENANCE",
      label: "Mise en maintenance",
      requiredPermission: "equipment:maintenance",
    },
    {
      from: "MAINTENANCE",
      to: "IN_USE",
      label: "Remettre en service",
      requiredPermission: "equipment:repair",
    },
    {
      from: "IN_USE",
      to: "RETIRED",
      label: "Radié",
      requiredPermission: "equipment:delete",
    },
    {
      from: "MAINTENANCE",
      to: "RETIRED",
      label: "Radié",
      requiredPermission: "equipment:delete",
    },
  ],
  description: "Cycle de vie d'un équipement",
};

// ─────────────────────────────────────────────────────────────────────────────
// Form templates
// ─────────────────────────────────────────────────────────────────────────────

const storeForm: Template["forms"]["creation_magasin"] = {
  key: "creation_magasin",
  label: "Création d'un magasin",
  entityType: "Store",
  description: "Formulaire pour créer un nouveau point de vente",
  fields: [
    { key: "name", label: "Nom du magasin", type: "text", required: true, order: 1 },
    {
      key: "address",
      label: "Adresse",
      type: "textarea",
      required: true,
      order: 2,
    },
    { key: "phone", label: "Téléphone", type: "text", required: false, order: 3 },
    {
      key: "managerId",
      label: "Gestionnaire",
      type: "reference",
      required: false,
      order: 4,
    },
    {
      key: "openingDate",
      label: "Date d'ouverture",
      type: "date",
      required: false,
      order: 5,
    },
    {
      key: "notes",
      label: "Notes",
      type: "textarea",
      required: false,
      order: 6,
    },
  ],
};

const equipmentForm: Template["forms"]["ajout_equipment"] = {
  key: "ajout_equipment",
  label: "Ajout d'équipement",
  entityType: "Equipment",
  description: "Formulaire pour enregistrer un nouvel équipement",
  fields: [
    { key: "name", label: "Nom", type: "text", required: true, order: 1 },
    {
      key: "category",
      label: "Catégorie",
      type: "select",
      required: true,
      order: 2,
      options: ["Informatique", "Mobilier", "Véhicule", "Outillage", "Électronique", "Autre"],
    },
    { key: "brand", label: "Marque", type: "text", required: false, order: 3 },
    { key: "model", label: "Modèle", type: "text", required: false, order: 4 },
    {
      key: "serialNumber",
      label: "N° de série",
      type: "text",
      required: false,
      order: 5,
    },
    {
      key: "purchaseDate",
      label: "Date d'achat",
      type: "date",
      required: false,
      order: 6,
    },
    {
      key: "purchasePrice",
      label: "Prix d'achat",
      type: "currency",
      required: false,
      order: 7,
    },
    {
      key: "storeId",
      label: "Magasin",
      type: "reference",
      required: true,
      order: 8,
    },
    {
      key: "notes",
      label: "Notes",
      type: "textarea",
      required: false,
      order: 9,
    },
  ],
};

const transactionForm: Template["forms"]["transaction_point_vente"] = {
  key: "transaction_point_vente",
  label: "Transaction point de vente",
  entityType: "Transaction",
  description: "Formulaire pour enregistrer une transaction au point de vente",
  fields: [
    {
      key: "amount",
      label: "Montant",
      type: "currency",
      required: true,
      order: 1,
    },
    {
      key: "type",
      label: "Type",
      type: "select",
      required: true,
      order: 2,
      options: ["RECETTE", "DEPENSE"],
    },
    {
      key: "categoryId",
      label: "Catégorie",
      type: "reference",
      required: true,
      order: 3,
    },
    {
      key: "accountId",
      label: "Caisse",
      type: "reference",
      required: true,
      order: 4,
    },
    { key: "date", label: "Date", type: "date", required: true, order: 5 },
    {
      key: "description",
      label: "Description",
      type: "textarea",
      required: false,
      order: 6,
    },
    {
      key: "reference",
      label: "Référence (pièce, reçu…)",
      type: "text",
      required: false,
      order: 7,
    },
    {
      key: "storeId",
      label: "Magasin",
      type: "reference",
      required: true,
      order: 8,
    },
    {
      key: "source",
      label: "Source",
      type: "select",
      required: false,
      order: 9,
      options: ["CAISSE", "COTISATION", "PERSONNE", "AUTRE"],
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// Branding
// ─────────────────────────────────────────────────────────────────────────────

const branding: Template["branding"] = {
  colors: ORG_PRESETS.Entreprise,
  labels: {
    member: "Employé",
    member_plural: "Employés",
    event: "Événement",
    event_plural: "Événements",
    transaction: "Transaction",
    transaction_plural: "Transactions",
    group: "Magasin",
    group_plural: "Magasins",
    cotisation: "Achats",
    cotisation_plural: "Achats",
    dashboard_title: "Tableau de bord",
    tagline: "Gestion multi-magasin",
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Role metadata
// ─────────────────────────────────────────────────────────────────────────────

const roleMeta: Template["roleMeta"] = {
  DIRECTEUR_REGIONAL: {
    label: "Directeur Régional",
    hierarchy: 100,
    category: "Direction",
  },
  GESTIONNAIRE_MAGASIN: {
    label: "Gestionnaire de Magasin",
    hierarchy: 70,
    category: "Management",
  },
  CAISSIER: {
    label: "Caissier",
    hierarchy: 40,
    category: "Vente",
  },
  EMPLOYE: {
    label: "Employé",
    hierarchy: 20,
    category: "Personnel",
  },
  // Church roles required by the Role union type but unused in this template
  PASTEUR_PRINCIPAL: { label: "Pasteur Principal", hierarchy: 0 },
  PASTEUR_ASSOCIE: { label: "Pasteur Associé", hierarchy: 0 },
  PASTEUR_JEUNESSE: { label: "Pasteur Jeunesse", hierarchy: 0 },
  ANCIEN: { label: "Ancien", hierarchy: 0 },
  DIACRE: { label: "Diacre", hierarchy: 0 },
  RESPONSABLE_DEPARTEMENT: { label: "Responsable Département", hierarchy: 0 },
  SECRETAIRE: { label: "Secrétaire", hierarchy: 0 },
  SECRETAIRE_ADJOINT: { label: "Secrétaire Adjoint", hierarchy: 0 },
  TREASURIER: { label: "Trésorier", hierarchy: 0 },
  TREASURIER_ADJOINT: { label: "Trésorier Adjoint", hierarchy: 0 },
  COMPTABLE: { label: "Comptable", hierarchy: 0 },
  RESPONSABLE_GROUPE: { label: "Responsable Groupe", hierarchy: 0 },
  BENEVOLE: { label: "Bénévole", hierarchy: 0 },
  MEMBRE: { label: "Membre", hierarchy: 0 },
} as unknown as Template["roleMeta"];

// ─────────────────────────────────────────────────────────────────────────────
// Permission matrix
// ─────────────────────────────────────────────────────────────────────────────

const PERMISSIONS: Record<string, Permission[]> = {
  DIRECTEUR_REGIONAL: [
    "transaction:create",
    "transaction:read",
    "transaction:update",
    "transaction:approve",
    "transaction:reject",
    "transaction:delete",
    "store:create",
    "store:read",
    "store:update",
    "store:delete",
    "store:open",
    "store:close",
    "equipment:create",
    "equipment:read",
    "equipment:update",
    "equipment:delete",
    "equipment:assign",
    "equipment:unassign",
    "equipment:maintenance",
    "equipment:repair",
    "report:read",
    "report:export",
    "admin:settings",
    "admin:roles",
    "invitation:create",
    "invitation:revoke",
    "invitation:manage",
  ] as Permission[],
  GESTIONNAIRE_MAGASIN: [
    "transaction:create",
    "transaction:read",
    "transaction:update",
    "transaction:approve",
    "transaction:reject",
    "store:read",
    "store:update",
    "store:open",
    "store:close",
    "equipment:create",
    "equipment:read",
    "equipment:update",
    "equipment:delete",
    "equipment:assign",
    "equipment:unassign",
    "equipment:maintenance",
    "report:read",
    "invitation:create",
  ] as Permission[],
  CAISSIER: [
    "transaction:create",
    "transaction:read",
    "transaction:update",
    "store:read",
    "equipment:read",
  ] as Permission[],
  EMPLOYE: [
    "transaction:read",
    "store:read",
    "equipment:read",
  ] as Permission[],
  // Church roles — no enterprise permissions
  PASTEUR_PRINCIPAL: [] as Permission[],
  PASTEUR_ASSOCIE: [] as Permission[],
  PASTEUR_JEUNESSE: [] as Permission[],
  ANCIEN: [] as Permission[],
  DIACRE: [] as Permission[],
  RESPONSABLE_DEPARTEMENT: [] as Permission[],
  SECRETAIRE: [] as Permission[],
  SECRETAIRE_ADJOINT: [] as Permission[],
  TREASURIER: [] as Permission[],
  TREASURIER_ADJOINT: [] as Permission[],
  COMPTABLE: [] as Permission[],
  RESPONSABLE_GROUPE: [] as Permission[],
  BENEVOLE: [] as Permission[],
  MEMBRE: [] as Permission[],
};

// ─────────────────────────────────────────────────────────────────────────────
// Template definition
// ─────────────────────────────────────────────────────────────────────────────

export const enterpriseTemplate: Template = {
  id: "enterprise",
  name: "Entreprise",
  version: "1.0.0",
  capabilities: [
    "workflow",
    "lifecycle",
    "relationship",
    "resource",
    "security",
    "notification",
  ],
  workflows: {
    Transaction: transactionWorkflow,
    Store: storeWorkflow,
    Equipment: equipmentWorkflow,
  },
  permissions: PERMISSIONS as unknown as Template["permissions"],
  roleMeta,
  forms: {
    creation_magasin: storeForm,
    ajout_equipment: equipmentForm,
    transaction_point_vente: transactionForm,
  },
  branding,
  // No policies defined at template level — policies live in lifecycle capability callers.
};

// ─────────────────────────────────────────────────────────────────────────────
// Named export for convenience
// ─────────────────────────────────────────────────────────────────────────────

export type {
  Template,
  WorkflowDefinition,
  WorkflowTransition,
  TemplateForm,
  TemplateFormField,
  TemplateBranding,
  TemplateColors,
  TemplateLabels,
} from "./schema";
export type { CapabilityKey } from "./schema";
