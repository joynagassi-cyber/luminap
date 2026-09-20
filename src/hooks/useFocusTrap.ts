import { useEffect, type RefObject } from "react";

/**
 * Piège le focus clavier (Tab / Maj+Tab) dans l'élément pointé par `ref`.
 * - À l'activation (`active` → true) : porte le focus sur la première cible
 *   focalisable du conteneur.
 * - Tant que `active` : cycle le focus à l'intérieur (pas de fuite).
 * - À la désactivation : restitue le focus à l'élément actif précédent.
 *
 * Le composant appelant reste responsable de l'ARÔLE `role="dialog"` +
 * `aria-modal` du panneau et de masquer le fond (`aria-hidden`).
 */
export function useFocusTrap(
  ref: RefObject<HTMLElement | null>,
  active: boolean
) {
  useEffect(() => {
    if (!active) return;
    const lastFocused = document.activeElement as HTMLElement | null;

    const focusables = () => {
      const root = ref.current;
      if (!root) return [] as HTMLElement[];
      return Array.from(
        root.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
      ).filter((el) => !el.hasAttribute("disabled") && el !== document.body);
    };

    const timer = setTimeout(() => {
      const els = focusables();
      (els[0] ?? ref.current)?.focus?.();
    }, 0);

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const els = focusables();
      if (els.length === 0) {
        e.preventDefault();
        (ref.current as HTMLElement | null)?.focus?.();
        return;
      }
      const first = els[0];
      const last = els[els.length - 1];
      const activeEl = document.activeElement as HTMLElement;
      if (e.shiftKey && activeEl === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && activeEl === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("keydown", onKeyDown);
      lastFocused?.focus?.();
    };
  }, [ref, active]);
}
