/**
 * Ordre d'affichage des caisses / comptes.
 *
 * Les listes provenaient de `SELECT … ORDER BY name` (SQL) : l'ordre était donc
 * purement alphabétique, sans égard pour la caisse PRINCIPALE, et la caisse de
 * groupe créée pouvait apparaître avant elle. On veut un ordre STABLE et
 * signifiant partout (sélecteurs de caisse, filtres Finance, versements) :
 *   1. la caisse principale d'abord (« main » / type MAIN / compte ORGANIZATION),
 *   2. puis les caisses de groupe, par nom (comparaison FR insensible à la casse).
 */

export type SortableCaisse = {
  id: string;
  name?: string | null;
  /** Caisses : 'MAIN' | 'GROUP'. */
  type?: string | null;
  /** Comptes : 'ORGANIZATION' | 'GROUP'. */
  owner_type?: string | null;
};

/** Une caisse/compte est « principal » s'il représente l'organisation entière. */
export function isMainCaisse(c: SortableCaisse): boolean {
  return c.id === "main" || c.type === "MAIN" || c.owner_type === "ORGANIZATION";
}

/** Retourne une NOUVELLE liste : principale d'abord, puis groupes par nom. */
export function sortCaisses<T extends SortableCaisse>(caisses: T[]): T[] {
  return [...caisses].sort((a, b) => {
    const aMain = isMainCaisse(a) ? 0 : 1;
    const bMain = isMainCaisse(b) ? 0 : 1;
    if (aMain !== bMain) return aMain - bMain;
    return (a.name ?? "").localeCompare(b.name ?? "", "fr", {
      sensitivity: "base",
    });
  });
}
