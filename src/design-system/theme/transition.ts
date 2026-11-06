/** Bascule sans bloquer le thème si la transition n'est pas prise en charge. */
let fallbackTimer: ReturnType<typeof setTimeout> | undefined;
export function withThemeTransition(apply: () => void): void {
  if (typeof document === "undefined" || typeof window === "undefined") {
    apply();
    return;
  }
  let reduced = false;
  try { reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false; } catch { /* fallback */ }
  if (reduced) { apply(); return; }

  let applied = false;
  const once = () => { if (!applied) { applied = true; apply(); } };
  const start = (document as Document & { startViewTransition?: (fn: () => void) => unknown }).startViewTransition;
  if (typeof start === "function") {
    try { start.call(document, once); return; } catch { /* repli CSS */ }
  }
  const root = document.documentElement;
  if (fallbackTimer) clearTimeout(fallbackTimer);
  root.classList.add("theme-transition");
  try { once(); } finally {
    fallbackTimer = setTimeout(() => {
      root.classList.remove("theme-transition");
      fallbackTimer = undefined;
    }, 300);
  }
}
