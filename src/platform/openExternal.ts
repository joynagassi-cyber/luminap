/**
 * Façade plateforme — ouverture de liens externes (URL signées, docs, web).
 *
 * PROBLÈME VISÉ (cf. docs/PLATFORM-GOVERNANCE.md §4.3)
 * ---------------------------------------------------
 * `window.open(url, "_blank")` et les ancres `target="_blank"` sont des
 * **no-op dans la WebView Android de Capacitor** : aucun onglet ne s'ouvre,
 * l'utilisateur ne voit rien (échec silencieux). Idem pour les boutons
 * « Voir le PDF » / « Télécharger » qui s'appuyaient dessus.
 *
 * La source correcte sur natif est `@capacitor/browser` (Custom Tabs / SFSafari)
 * — déjà utilisée pour l'OAuth dans `src/lib/auth.ts`.
 *
 * SEUL module autorisé à appeler `window.open` / à produire un `target="_blank"`
 * (verrouillé par `platform-abstraction-guard.test.ts`).
 */
import { Capacitor } from "@capacitor/core";

/**
 * Ouvre une URL dans le navigateur externe de la plateforme.
 * Natif : `@capacitor/browser`. Web : nouvel onglet, repli navigation directe
 * si le popup est bloqué. Ne lève jamais (l'appelant n'a rien à rattraper).
 */
export async function openExternal(url: string): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    try {
      const { Browser } = await import("@capacitor/browser");
      await Browser.open({ url });
      return;
    } catch {
      /* plugin indisponible → repli web ci-dessous */
    }
  }
  try {
    const win = window.open(url, "_blank", "noopener,noreferrer");
    if (!win) window.location.assign(url); // popup bloquée → navigation directe
  } catch {
    /* environnement sans window (SSR/test) : rien à faire */
  }
}
