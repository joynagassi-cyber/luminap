/**
 * Façade plateforme — état réseau (source UNIQUE et SYNCHRONE).
 *
 * PROBLÈME VISÉ (cf. docs/PLATFORM-GOVERNANCE.md §4.3)
 * ---------------------------------------------------
 * Lumina lisait `navigator.onLine` en direct dans ~14 fichiers. Dans une
 * WebView Android, `navigator.onLine` est notoirement peu fiable (peut rester
 * `true` sans connectivité réelle, ou `false` pendant une reconnexion) : c'est
 * une source plausible de bugs « l'app croit être en ligne / hors ligne à
 * contretemps ». La source correcte est `@capacitor/network`, encapsulée dans
 * `NetworkAdapter`.
 *
 * CONTRAINTE
 * ----------
 * Une grande partie du code (auth, store, reporter) a besoin d'un état réseau
 * **synchrone** (`navigator.onLine` l'est). `Network.getStatus()` est
 * asynchrone. Cette façade réconcilie les deux : elle maintient un cache
 * synchrone, amorcé par une lecture native async (`initNetworkState`) et
 * tenu à jour par les événements natifs.
 *
 * C'est le SEUL module hors `src/adapters/native/` autorisé à lire
 * `navigator.onLine` (verrouillé par `platform-abstraction-guard.test.ts`).
 *
 * DÉGRADATION
 * -----------
 * Avant tout appel à `initNetworkState()` (ex. module évalué tôt), `isOnline()`
 * renvoie `navigator.onLine` (web) ou `true` (natif, prudent : ne pas bloquer
 * un appel réseau sur une supposition). Le cache est ensuite exact.
 */
import { NetworkAdapter } from "@/adapters/native";

/** Valeur de repli navigateur — SEUL usage autorisé de `navigator.onLine`. */
function browserOnline(): boolean {
  try {
    if (typeof navigator === "undefined") return true;
    return navigator.onLine !== false;
  } catch {
    return true;
  }
}

/** Plateforme native ? (Capacitor). Évite de mentir avec navigator en WebView. */
function isNative(): boolean {
  try {
    const cap = (globalThis as { Capacitor?: { isNativePlatform?: () => boolean } })
      .Capacitor;
    return Boolean(cap?.isNativePlatform?.());
  } catch {
    return false;
  }
}

let online: boolean = isNative() ? true : browserOnline();
const listeners = new Set<(online: boolean) => void>();
let initPromise: Promise<boolean> | null = null;
let unsubscribeAdapter: (() => void) | null = null;

function emit(next: boolean): void {
  if (next === online) return;
  online = next;
  for (const listener of listeners) {
    try {
      listener(next);
    } catch {
      /* un listener fautif ne doit pas casser la diffusion */
    }
  }
}

/**
 * Amorce le cache synchrone (lecture native) et branche les événements.
 * Idempotent. À appeler une fois au démarrage (`main.tsx`).
 */
export function initNetworkState(): Promise<boolean> {
  if (initPromise) return initPromise;
  initPromise = (async () => {
    const adapter = NetworkAdapter.getInstance();
    try {
      emit(await adapter.isConnected());
    } catch {
      /* conserve la valeur de repli */
    }
    try {
      unsubscribeAdapter = await adapter.addStatusListener((status) =>
        emit(status.connected),
      );
    } catch {
      /* pas de diffusion native : le cache reste sur sa dernière valeur */
    }
    return online;
  })();
  return initPromise;
}

/** État réseau courant, SYNCHRONE. */
export function isOnline(): boolean {
  return online;
}

/** Abonnement aux changements d'état réseau. Renvoie le désabonnement. */
export function subscribeOnline(listener: (online: boolean) => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** TEST-ONLY : force l'état et notifie (hors couche native). */
export function __setOnlineForTests(next: boolean): void {
  emit(next);
}

/** TEST-ONLY : réinitialise l'état, les listeners et l'abonnement natif. */
export function __resetNetworkStateForTests(): void {
  online = isNative() ? true : browserOnline();
  listeners.clear();
  initPromise = null;
  unsubscribeAdapter?.();
  unsubscribeAdapter = null;
}
