/**
 * Collecte des données de l'organisation ACTIVE pour la sauvegarde (PR2).
 *
 * S'appuie uniquement sur les lectures déjà exposées par le data layer
 * (`useXxx()` pour les tables synchronisées, requêtes locales PowerSync pour
 * les formulaires et champs personnalisés) — aucune nouvelle table, aucune
 * invention de schéma. Le résultat alimente `src/lib/backup.ts` (module pur).
 *
 * Règle « pas encore lu ≠ vide » (R52) : `ready` vaut `isPowerSyncReadyNow()`.
 * Tant qu'il est faux, l'écran affiche un squelette et NE montre PAS de compte
 * à 0 — un `0 élément` serait un fait faux pendant la première synchronisation.
 */
import { useCallback, useEffect, useState } from "react";
import {
  useTransactions,
  useGroups,
  useMembers,
  useEvents,
  useCaisses,
  useAccounts,
  useAuditEntries,
  useNotifications,
  useDocuments,
  listFormDefinitionsPS,
  listCustomFieldDefinitionsPS,
  isPowerSyncReadyNow,
} from "@/lib/dataLayer";
import { getOrganizationId } from "@/lib/orgContext";
import { captureClientError } from "@/lib/clientErrors";
import {
  buildBackupBundle,
  type BackupBundle,
} from "@/lib/backup";
import type { CustomFieldDefinition, FormDefinition } from "@/types";

export interface BackupData {
  /** La réplique locale a-t-elle été lue au moins une fois ? */
  ready: boolean;
  /** Nombre d'éléments par entité (0 tant que la réplique n'est pas lue). */
  counts: Record<string, number>;
  /** Somme des éléments — jamais présentée avant `ready`. */
  total: number;
  /** Construit l'enveloppe complète au moment de l'export. */
  buildBundle: () => BackupBundle;
}

export function useBackupData(): BackupData {
  const orgId = getOrganizationId();
  const { data: transactions } = useTransactions();
  const { data: groups } = useGroups();
  const { data: members } = useMembers();
  const { data: events } = useEvents();
  const { data: caisses } = useCaisses();
  const { data: accounts } = useAccounts();
  const { data: auditEntries } = useAuditEntries();
  const { data: notifications } = useNotifications();
  const { data: documents } = useDocuments();

  const [forms, setForms] = useState<FormDefinition[]>([]);
  const [customFields, setCustomFields] = useState<CustomFieldDefinition[]>([]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [loadedForms, loadedFields] = await Promise.all([
          listFormDefinitionsPS({ orgId }),
          listCustomFieldDefinitionsPS(),
        ]);
        if (cancelled) return;
        setForms(loadedForms);
        // `listCustomFieldDefinitionsPS` n'est pas filtrée par org côté SQL :
        // on borne ici pour ne sauvegarder que l'organisation active.
        setCustomFields(loadedFields.filter((f) => f.orgId === orgId));
      } catch (err) {
        if (!cancelled) {
          captureClientError(err, {
            message: "Sauvegarde : lecture des formulaires / champs échouée",
            route: "/settings/gestion",
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [orgId]);

  const buildBundle = useCallback(
    () =>
      buildBackupBundle(
        {
          transactions,
          groups,
          members,
          events,
          caisses,
          accounts,
          audit_entries: auditEntries,
          notifications,
          documents,
          forms,
          custom_fields: customFields,
        },
        orgId,
      ),
    [
      transactions,
      groups,
      members,
      events,
      caisses,
      accounts,
      auditEntries,
      notifications,
      documents,
      forms,
      customFields,
      orgId,
    ],
  );

  const counts: Record<string, number> = {
    transactions: transactions.length,
    groups: groups.length,
    members: members.length,
    events: events.length,
    caisses: caisses.length,
    accounts: accounts.length,
    audit_entries: auditEntries.length,
    notifications: notifications.length,
    documents: documents.length,
    forms: forms.length,
    custom_fields: customFields.length,
  };
  const total = Object.values(counts).reduce((n, c) => n + c, 0);

  return { ready: isPowerSyncReadyNow(), counts, total, buildBundle };
}
