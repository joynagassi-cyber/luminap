/**
 * PR11 — hook de recherche globale.
 *
 * Lit les collections déjà synchronisées via le data layer
 * (`useMembers`/`useGroups`/`useEvents`/`useTransactions`/`useDocuments`) et
 * les formulaires (lecture PowerSync locale, comme `useBackupData`), les adapte
 * en enregistrements cherchables (`toSearchRecords`) puis délègue le classement
 * au cœur pur `searchRecords`.
 *
 * Règle « pas encore lu ≠ vide » (R52) : tant que la réplique locale n'est pas
 * prête (`isPowerSyncReadyNow()` faux), le hook renvoie `ready: false`. L'écran
 * affiche alors un squelette et NE montre JAMAIS « Aucun résultat » — un verdict
 * faux pendant la première synchronisation.
 */
import { useEffect, useMemo, useState } from "react";
import {
  useMembers,
  useGroups,
  useEvents,
  useTransactions,
  useDocuments,
  listFormDefinitionsPS,
  isPowerSyncReadyNow,
} from "@/lib/dataLayer";
import { getOrganizationId } from "@/lib/orgContext";
import { captureClientError } from "@/lib/clientErrors";
import {
  toSearchRecords,
  searchRecords,
  type SearchResult,
  type SearchRecord,
} from "@/lib/globalSearch";
import type { FormDefinition } from "@/types";

export interface GlobalSearchState {
  /** La réplique locale a-t-elle été lue au moins une fois ? */
  ready: boolean;
  /** Requête normalisée par l'utilisateur (telle que saisie). */
  query: string;
  /** Résultats classés et bornés (vide tant que `ready` est faux). */
  results: SearchResult[];
}

export function useGlobalSearch(query: string): GlobalSearchState {
  const orgId = getOrganizationId();
  const { data: members } = useMembers();
  const { data: groups } = useGroups();
  const { data: events } = useEvents();
  const { data: transactions } = useTransactions();
  const { data: documents } = useDocuments();

  const [forms, setForms] = useState<FormDefinition[]>([]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const loaded = await listFormDefinitionsPS({ orgId });
        if (!cancelled) setForms(loaded);
      } catch (err) {
        if (!cancelled) {
          captureClientError(err, {
            message: "Recherche globale : lecture des formulaires échouée",
            route: "/search",
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [orgId]);

  const records: SearchRecord[] = useMemo(
    () =>
      toSearchRecords({
        members,
        groups,
        events,
        transactions,
        documents,
        forms,
      }),
    [members, groups, events, transactions, documents, forms],
  );

  const ready = isPowerSyncReadyNow();
  const results = useMemo(
    () => (ready ? searchRecords(query, records) : []),
    [ready, query, records],
  );

  return { ready, query, results };
}
