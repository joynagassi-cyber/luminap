/**
 * Rafraîchissement au RETOUR sur une page (A5).
 *
 * PROBLÈME (constaté dans le code, pas supposé) : Ionic garde les pages
 * précédentes MONTÉES dans la pile du routeur. Un `useEffect(…, [])` ne
 * s'exécute donc qu'à la première visite : au retour, un écran qui charge
 * « une fois » (`/finance`, `/members`, `/archives`…) rejoue son rendu avec
 * les données de la visite précédente. Les hooks réactifs de PowerSync n'ont
 * pas ce défaut ; les chargements ponctuels si.
 *
 * SOLUTION : le hook officiel d'Ionic (`useIonViewWillEnter`), et non un
 * écouteur maison de navigation — règle « Ionic d'abord ». `useIonViewDidEnter`
 * est écarté : il s'exécute après l'animation d'entrée, ce qui laisse voir un
 * écran périmé pendant la transition.
 *
 * HORS d'un `<IonRouterOutlet>` (tests jsdom, rendu isolé), `useIonViewWillEnter`
 * ne se déclenche jamais. Le chargement initial reste donc porté par le
 * `useEffect` existant de la page : ce hook ne fait QUE couvrir le retour, ce
 * qui évite un double chargement au premier affichage et garde les tests
 * existants valides.
 */

import { useEffect, useRef } from "react";
import { useIonViewWillEnter } from "@ionic/react";

export interface RefreshOnViewEnterOptions {
  /** Nom lisible de la page/du chargement — sert la journalisation. */
  label: string;
  /** Journalise l'erreur de chargement (ne jamais avaler). */
  onError?: (error: unknown, context: { label: string; phase: "refresh" }) => void;
  /**
   * Désactive le rafraîchissement (ex. écran en cours de soumission).
   * Défaut : actif.
   */
  enabled?: boolean;
}

/**
 * Exécute `reload` à chaque ENTRÉE dans la vue (première visite incluse).
 * L'identité de `reload` est suivie dans un `ref` : passer une fonction inline
 * ne provoque pas de rechargement en boucle.
 */
export function useRefreshOnViewEnter(
  reload: () => unknown,
  { label, onError, enabled = true }: RefreshOnViewEnterOptions,
): void {
  const reloadRef = useRef(reload);
  reloadRef.current = reload;
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  // Une seule source d'exécution : le hook Ionic. Le repli « montage React »
  // ne sert qu'en environnement sans routeur Ionic (tests, storybook).
  useIonViewWillEnter(() => {
    if (!enabledRef.current) return;
    try {
      const result = reloadRef.current();
      if (result && typeof (result as Promise<unknown>).catch === "function") {
        (result as Promise<unknown>).catch((error) =>
          onError?.(error, { label, phase: "refresh" }),
        );
      }
    } catch (error) {
      onError?.(error, { label, phase: "refresh" });
    }
  });
}

/**
 * Le retour dans la vue est-il observé par Ionic ? (diagnostic/tests)
 * Exposé pour que les pages puissent documenter leur comportement sans
 * dépendre d'un détail interne du routeur.
 */
export function ionicViewHooksAvailable(): boolean {
  return typeof window !== "undefined" && Boolean((window as { Ionic?: unknown }).Ionic);
}
