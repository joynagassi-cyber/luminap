/**
 * roleGuide — description lisible des rôles, DÉRIVÉE du RBAC réel.
 *
 * ── Le défaut corrigé ────────────────────────────────────────────────────────
 * La page d'aide listait six rôles saisis à la main, dont `PASTEUR` — qui
 * n'existe pas. Le type `Role` définit `PASTEUR_PRINCIPAL`, `PASTEUR_ASSOCIE`
 * et `PASTEUR_JEUNESSE`. Huit rôles réels étaient donc absents, et un rôle
 * fantôme affiché. Ce genre d'écart est invisible en revue et faux pour
 * l'utilisateur.
 *
 * La parade : ne jamais rédiger la liste à la main. On itère sur
 * `PERMISSION_MATRIX`, typé `Readonly<Record<Role, Permission[]>>` — donc
 * **exhaustif par construction** : ajouter un rôle au type sans le décrire ici
 * ne compile pas, et aucun rôle ne peut être inventé puisqu'il n'existe pas de
 * clé pour l'accueillir.
 *
 * Consommé par `pages/Help.tsx` aujourd'hui, et par le skill `aide` du
 * chantier C (`docs/ROADMAP.md` §6) demain — une seule description, deux
 * lecteurs.
 */
import type { Role } from "@/types";
import { PERMISSION_MATRIX, ROLE_HIERARCHY, ROLE_LABELS } from "@/lib/rbac";

/** Libellé humain d'un domaine de permission (`transaction:*` → « transactions »). */
const DOMAIN_LABELS: Readonly<Record<string, string>> = {
  transaction: "transactions",
  versement: "versements",
  caisse: "caisses",
  event: "événements",
  member: "membres",
  group: "groupes",
  report: "rapports",
  budget: "budgets",
  donation: "dons",
  org: "organisation",
  role: "rôles",
  invitation: "invitations",
  form: "formulaires",
};

/** Verbes qui distinguent un rôle qui agit d'un rôle qui consulte. */
const WRITE_VERBS = new Set(["create", "update", "delete", "approve"]);

export interface RoleDescription {
  role: Role;
  /** Nom affichable, depuis `ROLE_LABELS` (source canonique). */
  label: string;
  /** « Gestion » ou « Consultation ». */
  kind: "Gestion" | "Consultation";
  /** Domaines accessibles, en clair, triés et dédupliqués. */
  domains: string[];
  /** Ligne prête à afficher : « Gestion · transactions, caisses +2 ». */
  summary: string;
  /** Nombre de permissions effectives. */
  permissionCount: number;
}

/** Décrit un rôle à partir de ses permissions réelles. */
export function describeRole(role: Role): RoleDescription {
  const label = ROLE_LABELS[role];
  const perms = PERMISSION_MATRIX[role] ?? [];

  if (perms.length === 0) {
    return {
      role,
      label,
      kind: "Consultation",
      domains: [],
      summary: "Aucune permission",
      permissionCount: 0,
    };
  }

  const canWrite = perms.some((p) => WRITE_VERBS.has(p.split(":")[1] ?? ""));
  const domains = [
    ...new Set(perms.map((p) => DOMAIN_LABELS[p.split(":")[0]] ?? p.split(":")[0])),
  ].sort((a, b) => a.localeCompare(b, "fr"));

  const shown = domains.slice(0, 3).join(", ");
  const more = domains.length > 3 ? ` +${domains.length - 3}` : "";
  const kind: RoleDescription["kind"] = canWrite ? "Gestion" : "Consultation";

  return {
    role,
    label,
    kind,
    domains,
    summary: `${kind} · ${shown}${more}`,
    permissionCount: perms.length,
  };
}

/**
 * Tous les rôles, du plus privilégié au moins privilégié.
 *
 * L'ordre suit `ROLE_HIERARCHY`. Les rôles à égalité (cas improbable mais
 * autorisé par le type) sont départagés par leur nom, pour un rendu stable.
 */
export function rolesByPrivilege(): RoleDescription[] {
  return (Object.keys(ROLE_LABELS) as Role[])
    .sort((a, b) => {
      const diff = (ROLE_HIERARCHY[b] ?? 0) - (ROLE_HIERARCHY[a] ?? 0);
      return diff !== 0 ? diff : a.localeCompare(b);
    })
    .map(describeRole);
}
