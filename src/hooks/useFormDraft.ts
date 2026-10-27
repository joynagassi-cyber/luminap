/**
 * PM7 — brouillon de saisie longue.
 *
 * Une session qui expire (ou un écran qui se ferme) pendant qu'un utilisateur
 * remplit un formulaire de 20 champs lui fait tout retaper. Ce module sauvegarde
 * la saisie en continu dans `localStorage` et la restaure à la réouverture.
 *
 * Périmètre : brouillon LOCAL, effacé dès la soumission réussie. Clés
 * préfixées `lumina-draft:` → balayées par la purge de changement de compte
 * (PM18) et la réinitialisation locale (PM15).
 */
import { useCallback, useEffect, useRef, useState } from "react";

const PREFIX = "lumina-draft:";

function storageKey(key: string): string {
  return `${PREFIX}${key}`;
}

/** Lit un brouillon. Renvoie `null` si absent ou illisible. */
export function readDraft<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(storageKey(key));
    if (raw === null) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/** Écrit un brouillon (best-effort : le stockage peut être plein/indisponible). */
export function writeDraft<T>(key: string, value: T): void {
  try {
    localStorage.setItem(storageKey(key), JSON.stringify(value));
  } catch {
    /* quota dépassé ou stockage indisponible — la saisie reste en mémoire */
  }
}

/** Efface un brouillon (soumission réussie, abandon explicite). */
export function clearDraft(key: string): void {
  try {
    localStorage.removeItem(storageKey(key));
  } catch {
    /* best-effort */
  }
}

/**
 * État de saisie persistant.
 *
 * @param key      identifiant du brouillon (ex. `form:${id}`)
 * @param initial  valeur de départ quand aucun brouillon n'existe
 * @param enabled  désactive la persistance (ex. formulaire déjà soumis)
 */
export function useFormDraft<T>(
  key: string,
  initial: T,
  enabled = true,
): {
  value: T;
  setValue: React.Dispatch<React.SetStateAction<T>>;
  /** vrai tant qu'un brouillon restauré n'a pas été acquitté */
  restored: boolean;
  /** efface le brouillon et masque l'avis de restauration */
  discard: () => void;
} {
  const [value, setValue] = useState<T>(() => {
    if (!enabled) return initial;
    return readDraft<T>(key) ?? initial;
  });
  const [restored, setRestored] = useState<boolean>(
    () => enabled && readDraft<T>(key) !== null,
  );
  // Évite d'écraser un brouillon par l'état initial au premier rendu.
  const hydrated = useRef(false);

  useEffect(() => {
    if (!enabled) return;
    if (!hydrated.current) {
      hydrated.current = true;
      return;
    }
    writeDraft(key, value);
  }, [key, value, enabled]);

  const discard = useCallback(() => {
    clearDraft(key);
    setRestored(false);
  }, [key]);

  return { value, setValue, restored, discard };
}
