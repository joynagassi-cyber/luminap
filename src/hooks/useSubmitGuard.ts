/**
 * useSubmitGuard — anti double-soumission (Phase 10 / PM17).
 *
 * Défaut visé : sur une action financière (approuver, rejeter, contre-transiger),
 * un double-tap ou un double-clic rapide déclenche le handler DEUX fois avant
 * que React n'ait re-rendu et désactivé le bouton (`disabled={submitting}` ne
 * protège qu'APRÈS le re-rendu). Résultat : double écriture.
 *
 * La garde est un `useRef` (mutation synchrone, lue immédiatement) : le second
 * appel concurrent voit `inFlight=true` et sort sans exécuter `fn`. L'état
 * `submitting` (asynchrone) ne sert qu'à l'affichage.
 *
 * Usage :
 *   const { submitting, run } = useSubmitGuard();
 *   const onApprove = () => run(() => approveTransactionPS(...));
 */

import { useCallback, useRef, useState } from "react";

export interface SubmitGuard {
  /** Vrai pendant l'exécution de `fn` (pour désactiver le bouton). */
  submitting: boolean;
  /**
   * Exécute `fn` une seule fois à la fois. Un appel concurrent tant que `fn`
   * n'est pas terminée est ignoré (retourne `undefined` sans lancer `fn`).
   */
  run: <T>(fn: () => Promise<T>) => Promise<T | undefined>;
}

export function useSubmitGuard(): SubmitGuard {
  const inFlight = useRef(false);
  const [submitting, setSubmitting] = useState(false);

  const run = useCallback(async <T,>(fn: () => Promise<T>): Promise<T | undefined> => {
    if (inFlight.current) return undefined;
    inFlight.current = true;
    setSubmitting(true);
    try {
      return await fn();
    } finally {
      inFlight.current = false;
      setSubmitting(false);
    }
  }, []);

  return { submitting, run };
}
