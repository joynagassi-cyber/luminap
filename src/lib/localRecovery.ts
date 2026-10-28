/**
 * Récupération locale sûre — PM15 (pré-mortem : « base locale pleine/corrompue
 * → app inutilisable »).
 *
 * Défaut visé : les primitives existaient déjà (`disconnectPowerSync()` qui
 * vide la base SQLite locale, `deleteAllLocalData()` qui purge les clés
 * `lumina-*`, `resetOrganizationId()`) mais AUCUNE action utilisateur ne les
 * enchaînait. Un appareil dont la base locale était corrompue ou pleine restait
 * bloqué sans recours (même classe que R105/R106/R107 : capacité déclarée,
 * jamais câblée).
 *
 * Ce module orchestre la SEULE récupération sûre : purge locale complète puis
 * rechargement contrôlé. Il ne touche JAMAIS au cloud (Supabase/PowerSync
 * serveur) : la source de vérité distante reste intacte, et le prochain
 * démarrage resynchronise. La session Supabase est préservée (la clé de session
 * `sb-<ref>-auth-token` ne commence pas par `lumina-`), donc l'utilisateur
 * n'est pas déconnecté.
 */

export interface LocalRecoveryDeps {
  /** Vide et ferme la base PowerSync locale (SQLite). */
  disconnect: () => Promise<void>;
  /** Purge les clés `lumina-*` + l'état en mémoire. */
  purgeLocalData: () => Promise<void>;
  /** Oublie l'organisation courante (mémoire + `lumina-active-org`). */
  resetOrg: () => void;
  /** Recharge l'application (par défaut : `window.location.reload`). */
  reload: () => void;
}

export interface LocalRecoveryResult {
  ok: boolean;
  /** Étapes réellement exécutées, dans l'ordre. */
  steps: string[];
  /** Message d'erreur si une étape a échoué (le rechargement n'a alors pas lieu). */
  error?: string;
}

/**
 * Exécute la récupération locale. L'ordre est significatif :
 *   1. `disconnect` — ferme la base AVANT la purge du stockage (sinon une
 *      reconnexion en cours pourrait réécrire des clés juste purgées).
 *   2. `purgeLocalData` — purge les clés `lumina-*` + l'état en mémoire.
 *   3. `resetOrg` — oublie l'organisation en mémoire (elle est résolue au
 *      chargement du module, donc purger le stockage ne suffit pas).
 *   4. `reload` — reconstruit tout proprement ; sans rechargement, la base
 *      PowerSync resterait fermée (`getPowerSyncDatabase()` lèverait).
 *
 * Une erreur à une étape n'empêche pas le rechargement : la récupération est
 * « best-effort » — mieux vaut un rechargement propre qu'un écran figé.
 */
export async function performLocalRecovery(
  deps: LocalRecoveryDeps,
): Promise<LocalRecoveryResult> {
  const steps: string[] = [];
  let error: string | undefined;

  const run = async (name: string, fn: () => void | Promise<void>) => {
    try {
      await fn();
      steps.push(name);
    } catch (e) {
      // On mémorise la PREMIÈRE erreur mais on poursuit : les étapes
      // indépendantes (purge stockage, reload) restent utiles même si la
      // fermeture de la base échoue.
      if (error === undefined) error = `${name}: ${(e as Error)?.message ?? String(e)}`;
    }
  };

  await run("disconnect", deps.disconnect);
  await run("purge", deps.purgeLocalData);
  await run("reset-org", deps.resetOrg);
  await run("reload", deps.reload);

  return { ok: error === undefined, steps, error };
}
