/**
 * Phase 3 — arbre multi-organisation : primitives pures de fédération.
 *
 * Source de vérité UNIQUE (R7) pour :
 *   - l'anti-cycle d'un re-parentage (`wouldCreateCycle`, `assertReparentAllowed`) ;
 *   - la clôture transitive (ancêtres / descendants, profondeur illimitée) ;
 *   - les mesures de profondeur / largeur.
 *
 * Le même algorithme est appliqué en base par la fonction `org_would_cycle`
 * (migration `20261026000001_org_tree_anti_cycle.sql`) afin que l'invariant
 * tienne aussi quand l'écriture ne passe pas par ce module (SQL direct, sync).
 * Aucune donnée d'org n'est lue ici : ces fonctions sont pures et testables.
 */

export interface OrgParentRow {
  id: string;
  parentOrgId: string | null;
}

export type ParentMap = Map<string, string | null>;

export interface ClosureEntry {
  ancestor: string;
  descendant: string;
  depth: number;
}

/**
 * Un re-parentage `orgId → newParentId` créerait-il un cycle ?
 *
 * Cycle ssi `newParentId` est `orgId` lui-même OU un descendant de `orgId`
 * (remonter la chaîne des parents depuis `newParentId` doit alors croiser
 * `orgId`). Un détachement (`newParentId = null`) ne crée jamais de cycle.
 *
 * Garde-fou anti-boucle infinie : la remontée est bornée par le nombre de
 * nœuds connus, donc elle termine même si les données sont déjà cycliques.
 */
export function wouldCreateCycle(
  orgId: string,
  newParentId: string | null,
  parentOf: ParentMap,
): boolean {
  if (newParentId === null) return false;
  if (newParentId === orgId) return true;

  const limit = parentOf.size + 1;
  let cur: string | null = newParentId;
  let steps = 0;
  while (cur !== null && steps <= limit) {
    if (cur === orgId) return true;
    cur = parentOf.get(cur) ?? null;
    steps++;
  }
  return false;
}

/** Variante lançante, pour l'usage côté service (écriture). */
export function assertReparentAllowed(
  orgId: string,
  newParentId: string | null,
  parentOf: ParentMap,
): void {
  if (wouldCreateCycle(orgId, newParentId, parentOf)) {
    throw new Error(
      `Re-parentage refusé : rattacher ${orgId} à ${newParentId} créerait un cycle de fédération.`,
    );
  }
}

/** Construit `parentOf` depuis une liste de lignes (pratique pour les tests). */
export function parentMapFrom(rows: OrgParentRow[]): ParentMap {
  return new Map(rows.map((r) => [r.id, r.parentOrgId]));
}

/**
 * Clôture transitive de l'arbre : pour chaque nœud, la liste de ses
 * descendants (soi-même inclus, depth 0) et de ses ancêtres (soi-même inclus).
 *
 * Implémentation itérative (pas de `WITH RECURSIVE` côté TS) avec une borne de
 * sécurité par nœud : elle termine toujours, même sur des données cycliques
 * (données corrompues avant l'ajout de la garde), au lieu de boucler à l'infini.
 */
export function buildClosure(rows: OrgParentRow[]): ClosureEntry[] {
  const parentOf = parentMapFrom(rows);
  const entries: ClosureEntry[] = [];

  for (const row of rows) {
    // Descendants : BFS borné par la taille de l'arbre.
    let frontier = [row.id];
    const seen = new Set<string>([row.id]);
    let depth = 0;
    while (frontier.length > 0) {
      for (const id of frontier) entries.push({ ancestor: row.id, descendant: id, depth });
      const next: string[] = [];
      for (const id of frontier) {
        for (const child of rows) {
          if (child.parentOrgId === id && !seen.has(child.id)) {
            seen.add(child.id);
            next.push(child.id);
          }
        }
      }
      frontier = next;
      depth++;
      if (depth > rows.length + 1) break; // garde-fou cycle
    }
  }
  return entries;
}

/** Descendants d'une org (soi-même inclus), triés par profondeur. */
export function computeDescendants(
  orgId: string,
  closure: ClosureEntry[],
): { descendant: string; depth: number }[] {
  return closure
    .filter((e) => e.ancestor === orgId)
    .map((e) => ({ descendant: e.descendant, depth: e.depth }))
    .sort((a, b) => a.depth - b.depth);
}

/** Ancêtres d'une org (soi-même inclus), du plus proche au plus lointain. */
export function computeAncestors(
  orgId: string,
  closure: ClosureEntry[],
): { ancestor: string; depth: number }[] {
  return closure
    .filter((e) => e.descendant === orgId)
    .map((e) => ({ ancestor: e.ancestor, depth: e.depth }))
    .sort((a, b) => a.depth - b.depth);
}

/** Profondeur maximale de l'arbre (0 = pas de hiérarchie). */
export function maxDepth(closure: ClosureEntry[]): number {
  return closure.reduce((m, e) => (e.depth > m ? e.depth : m), 0);
}

/** Largeur maximale = plus grand nombre d'enfants directs d'un même nœud. */
export function maxBreadth(rows: OrgParentRow[]): number {
  const counts = new Map<string, number>();
  for (const r of rows) {
    if (r.parentOrgId === null) continue;
    counts.set(r.parentOrgId, (counts.get(r.parentOrgId) ?? 0) + 1);
  }
  return [...counts.values()].reduce((m, n) => (n > m ? n : m), 0);
}
