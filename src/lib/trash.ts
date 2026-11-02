/**
 * Trash (corbeille) — purge définitive des éléments archivés.
 *
 * Complète le cycle soft-delete de `src/capabilities/lifecycle` : une
 * corbeille qui ne peut que grossir n'est pas exploitable. `trash` fournit la
 * sortie de secours (suppression DÉFINITIVE), en miroir des suppressions
 * existantes.
 *
 * Choix d'emplacement — service `src/lib/trash.ts` (et NON une extension de la
 * capability `lifecycle`) : la capability lifecycle est volontairement
 * « domain-agnostic » (aucun concept métier, cf. son en-tête). Or purger un
 * groupe, c'est supprimer des lignes dans QUATRE tables (`group_memberships`,
 * `caisses`, `accounts`, `groups`, `org_units`) — du savoir métier. Le placer
 * dans `src/lib/` le met au même niveau que `group-service` / `member-service`,
 * qui portent déjà cette connaissance, et laisse la capability pure.
 *
 * GARDE FAIL-CLOSED : `purgeEntity` refuse de purger un élément NON archivé.
 * Sans cette garde, la purge contournerait le soft-delete (on pourrait
 * supprimer définitivement un élément actif). Le refus est explicite (throw).
 *
 * BORNAGE ORG : toute lecture/écriture est bornée à `getOrganizationId()` —
 * jamais de purge d'une ligne appartenant à une autre organisation.
 */

import { getPowerSyncDatabase } from "@/lib/powersync";
import { getOrganizationId } from "@/lib/orgContext";
import { writeAudit } from "@/lib/audit";
import type { ArchivableEntity } from "@/types";

/** Statut qui marque « archivé » pour une entité (Event utilise CANCELLED). */
function archivedStatus(entityType: ArchivableEntity): string {
  return entityType === "Event" ? "CANCELLED" : "ARCHIVED";
}

/**
 * Configuration de purge par type d'entité.
 *
 * `table`        : table principale de l'entité.
 * `tsColumn`     : colonne d'horodatage d'archivage (Event n'a pas
 *                  `archived_at` → on retombe sur `updated_at`).
 * `null`         : type sans colonne `status` en base (`Category`,
 *                  `Role`/`org_units`) → non archivable de façon fiable, donc
 *                  non purgeable en lot (fail-closed).
 */
interface PurgeConfig {
  table: string;
  tsColumn: string;
}

const PURGE_CONFIG: Record<ArchivableEntity, PurgeConfig | null> = {
  Group: { table: "groups", tsColumn: "archived_at" },
  Member: { table: "members", tsColumn: "archived_at" },
  Event: { table: "events", tsColumn: "updated_at" },
  Account: { table: "accounts", tsColumn: "archived_at" },
  Category: null,
  Role: null,
};

/**
 * Lignes filles à supprimer AVANT la ligne principale, en miroir exact des
 * suppressions existantes (`deleteGroupPS`, `deleteEventPS`, et le nettoyage
 * des appartenances pour un membre). Une purge laisse donc la base dans le
 * même état cohérent qu'une suppression normale.
 */
function childStatements(
  entityType: ArchivableEntity,
  id: string,
): { sql: string; params: any[] }[] {
  switch (entityType) {
    case "Group":
      // Miroir de `deleteGroupPS` (dataLayer.ts).
      return [
        { sql: "DELETE FROM group_memberships WHERE group_id = ?", params: [id] },
        { sql: "DELETE FROM caisses WHERE id = ?", params: [id] },
        { sql: "DELETE FROM accounts WHERE id = ?", params: [id] },
        { sql: "DELETE FROM groups WHERE id = ?", params: [id] },
        { sql: "DELETE FROM org_units WHERE id = ?", params: [id] },
      ];
    case "Member":
      // Un membre n'a pas de fonction de suppression PS : on retire ses
      // appartenances de groupe puis la ligne. La base REFUSE (RESTRICT) de
      // supprimer un membre porteur de cotisations → l'erreur remonte.
      return [
        { sql: "DELETE FROM group_memberships WHERE member_id = ?", params: [id] },
        { sql: "DELETE FROM members WHERE id = ?", params: [id] },
      ];
    case "Event":
      // Miroir de `deleteEventPS` (dataLayer.ts).
      return [{ sql: "DELETE FROM events WHERE id = ?", params: [id] }];
    case "Account":
      return [{ sql: "DELETE FROM accounts WHERE id = ?", params: [id] }];
    case "Category":
      return [{ sql: "DELETE FROM categories WHERE id = ?", params: [id] }];
    case "Role":
      return [{ sql: "DELETE FROM org_units WHERE id = ?", params: [id] }];
    default:
      return [];
  }
}

/** Erreurs de purge — discriminables par les appelants/UI. */
export const PURGE_ERRORS = {
  NOT_FOUND: "PURGE_ENTITY_NOT_FOUND",
  NOT_ARCHIVED: "PURGE_ENTITY_NOT_ARCHIVED",
  ORG_MISMATCH: "PURGE_ORG_MISMATCH",
} as const;

/**
 * Supprime DÉFINITIVEMENT un élément archivé et ses lignes filles cohérentes.
 *
 * Refuse (throw) si :
 *   - l'entité n'existe pas (`PURGE_ENTITY_NOT_FOUND`) ;
 *   - l'entité appartient à une autre organisation (`PURGE_ORG_MISMATCH`) ;
 *   - l'entité n'est PAS archivée (`PURGE_ENTITY_NOT_ARCHIVED`) — garde
 *     fail-closed : la purge ne doit jamais contourner le soft-delete.
 *
 * Écrit une entrée d'audit `DELETE` (entityType réel, comment « purge
 * définitive »).
 */
export async function purgeEntity(
  entityType: ArchivableEntity,
  id: string,
  actor: string,
): Promise<void> {
  const config = PURGE_CONFIG[entityType];
  if (!config) throw new Error(`${PURGE_ERRORS.NOT_ARCHIVED} ${entityType}`);

  const orgId = getOrganizationId();
  const db = getPowerSyncDatabase();

  const res = await db.execute(`SELECT * FROM ${config.table} WHERE id = ?`, [id]);
  const entity: any = res?.array?.[0];
  if (!entity) throw new Error(`${PURGE_ERRORS.NOT_FOUND} ${entityType} ${id}`);

  // Bornage org : ne jamais purger la ligne d'une autre organisation.
  if (entity.org_id != null && entity.org_id !== orgId) {
    throw new Error(`${PURGE_ERRORS.ORG_MISMATCH} ${entityType} ${id}`);
  }

  // Garde fail-closed : seule une entité archivée peut être purgée.
  if (entity.status !== archivedStatus(entityType)) {
    throw new Error(`${PURGE_ERRORS.NOT_ARCHIVED} ${entityType} ${id}`);
  }

  for (const stmt of childStatements(entityType, id)) {
    await db.execute(stmt.sql, stmt.params);
  }

  await writeAudit({
    orgId,
    transactionId: null,
    userId: actor,
    actorRoleAtTime: null,
    action: "DELETE",
    entityType,
    entityId: id,
    beforeState: entity,
    afterState: null,
    comment: "purge définitive",
  });
}

export interface PurgeAllOptions {
  /** Ne purge que les éléments archivés depuis au moins N jours. */
  olderThanDays?: number;
}

export interface PurgeAllResult {
  /** Nombre d'éléments effectivement purgés. */
  purged: number;
  /** Détail par type d'entité. */
  byType: Partial<Record<ArchivableEntity, number>>;
}

/**
 * Purge en lot TOUS les éléments archivés de l'organisation active.
 *
 * Bornée à l'org active (jamais une autre organisation). Avec
 * `olderThanDays`, seuls les éléments dont l'horodatage d'archivage est
 * antérieur au seuil sont purgés ; un élément sans horodatage est ÉCARTÉ
 * (fail-closed : âge inconnu ⇒ on ne supprime pas).
 */
export async function purgeAllArchived(
  actor: string,
  opts: PurgeAllOptions = {},
): Promise<PurgeAllResult> {
  const orgId = getOrganizationId();
  const db = getPowerSyncDatabase();

  const cutoff =
    opts.olderThanDays != null
      ? new Date(Date.now() - opts.olderThanDays * 24 * 60 * 60 * 1000).toISOString()
      : null;

  const byType: Partial<Record<ArchivableEntity, number>> = {};
  let purged = 0;

  for (const entityType of Object.keys(PURGE_CONFIG) as ArchivableEntity[]) {
    const config = PURGE_CONFIG[entityType];
    if (!config) continue;

    const conditions = ["org_id = ?", "status = ?"];
    const params: any[] = [orgId, archivedStatus(entityType)];
    if (cutoff) {
      conditions.push(`${config.tsColumn} IS NOT NULL`, `${config.tsColumn} <= ?`);
      params.push(cutoff);
    }

    const res = await db.execute(
      `SELECT id FROM ${config.table} WHERE ${conditions.join(" AND ")}`,
      params,
    );
    const ids: string[] = ((res?.array ?? []) as { id: string }[]).map((r) => r.id);

    for (const id of ids) {
      await purgeEntity(entityType, id, actor);
      purged += 1;
      byType[entityType] = (byType[entityType] ?? 0) + 1;
    }
  }

  return { purged, byType };
}
