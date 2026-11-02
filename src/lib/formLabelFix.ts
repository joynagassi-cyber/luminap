/**
 * formLabelFix — correction globale du chevauchement label flottant / valeur
 * sur tous les `IonInput position="floating"` de l'application.
 *
 * Problème : avec React, la valeur de l'input est contrôlée par `value={...}`.
 * Ionic ne détecte pas toujours ce changement et laisse le label « flottant »
 * en position basse, ce qui fait chevaucher le label et la valeur
 * (ex. le libellé « Montant » superposé sur « 0 »).
 *
 * Solution :
 *  1. On écoute les événements `ionInput` (qui remontent jusqu'à `document`).
 *  2. Quand un `ion-input` reçoit une valeur non vide, on ajoute la classe
 *     `has-value` sur son ancêtre `ion-item` le plus proche.
 *  3. Quand l'input est vide, on retire la classe.
 *  4. Au premier appel, on initialise tous les inputs déjà présents dans le DOM.
 *
 * Le CSS correspondant (dans App.css) remonte le label quand
 * `ion-item.has-value` est présent.
 *
 * Appeler `initFloatingLabelFix()` une fois à la racine de l'app (main.tsx).
 */

export function initFloatingLabelFix(): void {
  if (typeof document === "undefined") return;

  /** Ajoute ou retire `has-value` sur l'ion-item parent d'un ion-input. */
  const syncItem = (input: HTMLIonInputElement) => {
    if (!input) return;
    const item = input.closest("ion-item");
    if (!item) return;
    const value =
      input.value ?? input.getAttribute("value") ?? "";
    const hasValue = value !== "" && value !== "0";
    if (hasValue) {
      item.classList.add("has-value");
    } else {
      item.classList.remove("has-value");
    }
  };

  /** Écoute les changements sur tous les ion-input (événement qui remonte). */
  document.addEventListener(
    "ionInput",
    (evt) => {
      const target = evt.target as HTMLIonInputElement | null;
      if (target?.tagName === "ION-INPUT") syncItem(target);
    },
    { capture: true },
  );

  /** Initialise tous les inputs déjà présents dans le DOM. */
  const initExisting = () => {
    document.querySelectorAll("ion-input").forEach((el) => {
      syncItem(el as HTMLIonInputElement);
    });
  };

  initExisting();

  // Ré-initialise après chaque navigation Ionic (les pages sont montées/démontées).
  // On utilise un petit délai pour laisser le temps au DOM de se construire.
  const routerObserver = new MutationObserver(() => {
    requestAnimationFrame(initExisting);
  });
  routerObserver.observe(document.body, {
    childList: true,
    subtree: true,
  });
}
