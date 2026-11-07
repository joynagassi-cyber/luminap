/**
 * Façade plateforme — presse-papiers système.
 *
 * PROBLÈME VISÉ (cf. docs/PLATFORM-GOVERNANCE.md §4.3)
 * ---------------------------------------------------
 * Trois écrans appelaient `navigator.clipboard.writeText` en direct. En WebView
 * Android, l'API `navigator.clipboard` est **peu fiable** : elle exige un
 * contexte sécurisé ET un document focalisé, et peut être absente sur des
 * WebView anciennes. L'appel non protégé (`InvitationEmit`) lève alors un
 * `TypeError: Cannot read properties of undefined (reading 'writeText')` — un
 * « copier le code » qui ne fait rien et peut casser la suite du flux.
 *
 * Le mécanisme correct est `@capacitor/clipboard` (natif) ; sur le web, on
 * retombe sur `navigator.clipboard`.
 *
 * SEUL module autorisé à appeler l'API presse-papiers (verrouillé par
 * `platform-abstraction-guard.test.ts`).
 */
import { Capacitor } from "@capacitor/core";

/**
 * Écrit `text` dans le presse-papiers système.
 * - Natif : `@capacitor/clipboard`.
 * - Web : `navigator.clipboard` s'il est disponible.
 * Renvoie `true` si la copie a réussi, `false` si aucun canal n'était
 * disponible ou si l'écriture a été refusée (l'appelant décide du repli).
 */
export async function copyText(text: string): Promise<boolean> {
  if (Capacitor.isNativePlatform()) {
    const { Clipboard } = await import("@capacitor/clipboard");
    await Clipboard.write({ string: text });
    return true;
  }
  if (typeof navigator !== "undefined" && navigator.clipboard) {
    await navigator.clipboard.writeText(text);
    return true;
  }
  return false;
}
