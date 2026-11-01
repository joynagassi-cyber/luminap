/**
 * Labo Design — Chargement paresseux du Labo (développement uniquement).
 *
 * Le module `@/labo/labo-toggle` n'est importé dynamiquement QUE si
 * `import.meta.env.DEV` est vrai. En production, Vite remplace
 * `import.meta.env.DEV` par `false`, le `if` est éliminé comme code mort,
 * et le module Labo (y compris @faker-js/faker et le panneau UI) n'entre
 * PAS dans le bundle de production.
 */

import { useState, useEffect } from "react";

export function LaboToggleLazy() {
  const [Component, setComponent] = useState<React.ComponentType | null>(null);

  useEffect(() => {
    if (import.meta.env.DEV) {
      import("./labo-toggle").then((m) => {
        setComponent(m.LaboToggle);
      });
    }
  }, []);

  if (!Component) return null;
  return <Component />;
}
