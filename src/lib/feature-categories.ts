/**
 * Catégorisation des features Lumina pour le menu latéral (sidebar).
 *
 * Le menu « Plus » historique listait TOUS les features à plat — illisible
 * au-delà de ~8 items. On regroupe désormais les features par CATÉGORIE ;
 * chaque catégorie est dépliable et liste les features qu'elle couvre,
 * cliquables vers leur route. Les catégories vides (aucune feature visible)
 * sont masquées automatiquement.
 *
 * `parametres` et `aide` sont SANS catégorie : elles restent affichées en
 * pied de sidebar (Profil / Paramètres) conformément à la spec design.
 */
import type { FeatureDef } from "./features";
import { FEATURES } from "./features";
import {
  Home,
  Wallet,
  CalendarDays,
  Users,
  FileText,
  ShieldCheck,
  BarChart3,
  type LucideIcon,
} from "lucide-react";

export interface FeatureCategory {
  id: string;
  label: string;
  icon: LucideIcon;
  /** Feature ids (clé du réglage `visible`) regroupés sous cette catégorie. */
  featureIds: string[];
}

/**
 * Catégories logiques, dans l'ordre d'affichage attendu.
 * Les ids référencean FEATURE ids (`features.ts`). Une feature absente de
 * toutes les catégories est quand même affichée (catégorie « Divers »
 * implicite via `ungroupedFeatureIds` ci-dessous), jamais perdue.
 */
export const FEATURE_CATEGORIES: FeatureCategory[] = [
  {
    id: "apercu",
    label: "Aperçu",
    icon: Home,
    featureIds: ["dashboard"],
  },
  {
    id: "finances",
    label: "Finances",
    icon: Wallet,
    featureIds: [
      "finance",
      "versement",
      "budgets",
      "bilan",
      "giving",
      "historique",
      "archives",
      "trace",
    ],
  },
  {
    id: "activites",
    label: "Activités",
    icon: CalendarDays,
    featureIds: ["cotisations", "events"],
  },
  {
    id: "personnes",
    label: "Personnes",
    icon: Users,
    featureIds: ["groups", "membres", "membres-avance"],
  },
  {
    id: "documents",
    label: "Documents",
    icon: FileText,
    featureIds: ["formulaires"],
  },
  {
    id: "gouvernance",
    label: "Gouvernance",
    icon: ShieldCheck,
    featureIds: ["invitations", "federation", "admin"],
  },
  {
    id: "analyses",
    label: "Analyses",
    icon: BarChart3,
    featureIds: ["rapports"],
  },
];

/**
 * Feature ids non rattachées à aucune catégorie explicite (ex. `parametres`,
 * `aide` gérées en pied de sidebar). Retourne la liste vide aujourd'hui mais
 * protège toute feature ajoutée sans catégorie : elle reste accessible.
 */
export function ungroupedFeatureIds(): string[] {
  const grouped = new Set(FEATURE_CATEGORIES.flatMap((c) => c.featureIds));
  return FEATURES.filter((f) => !grouped.has(f.id)).map((f) => f.id);
}

/** Résout une catégorie en FeatureDef filtrées par le réglage `visible`. */
export function visibleFeaturesInCategory(
  category: FeatureCategory,
  visible: Record<string, boolean>,
): FeatureDef[] {
  return category.featureIds
    .filter((id) => visible[id] ?? true)
    .map((id) => FEATURES.find((f) => f.id === id))
    .filter((f): f is FeatureDef => Boolean(f));
}
