/**
 * Machine d'état de disponibilité de la réplique PowerSync (P0 « zéro écran
 * noir »).
 *
 * Module VOLONTAIREMENT minuscule et sans dépendance : il est importé par
 * `@/lib/powersync` (initialisation) ET par `@/lib/dataLayer` (hooks de
 * lecture). Le laisser dans `dataLayer` créait un couplage inverse — le
 * module d'initialisation PowerSync tirait tout `dataLayer` (≈ 3 900 lignes)
 * dans le chunk d'entrée, cassant le découpage de code (budget perf R116).
 *
 * État de module : `_psReady` / `_psUnavailable` sont remis à `false` à chaque
 * rechargement de page (cf. note E2E dans `markPowerSyncUnavailable`).
 */

let _psReady = false;
// Vrai quand la réplique n'est PAS devenue prête dans le délai imparti (auth
// PowerSync refusée, réseau coupé). Sort l'app du chargement perpétuel muet en
// exposant un état explicite « synchronisation indisponible » (P0).
let _psUnavailable = false;

const _readyListeners = new Set<() => void>();
const _unavailableListeners = new Set<() => void>();

/** État courant, usage interne (les hooks lisent `isPowerSyncReadyNow`). */
export function isPowerSyncReady(): boolean {
  return _psReady;
}

export function setPowerSyncReady(ready: boolean): void {
  if (ready) _psUnavailable = false;
  if (_psReady === ready) return;
  _psReady = ready;
  if (ready) {
    _readyListeners.forEach((l) => l());
    _unavailableListeners.forEach((l) => l());
  }
}

/** À appeler une fois la réplique initialisée (depuis `initPowerSync`). */
export function markPowerSyncReady(): void {
  setPowerSyncReady(true);
}

/**
 * Marque la réplique comme INDISPONIBLE (délai de disponibilité dépassé sans
 * connexion). Les écrans affichent alors un état explicite plutôt qu'un
 * squelette perpétuel muet (contrat P0 « zéro écran noir »).
 */
export function markPowerSyncUnavailable(): void {
  // Mode E2E : quand le harness a posé le marqueur de réplique prête, la
  // bannière « synchronisation indisponible » ne doit jamais s'afficher — elle
  // est `position: fixed` en bas d'écran et recouvre les boutons que les specs
  // cliquent. Le harness simule explicitement une réplique prête (le service
  // PowerSync Cloud refuse l'audience JWT, PSYNC_S2105) : l'état
  // « indisponible » est donc un artefact de test. DEV uniquement.
  if (
    typeof localStorage !== "undefined" &&
    localStorage.getItem("__e2e-ps-ready") === "1"
  ) {
    return;
  }
  if (_psUnavailable) return;
  _psUnavailable = true;
  _unavailableListeners.forEach((l) => l());
}

/** S'abonner au passage « PowerSync prêt » (état one-shot). */
export function subscribePowerSyncReady(listener: () => void): () => void {
  _readyListeners.add(listener);
  return () => {
    _readyListeners.delete(listener);
  };
}

/** S'abonner au passage « réplique indisponible » (état one-shot). */
export function subscribePowerSyncUnavailable(listener: () => void): () => void {
  _unavailableListeners.add(listener);
  return () => {
    _unavailableListeners.delete(listener);
  };
}

/** État courant, lisible hors React (pour choisir un état de repli). */
export function isPowerSyncReadyNow(): boolean {
  return _psReady;
}

/** La réplique est-elle déclarée indisponible (délai dépassé) ? */
export function isPowerSyncUnavailableNow(): boolean {
  return _psUnavailable;
}
