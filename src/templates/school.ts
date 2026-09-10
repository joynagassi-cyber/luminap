/**
 * School Template — education/academic organization
 *
 * Capabilities: workflow, lifecycle, relationship, resource, security, notification
 * Entity types: Student, Teacher, Class, Course, Expense
 */

import type { Template } from "./schema";
import type { Role, Permission } from "@/types";

// ─────────────────────────────────────────────────────────────────────────────
// Workflow definitions
// ─────────────────────────────────────────────────────────────────────────────

const studentWorkflow: Template["workflows"]["Student"] = {
  entityType: "Student",
  initialStatus: "ENROLLED",
  terminalStatuses: ["GRADUATED", "EXPELLED"],
  transitions: [
    {
      from: "ENROLLED",
      to: "SUSPENDED",
      label: "Suspendre",
      requiredPermission: "student:update",
    },
    {
      from: "SUSPENDED",
      to: "ENROLLED",
      label: "Réactiver",
      requiredPermission: "student:update",
    },
    {
      from: "ENROLLED",
      to: "GRADUATED",
      label: "Diplômer",
      requiredPermission: "student:graduate",
    },
    {
      from: "ENROLLED",
      to: "EXPELLED",
      label: "Exclure",
      requiredPermission: "student:delete",
    },
  ],
  description: "Cycle de vie d'un élève",
};

const teacherWorkflow: Template["workflows"]["Teacher"] = {
  entityType: "Teacher",
  initialStatus: "ACTIVE",
  terminalStatuses: ["RESIGNED"],
  transitions: [
    {
      from: "ACTIVE",
      to: "ON_LEAVE",
      label: "Mettre en congé",
      requiredPermission: "teacher:update",
    },
    {
      from: "ON_LEAVE",
      to: "ACTIVE",
      label: "Réactiver",
      requiredPermission: "teacher:update",
    },
    {
      from: "ACTIVE",
      to: "RESIGNED",
      label: "Résilier",
      requiredPermission: "teacher:delete",
    },
  ],
  description: "Cycle de vie d'un enseignant",
};

const classWorkflow: Template["workflows"]["Class"] = {
  entityType: "Class",
  initialStatus: "PLANNED",
  terminalStatuses: ["COMPLETED", "CANCELLED"],
  transitions: [
    { from: "PLANNED", to: "ACTIVE", label: "Ouvrir" },
    { from: "ACTIVE", to: "COMPLETED", label: "Terminer" },
    { from: "PLANNED", to: "CANCELLED", label: "Annuler", requiredPermission: "class:delete" },
    { from: "ACTIVE", to: "CANCELLED", label: "Annuler", requiredPermission: "class:delete" },
  ],
  description: "Cycle de vie d'une classe",
};

// ─────────────────────────────────────────────────────────────────────────────
// Form templates
// ─────────────────────────────────────────────────────────────────────────────

const studentForm: Template["forms"]["student_enrollment"] = {
  key: "student_enrollment",
  label: "Inscription d'un élève",
  entityType: "Student",
  description: "Formulaire standard pour inscrire un nouvel élève",
  fields: [
    { key: "firstName", label: "Prénom", type: "text", required: true, order: 1 },
    { key: "lastName", label: "Nom", type: "text", required: true, order: 2 },
    { key: "dateOfBirth", label: "Date de naissance", type: "date", required: true, order: 3 },
    { key: "parentName", label: "Nom du parent/tuteur", type: "text", required: true, order: 4 },
    { key: "parentPhone", label: "Téléphone du parent", type: "text", required: false, order: 5 },
    { key: "address", label: "Adresse", type: "textarea", required: false, order: 6 },
    { key: "classId", label: "Classe", type: "reference", required: true, order: 7 },
    { key: "enrollmentDate", label: "Date d'inscription", type: "date", required: true, order: 8 },
  ],
};

const expenseForm: Template["forms"]["expense_entry"] = {
  key: "expense_entry",
  label: "Saisie de dépense",
  entityType: "Expense",
  description: "Formulaire standard pour enregistrer une dépense",
  fields: [
    { key: "amount", label: "Montant", type: "currency", required: true, order: 1 },
    { key: "description", label: "Description", type: "textarea", required: true, order: 2 },
    { key: "date", label: "Date", type: "date", required: true, order: 3 },
    { key: "category", label: "Catégorie", type: "select", required: true, order: 4, options: ["Matériel", "Entretien", "Restauration", "Transport", "Fournitures", "Autre"] },
    { key: "accountId", label: "Caisse", type: "reference", required: true, order: 5 },
    { key: "reference", label: "Référence (facture…)", type: "text", required: false, order: 6 },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// Branding
// ─────────────────────────────────────────────────────────────────────────────

const branding: Template["branding"] = {
  colors: {
    primary: "#00A896",
    light: "#00D4B6",
    dark: "#007F72",
  },
  labels: {
    member: "Élève",
    member_plural: "Élèves",
    event: "Cours",
    event_plural: "Cours",
    transaction: "Dépense",
    transaction_plural: "Dépenses",
    group: "Classe",
    group_plural: "Classes",
    cotisation: "Scolarité",
    cotisation_plural: "Scolarités",
    dashboard_title: "Tableau de bord",
    tagline: "Gestion d'école",
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Role metadata
// ─────────────────────────────────────────────────────────────────────────────

const roleMeta: Record<string, { label: string; hierarchy: number; category: string }> = {
  DIRECTEUR: { label: "Directeur", hierarchy: 100, category: "Direction" },
  ADMINISTRATION: { label: "Administrateur", hierarchy: 80, category: "Administratif" },
  PROFESSEUR: { label: "Professeur", hierarchy: 60, category: "Enseignement" },
  SURVEILLANT: { label: "Surveillant", hierarchy: 40, category: "Vie scolaire" },
  PERSONNEL: { label: "Personnel", hierarchy: 20, category: "Service" },
  PARENT: { label: "Parent", hierarchy: 10, category: "Famille" },
  ELEVE: { label: "Élève", hierarchy: 5, category: "Étudiant" },
};

// ─────────────────────────────────────────────────────────────────────────────
// Template definition
// ─────────────────────────────────────────────────────────────────────────────

export const schoolTemplate: Template = {
  id: "school",
  name: "École",
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
    Student: studentWorkflow,
    Teacher: teacherWorkflow,
    Class: classWorkflow,
  },
  permissions: {
    DIRECTEUR: [
      "student:create", "student:read", "student:update", "student:delete", "student:graduate",
      "teacher:create", "teacher:read", "teacher:update", "teacher:delete",
      "class:create", "class:read", "class:update", "class:delete",
      "transaction:create", "transaction:read", "transaction:update", "transaction:approve", "transaction:delete",
      "expense:create", "expense:read", "expense:update", "expense:delete",
      "report:read", "report:export",
      "admin:settings", "admin:roles",
      "invitation:create", "invitation:revoke", "invitation:manage",
    ] as Permission[],
    ADMINISTRATION: [
      "student:create", "student:read", "student:update",
      "teacher:read",
      "class:create", "class:read", "class:update",
      "transaction:create", "transaction:read", "transaction:update",
      "expense:create", "expense:read", "expense:update",
      "report:read",
      "invitation:create",
    ] as Permission[],
    PROFESSEUR: [
      "student:read",
      "class:read",
      "transaction:read",
      "expense:read",
      "report:read",
    ] as Permission[],
    SURVEILLANT: [
      "student:read",
      "class:read",
      "transaction:read",
    ] as Permission[],
    PERSONNEL: [
      "student:read",
      "class:read",
      "transaction:read",
    ] as Permission[],
    PARENT: [
      "student:read",
      "class:read",
    ] as Permission[],
    ELEVE: [
      "class:read",
    ] as Permission[],
  } as unknown as Template["permissions"],
  roleMeta: roleMeta as any,
  forms: {
    student_enrollment: studentForm,
    expense_entry: expenseForm,
  },
  branding,
};
