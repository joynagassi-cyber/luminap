/**
 * Chargeur paresseux (et mémoïsé) du module des contrôleurs Ionic.
 *
 * Import DYNAMIQUE délibéré : le baril `@ionic/core` en import statique
 * tire tout le graphe des composants Ionic dans les preloads du premier
 * rendu (39 requêtes mesurées contre un budget de 28 —
 * perf-budget.test.ts). Le contrôleur impératif (toast) n'est
 * nécessaire qu'au premier retour utilisateur : le chunk se charge
 * alors à la demande.
 *
 * La promesse est mémoïsée — deux appels simultanés partagent le même
 * chargement — mais réinitialisée en cas d'échec, pour qu'un chunk
 * momentanément injoignable ne désactive pas les retours utilisateur
 * pour toute la vie de l'app.
 */
type IonicCore = typeof import("@ionic/core");

let ionicCorePromise: Promise<IonicCore> | undefined;

export function loadIonicCore(): Promise<IonicCore> {
  ionicCorePromise ??= import("@ionic/core").catch((error: unknown) => {
    ionicCorePromise = undefined;
    throw error;
  });
  return ionicCorePromise;
}
