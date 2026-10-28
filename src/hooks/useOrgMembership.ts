/**
 * useOrgMembership — alimente `isOrgMember` pour la garde de route (R107).
 *
 * La branche `needs-membership` du résolveur de routes était **morte** : `App`
 * ne fournissait jamais `isOrgMember`, donc un compte authentifié mais non
 * membre de l'organisation active voyait un écran vide au lieu de l'écran
 * « Organisation non rejointe ». Ce hook produit la donnée manquante.
 *
 * Règles de sûreté (l'inverse de la classe de défaut « filet jamais câblé ») :
 *   - **fail-open** : tant qu'on ne peut pas PROUVER la non-appartenance, on
 *     renvoie `unknown` (le résolveur laisse alors passer). On ne bloque un
 *     utilisateur que sur une preuve positive ;
 *   - une ligne d'appartenance trouvée (`canAccessOrganization` → `true`) est
 *     une preuve définitive → `member` ;
 *   - une ABSENCE de ligne n'est retenue (`not-member`) QUE si la base locale a
 *     déjà synchronisé (`hasSynced`). Sur une base encore vide (démarrage à
 *     froid, hors-ligne), un membre réel ne doit jamais être bloqué ;
 *   - l'organisation non résolue (`__no_org__`) ou l'utilisateur inconnu →
 *     `unknown`.
 *
 * La décision est re-résolue à chaque changement d'organisation et à chaque fin
 * de synchronisation PowerSync (la base locale est vide au boot).
 */
import { useEffect, useState } from "react";
import { getPowerSyncDatabase } from "@/lib/powersync";
import { canAccessOrganization } from "@/lib/dataLayer";
import { getOrganizationId, subscribeOrganization } from "@/lib/orgContext";
import { resolveCurrentUserId } from "@/lib/organization-context";

export type OrgMembership = "unknown" | "member" | "not-member";

/** Valeur du marqueur « aucune organisation résolue » (cf. orgContext.ts). */
const NO_ORG = "__no_org__";

function hasSyncedOnce(): boolean {
  try {
    return (getPowerSyncDatabase() as { currentStatus?: { hasSynced?: boolean } })
      .currentStatus?.hasSynced === true;
  } catch {
    return false;
  }
}

export function useOrgMembership(): OrgMembership {
  const [orgId, setOrgId] = useState(() => getOrganizationId());
  const [synced, setSynced] = useState(hasSyncedOnce);
  const [token, setToken] = useState(0);

  // Re-résoudre quand l'organisation change (changement de contexte).
  useEffect(
    () => subscribeOrganization(() => setOrgId(getOrganizationId())),
    [],
  );

  // Re-résoudre à chaque fin de synchronisation : un résultat négatif obtenu
  // sur une base vide doit être réévalué une fois les données téléchargées.
  useEffect(() => {
    let unsub: (() => void) | null = null;
    try {
      const db = getPowerSyncDatabase() as unknown as {
        on?: (event: string, cb: (s: { hasSynced?: boolean }) => void) => void;
        off?: (event: string, cb: (s: { hasSynced?: boolean }) => void) => void;
      };
      const onStatus = (s: { hasSynced?: boolean }) => {
        if (!s?.hasSynced) return;
        setSynced(true);
        setToken((n) => n + 1);
      };
      db.on?.("status", onStatus);
      unsub = () => {
        try {
          db.off?.("status", onStatus);
        } catch {
          /* noop */
        }
      };
    } catch {
      /* DB pas encore initialisée — la valeur restera `unknown` (fail-open) */
    }
    return () => unsub?.();
  }, []);

  const [status, setStatus] = useState<OrgMembership>("unknown");
  useEffect(() => {
    if (!orgId || orgId === NO_ORG) {
      setStatus("unknown");
      return;
    }
    const uid = resolveCurrentUserId();
    if (!uid) {
      setStatus("unknown");
      return;
    }
    let cancelled = false;
    void (async () => {
      const allowed = await canAccessOrganization(uid, orgId);
      if (cancelled) return;
      if (allowed) {
        setStatus("member");
      } else {
        // Absence de preuve d'appartenance : on ne la retient qu'après une
        // synchronisation (sinon on risquerait de bloquer un membre réel sur
        // une base locale encore vide).
        setStatus(synced ? "not-member" : "unknown");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [orgId, synced, token]);

  return status;
}
