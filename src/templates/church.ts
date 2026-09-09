/**
 * Church Template — reference implementation of the Template schema.
 *
 * This template demonstrates how a domain-specific configuration
 * implements the domain-agnostic Template interface defined in schema.ts.
 *
 * Capabilities: workflow, lifecycle, relationship, resource, security, notification
 * Entity types: Member, Event, Transaction, Group, Cotisation, Account
 *
 * Do NOT import from this file into shared infrastructure.
 * Templates are data — they are consumed by UI and capability layers.
 */

import type { Template } from "./schema";
import type { Role, Permission } from "@/types";
import { PERMISSION_MATRIX } from "@/lib/rbac";

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
  description: "Cycle de vie d’une transaction financière",
};

const eventWorkflow: Template["workflows"]["Event"] = {
  entityType: "Event",
  initialStatus: "PLANIFIED",
  terminalStatuses: ["COMPLETED", "CANCELLED"],
  transitions: [
    { from: "PLANIFIED", to: "ONGOING", label: "Démarrer" },
    { from: "ONGOING", to: "COMPLETED", label: "Terminer" },
    {
      from: "PLANIFIED",
      to: "CANCELLED",
      label: "Annuler",
      requiredPermission: "event:delete",
    },
    {
      from: "ONGOING",
      to: "CANCELLED",
      label: "Annuler",
      requiredPermission: "event:delete",
    },
  ],
  description: "Cycle de vie d’un événement (culte, réunion, activité)",
};

const memberWorkflow: Template["workflows"]["Member"] = {
  entityType: "Member",
  initialStatus: "ACTIVE",
  terminalStatuses: ["ARCHIVED"],
  transitions: [
    {
      from: "ACTIVE",
      to: "INACTIVE",
      label: "Désactiver",
      requiredPermission: "member:update",
    },
    {
      from: "INACTIVE",
      to: "ACTIVE",
      label: "Réactiver",
      requiredPermission: "member:update",
    },
    {
      from: "ACTIVE",
      to: "ARCHIVED",
      label: "Archiver",
      requiredPermission: "member:delete",
    },
    {
      from: "INACTIVE",
      to: "ARCHIVED",
      label: "Archiver",
      requiredPermission: "member:delete",
    },
  ],
  description: "Cycle de vie d’un membre",
};

// ─────────────────────────────────────────────────────────────────────────────
// Form templates
// ─────────────────────────────────────────────────────────────────────────────

const memberForm: Template["forms"]["member_enrollment"] = {
  key: "member_enrollment",
  label: "Inscription d’un membre",
  entityType: "Member",
  description: "Formulaire standard pour enregistrer un nouveau membre",
  fields: [
    {
      key: "firstName",
      label: "Prénom",
      type: "text",
      required: true,
      order: 1,
    },
    { key: "lastName", label: "Nom", type: "text", required: true, order: 2 },
    { key: "email", label: "Email", type: "text", required: false, order: 3 },
    {
      key: "phone",
      label: "Téléphone",
      type: "text",
      required: false,
      order: 4,
    },
    {
      key: "dateOfBirth",
      label: "Date de naissance",
      type: "date",
      required: false,
      order: 5,
    },
    {
      key: "gender",
      label: "Genre",
      type: "select",
      required: false,
      order: 6,
      options: ["Homme", "Femme"],
    },
    {
      key: "address",
      label: "Adresse",
      type: "textarea",
      required: false,
      order: 7,
    },
    {
      key: "baptized",
      label: "Baptisé",
      type: "boolean",
      required: false,
      order: 8,
    },
    {
      key: "baptismDate",
      label: "Date de baptême",
      type: "date",
      required: false,
      order: 9,
    },
    {
      key: "membershipDate",
      label: "Date d’adhésion",
      type: "date",
      required: true,
      order: 10,
    },
    {
      key: "notes",
      label: "Notes",
      type: "textarea",
      required: false,
      order: 11,
    },
  ],
};

const eventForm: Template["forms"]["event_creation"] = {
  key: "event_creation",
  label: "Création d’un événement",
  entityType: "Event",
  description: "Formulaire standard pour créer un événement",
  fields: [
    { key: "title", label: "Titre", type: "text", required: true, order: 1 },
    {
      key: "description",
      label: "Description",
      type: "textarea",
      required: false,
      order: 2,
    },
    {
      key: "eventType",
      label: "Type d’événement",
      type: "select",
      required: true,
      order: 3,
      options: [
        "Culte",
        "Réunion",
        "Étude biblique",
        "Activité jeunesse",
        "Autre",
      ],
    },
    {
      key: "startDate",
      label: "Date de début",
      type: "date",
      required: true,
      order: 4,
    },
    {
      key: "startTime",
      label: "Heure de début",
      type: "text",
      required: true,
      order: 5,
    },
    {
      key: "endDate",
      label: "Date de fin",
      type: "date",
      required: false,
      order: 6,
    },
    {
      key: "endTime",
      label: "Heure de fin",
      type: "text",
      required: false,
      order: 7,
    },
    { key: "location", label: "Lieu", type: "text", required: false, order: 8 },
    {
      key: "organizerId",
      label: "Organisateur",
      type: "reference",
      required: false,
      order: 9,
    },
    {
      key: "groupId",
      label: "Groupe associé",
      type: "reference",
      required: false,
      order: 10,
    },
    {
      key: "maxAttendees",
      label: "Nombre maximum de participants",
      type: "number",
      required: false,
      order: 11,
    },
  ],
};

const transactionForm: Template["forms"]["transaction_entry"] = {
  key: "transaction_entry",
  label: "Saisie d’une transaction",
  entityType: "Transaction",
  description: "Formulaire standard pour enregistrer une transaction",
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
      options: ["RECEITE", "DEPENSE"],
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
      label: "Référence (pieça, reçu…)",
      type: "text",
      required: false,
      order: 7,
    },
    {
      key: "source",
      label: "Source",
      type: "select",
      required: false,
      order: 8,
      options: ["CAISSE", "COTISATION", "PERSONNE", "AUTRE"],
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// Branding
// ─────────────────────────────────────────────────────────────────────────────

const branding: Template["branding"] = {
  colors: {
    primary: "#FF6B00",
    light: "#FF8533",
    dark: "#CC5500",
  },
  labels: {
    member: "Membre",
    member_plural: "Membres",
    event: "Événement",
    event_plural: "Événements",
    transaction: "Transaction",
    transaction_plural: "Transactions",
    group: "Groupe",
    group_plural: "Groupes",
    cotisation: "Cotisation",
    cotisation_plural: "Cotisations",
    dashboard_title: "Tableau de bord",
    tagline: "Gestion d’église",
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Role metadata
// ─────────────────────────────────────────────────────────────────────────────

const roleMeta: Template["roleMeta"] = {
  PASTEUR_PRINCIPAL: {
    label: "Pasteur Principal",
    hierarchy: 100,
    category: "Spirituel",
  },
  PASTEUR_ASSOCIE: {
    label: "Pasteur Associé",
    hierarchy: 85,
    category: "Spirituel",
  },
  PASTEUR_JEUNESSE: {
    label: "Pasteur Jeunesse",
    hierarchy: 80,
    category: "Spirituel",
  },
  ANCIEN: { label: "Ancien", hierarchy: 90, category: "Spirituel" },
  DIACRE: { label: "Diacre", hierarchy: 70, category: "Spirituel" },
  RESPONSABLE_DEPARTEMENT: {
    label: "Responsable Département",
    hierarchy: 60,
    category: "Administratif",
  },
  SECRETAIRE: { label: "Secrétaire", hierarchy: 45, category: "Administratif" },
  SECRETAIRE_ADJOINT: {
    label: "Secrétaire Adjoint",
    hierarchy: 40,
    category: "Administratif",
  },
  TREASURIER: { label: "Trésorier", hierarchy: 55, category: "Financier" },
  TREASURIER_ADJOINT: {
    label: "Trésorier Adjoint",
    hierarchy: 50,
    category: "Financier",
  },
  COMPTABLE: { label: "Comptable", hierarchy: 35, category: "Financier" },
  RESPONSABLE_GROUPE: {
    label: "Responsable Groupe",
    hierarchy: 30,
    category: "Communautaire",
  },
  BENEVOLE: { label: "Bénévole", hierarchy: 20, category: "Communautaire" },
  MEMBRE: { label: "Membre", hierarchy: 10, category: "Communautaire" },
};

// ─────────────────────────────────────────────────────────────────────────────
// Template definition
// ─────────────────────────────────────────────────────────────────────────────

export const churchTemplate: Template = {
  id: "church",
  name: "Eglise",
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
    Event: eventWorkflow,
    Member: memberWorkflow,
  },
  permissions: PERMISSION_MATRIX as unknown as Template["permissions"],
  roleMeta,
  forms: {
    member_enrollment: memberForm,
    event_creation: eventForm,
    transaction_entry: transactionForm,
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
