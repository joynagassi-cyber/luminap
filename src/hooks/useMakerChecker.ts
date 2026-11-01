/**
 * useMakerChecker — expose le réglage d'organisation « approbation en deux
 * étapes » (PR8) sous forme d'état React.
 *
 * La DÉCISION vit dans `src/lib/makerCheckerSettings.ts` (`isMakerCheckerEnabled`)
 * — ce hook ne fait que la lire et la re-lire à la fin du premier sync PowerSync
 * (le réglage arrive par la réplique locale). FAIL-SAFE : tant que la lecture
 * n'a pas abouti, `enabled` vaut `false` (jamais d'activation par accident).
 */
import { useEffect, useState } from "react";
import { isMakerCheckerEnabled } from "@/lib/makerCheckerSettings";
import { captureClientError } from "@/lib/clientErrors";
import { subscribePowerSyncReady } from "@/lib/dataLayer";
import { getOrganizationId, subscribeOrganization } from "@/lib/orgContext";

export interface MakerCheckerState {
  /** Maker-checker actif pour l'organisation ET non coupé par le drapeau ? */
  enabled: boolean;
  /** Le réglage a-t-il été lu au moins une fois ? (distinguer « pas encore lu ») */
  loaded: boolean;
}

export function useMakerChecker(): MakerCheckerState {
  const orgId = getOrganizationId();
  const [enabled, setEnabled] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [syncToken, setSyncToken] = useState(0);

  useEffect(() => {
    const unsubReady = subscribePowerSyncReady(() => setSyncToken((n) => n + 1));
    const unsubOrg = subscribeOrganization(() => setSyncToken((n) => n + 1));
    return () => {
      unsubReady();
      unsubOrg();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const value = await isMakerCheckerEnabled();
        if (!cancelled) setEnabled(value);
      } catch (err) {
        if (!cancelled) {
          captureClientError(err, {
            message: "Lecture du réglage maker-checker échouée",
            route: "useMakerChecker",
          });
        }
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [syncToken, orgId]);

  return { enabled, loaded };
}
