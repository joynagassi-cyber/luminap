/**
 * usePeriodLock — état du gel de période comptable (PR13) pour l'UI.
 *
 * La valeur est PERSISTÉE par organisation (`org_settings.period_locked_until`,
 * via `periodLock`), donc partagée entre les appareils. Ce hook ne fait que la
 * lire/écrire et exposer un état de chargement honnête.
 *
 * Règle « pas encore lu ≠ vide » (R52) : `loading` reste vrai tant que la
 * première lecture n'a pas abouti. L'UI affiche alors un squelette et NE
 * présente PAS « aucune clôture » — un fait faux pendant la 1re synchronisation.
 */
import { useCallback, useEffect, useState } from "react";
import {
  getLockedUntil,
  lockPeriod,
  clearPeriodLock,
} from "@/lib/periodLock";

export interface PeriodLockState {
  /** Date de clôture (incluse) ou `null` si la période est ouverte. */
  lockedUntil: string | null;
  /** Première lecture non encore aboutie. */
  loading: boolean;
  /** Enregistre la date de clôture. Renvoie `true` en cas de succès. */
  setLock: (date: string) => Promise<boolean>;
  /** Retire la clôture. Renvoie `true` en cas de succès. */
  clearLock: () => Promise<boolean>;
}

export function usePeriodLock(): PeriodLockState {
  const [lockedUntil, setLockedUntil] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    try {
      setLockedUntil(await getLockedUntil());
    } finally {
      // Posé dans `finally` : même si la lecture échoue, on sort de l'état
      // « chargement » (sinon squelette perpétuel). `getLockedUntil` est
      // fail-open et ne lève pas, mais on ne dépend pas de ce détail ici.
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const setLock = useCallback(async (date: string) => {
    const ok = await lockPeriod(date);
    if (ok) await reload();
    return ok;
  }, [reload]);

  const clearLock = useCallback(async () => {
    const ok = await clearPeriodLock();
    if (ok) await reload();
    return ok;
  }, [reload]);

  return { lockedUntil, loading, setLock, clearLock };
}
