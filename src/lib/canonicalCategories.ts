/**
 * Canonical category identifiers — single source of truth.
 *
 * R89.a (CRITIQUE, 2026-10-26) : le client écrivait des identifiants de
 * catégorie littéraux (`cat-dime`, `cat-offrande`, …) alors que le serveur ne
 * contenait que `cat-1 … cat-9`. `transactions.category_id` porte une clé
 * étrangère vers `categories(id)` : chaque upload échouait donc en `23503`
 * (« violates foreign key constraint transactions_category_id_fkey ») et
 * **aucune transaction ne quittait l'appareil** — les données financières
 * n'étaient jamais synchronisées.
 *
 * Ce module est la SEULE source des identifiants. Il est consommé par :
 *   - `src/packs/church/index.ts` (seed local, picker) ;
 *   - la migration `20261026000006_seed_canonical_categories.sql` (seed
 *     serveur, vérifiée par `canonical-categories-drift.test.ts`).
 *
 * Toute évolution doit toucher les deux côtés — le test anti-dérive échoue
 * sinon, ce qui empêche la réapparition silencieuse du défaut.
 *
 * NOTE (limite connue) : `categories.id` est une clé primaire GLOBALE (pas
 * par organisation). Les identifiants canoniques n'existent donc qu'une fois
 * en base ; le picker serveur retombe sur le seed local (mêmes identifiants)
 * pour une organisation qui ne « possède » pas ces lignes. Le correctif
 * définitif (identifiants par organisation) est proposé séparément.
 */

export interface CanonicalCategory {
  /** Identifiant écrit par le client ET présent côté serveur (FK). */
  id: string;
  /** Clé métier stable (alignée sur le seed serveur cat-1…cat-9). */
  key: string;
  labelFr: string;
  type: "INCOME" | "EXPENSE";
}

export const CANONICAL_CATEGORIES: readonly CanonicalCategory[] = [
  { id: "cat-dime", key: "dime", labelFr: "Dîme", type: "INCOME" },
  { id: "cat-offrande", key: "offrande", labelFr: "Offrande", type: "INCOME" },
  {
    id: "cat-offrande-mission",
    key: "offrande_mission",
    labelFr: "Offrande Mission",
    type: "INCOME",
  },
  { id: "cat-don", key: "don", labelFr: "Don", type: "INCOME" },
  {
    id: "cat-salaire-pasteur",
    key: "salaire_pasteur",
    labelFr: "Salaire Pasteur",
    type: "EXPENSE",
  },
  {
    id: "cat-frais-fonc",
    key: "frais_fonctionnement",
    labelFr: "Frais de Fonctionnement",
    type: "EXPENSE",
  },
  { id: "cat-mission", key: "mission", labelFr: "Mission", type: "EXPENSE" },
  { id: "cat-entretien", key: "entretien", labelFr: "Entretien", type: "EXPENSE" },
  { id: "cat-aumone", key: "aumone", labelFr: "Aumône", type: "EXPENSE" },
] as const;

/** Identifiant de repli sûr, utilisé par défaut si aucun n'est choisi. */
export const DEFAULT_CATEGORY_ID = "cat-dime";

/** Vrai si `id` est un identifiant canonique connu. */
export function isCanonicalCategoryId(id: string | null | undefined): boolean {
  return !!id && CANONICAL_CATEGORIES.some((c) => c.id === id);
}
