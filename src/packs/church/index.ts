/**
 * Church Business Pack
 *
 * Centralizes all church-specific data and helpers that used to live in the
 * shared infrastructure (useLocalStore, rbac.ts):
 *   - Default user / org seed data
 *   - Default categories (dime, offrande, ... — church vocabulary)
 *   - Default caisses / org units
 *   - Church-specific role helpers (isSpiritualLeader, canManageFinance)
 *
 * The seed data is exposed as a LAZY factory (`churchSeedData()`) so that
 * calling `getOrganizationId()` does not happen at module-load time. This
 * matters because this pack is transitively imported by `lib/rbac.ts`, which
 * is loaded during tests where the org context mock is not yet seeded.
 *
 * This pack is consumed by the store and rbac layers; new code should import
 * from here, not from lib/.
 */

import { getOrganizationId } from "@/lib/orgContext";
import { CANONICAL_CATEGORIES } from "@/lib/canonicalCategories";
import type { Role } from "@/types";
import type { Category, Caisse, OrgUnit, User } from "@/types";

export interface ChurchSeedData {
  user: User;
  categories: Category[];
  caisses: Caisse[];
  orgUnits: OrgUnit[];
}

/**
 * Build the church seed data for the current organization.
 * Call sites: useLocalStore (state initialization + loadInitialData).
 */
export function churchSeedData(): ChurchSeedData {
  const orgId = getOrganizationId();

  const user: User = {
    id: "local-user",
    email: "",
    firstName: "Utilisateur",
    lastName: "",
    role: "TREASURIER",
    org: {
      id: orgId,
      name: "Eglise MFE-JC Centrale",
      type: "Eglise",
      accentColor: "#FF6B00",
    },
  };

  // Identifiants issus de la source unique (R89.a) : les mêmes valeurs sont
  // seedées côté serveur par 20261026000006_seed_canonical_categories.sql, ce
  // qui garantit que la clé étrangère transactions.category_id résout.
  const categories: Category[] = CANONICAL_CATEGORIES.map((c) => ({
    ...c,
    orgId,
  }));

  const now = new Date().toISOString();
  const caisses: Caisse[] = [
    {
      id: "main",
      name: "Caisse principale",
      description: "Fonds de l'eglise",
      type: "MAIN",
      color: "#FF6B00",
      orgId: orgId,
      createdAt: now,
      updatedAt: now,
      archivedAt: null,
      archivedBy: null,
      archiveReason: null,
      status: "ACTIVE",
    },
  ];

  const orgUnits: OrgUnit[] = [
    {
      id: orgId,
      name: "Eglise MFE-JC Centrale",
      type: "eglise",
      description: "Eglise mere",
      orgId,
      isActive: true,
    },
  ];

  return { user, categories, caisses, orgUnits };
}

// Backward-compatible named exports (the store's `export { DEFAULT_USER }`).
// These are now the *first* seed's user; kept for compatibility with mocks.
export const DEFAULT_USER: User = {
  id: "local-user",
  email: "",
  firstName: "Utilisateur",
  lastName: "",
  role: "TREASURIER",
  org: {
    id: "org-1",
    name: "Eglise MFE-JC Centrale",
    type: "Eglise",
    accentColor: "#FF6B00",
  },
};

// ─── Church-specific role helpers (pure — safe at module load) ─────────

/**
 * CHURCH-SPECIFIC: Is this role a spiritual leader?
 * Not portable to School/Company/NGO — belongs in the church pack.
 */
export function isSpiritualLeader(role: Role): boolean {
  return [
    "PASTEUR_PRINCIPAL",
    "PASTEUR_ASSOCIE",
    "PASTEUR_JEUNESSE",
    "ANCIEN",
  ].includes(role);
}

/**
 * CHURCH-SPECIFIC: Is this role allowed to manage finance?
 * Not portable to School/Company/NGO — belongs in the church pack.
 */
export function canManageFinance(role: Role): boolean {
  return [
    "PASTEUR_PRINCIPAL",
    "ANCIEN",
    "TREASURIER",
    "TREASURIER_ADJOINT",
    "DIACRE",
  ].includes(role);
}
