/**
 * Façade plateforme — feuille de partage système.
 *
 * PROBLÈME VISÉ (cf. docs/PLATFORM-GOVERNANCE.md §4.3)
 * -----------------------------------------------
 * La Web Share API (`navigator.share`) **n'existe pas dans la WebView Android
 * de Capacitor** : un partage qui ne s'appuie que sur elle retombe sur un repli
 * (copie presse-papiers) au lieu de la feuille de partage native attendue.
 *
 * Sur natif, le mécanisme correct est `@capacitor/share` (déjà une dépendance,
 * utilisé par `src/lib/download.ts`). SEUL module autorisé à décider du canal.
 */
import { Capacitor } from "@capacitor/core";

export type ShareOutcome = "shared" | "unsupported";

export interface ShareLinkOptions {
  title?: string;
  text?: string;
  url?: string;
  dialogTitle?: string;
}

/**
 * Ouvre la feuille de partage système.
 * - Natif : `@capacitor/share`.
 * - Web : `navigator.share` si le navigateur le propose.
 * Renvoie `"unsupported"` quand aucun canal n'est disponible (l'appelant décide
 * du repli). L'annulation par l'utilisateur (`AbortError`) est propagée.
 */
export async function shareLink(
  opts: ShareLinkOptions,
): Promise<ShareOutcome> {
  if (Capacitor.isNativePlatform()) {
    const { Share } = await import("@capacitor/share");
    await Share.share(opts);
    return "shared";
  }
  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    await navigator.share(opts);
    return "shared";
  }
  return "unsupported";
}
