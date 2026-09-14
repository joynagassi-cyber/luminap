/**
 * Features configurables de Lumina.
 *
 * La barre de navigation n'est PAS hardcodée : l'utilisateur compose lui-même
 * sa liste d'onglets (ajout, retrait, réordonnancement — min 1, max 4 items)
 * et choisit quelles features s'affichent dans le menu « Plus ».
 *
 * Le réglage est local-first (localStorage `lumina-features`) : il s'applique
 * instantanément partout (BottomNav, Settings) via le store zustand.
 */
import { create } from "zustand";
import type { LucideIcon } from "lucide-react";
import {
  Home,
  Wallet,
  Users,
  CalendarPlus,
  CalendarDays,
  ArrowRightLeft,
  BarChart3,
  LineChart,
  User,
  CalendarCheck,
  History,
  Archive,
  ListChecks,
  FileText,
  Settings as SettingsIcon,
  HelpCircle,
} from "lucide-react";

export interface FeatureDef {
  /** Identifiant stable (clé du réglage). */
  id: string;
  /** Libellé affiché (français). */
  label: string;
  /** Route cible. */
  route: string;
  icon: LucideIcon;
  /**
   * `core` : features de base recommandées (Accueil, Finances) — mais comme
   * les autres, elles peuvent être retirées de la nav par l'utilisateur.
   */
  kind: "core" | "feature";
}

export const FEATURES: FeatureDef[] = [
  {
    id: "dashboard",
    label: "Accueil",
    // Cible la page Dashboard réelle (/dashboard). Ne PAS "/" : "/" redirige
    // vers /splash (écran noir de chargement) et l'onglet ne s'allumait jamais.
    route: "/dashboard",
    icon: Home,
    kind: "core",
  },
  {
    id: "finance",
    label: "Finances",
    route: "/finance",
    icon: Wallet,
    kind: "core",
  },
  {
    id: "groups",
    label: "Groupes",
    route: "/groups",
    icon: Users,
    kind: "feature",
  },
  {
    id: "cotisations",
    label: "Cultes",
    route: "/cotisations",
    icon: CalendarPlus,
    kind: "feature",
  },
  {
    id: "events",
    label: "Événements",
    route: "/events",
    icon: CalendarDays,
    kind: "feature",
  },
  {
    id: "versement",
    label: "Versement",
    route: "/versement",
    icon: ArrowRightLeft,
    kind: "feature",
  },
  {
    id: "rapports",
    label: "Rapports",
    route: "/reports",
    icon: BarChart3,
    kind: "feature",
  },
  {
    id: "bilan",
    label: "Bilan",
    route: "/balance",
    icon: LineChart,
    kind: "feature",
  },
  {
    id: "membres",
    label: "Membres",
    route: "/members",
    icon: User,
    kind: "feature",
  },
  {
    id: "membres-avance",
    label: "Membres en avance",
    route: "/membres-en-avance",
    icon: CalendarCheck,
    kind: "feature",
  },
  {
    id: "historique",
    label: "Historique",
    route: "/history",
    icon: History,
    kind: "feature",
  },
  {
    id: "archives",
    label: "Archives",
    route: "/archives",
    icon: Archive,
    kind: "feature",
  },
  {
    id: "trace",
    label: "Trace",
    route: "/trace",
    icon: ListChecks,
    kind: "feature",
  },
  {
    id: "formulaires",
    label: "Formulaires",
    route: "/forms",
    icon: FileText,
    kind: "feature",
  },
  {
    id: "parametres",
    label: "Paramètres",
    route: "/settings",
    icon: SettingsIcon,
    kind: "feature",
  },
  {
    id: "aide",
    label: "Aide",
    route: "/help",
    icon: HelpCircle,
    kind: "feature",
  },
];

export const featureById = (id: string): FeatureDef | undefined =>
  FEATURES.find((f) => f.id === id);

/** Bornes de la liste de navigation (l'utilisateur compose sa liste). */
export const MIN_NAV_TABS = 1;
export const MAX_NAV_TABS = 4;
/** Liste de navigation par défaut (point de départ, modifiable). */
export const DEFAULT_NAV_TABS: string[] = [
  "dashboard",
  "finance",
  "groups",
  "cotisations",
];

const STORAGE_KEY = "lumina-features";

interface StoredFeatures {
  navTabs?: string[];
  visible?: Record<string, boolean>;
}

/** Filtre une liste brute : ids connus uniquement, sans doublon, ≤ MAX. */
function sanitizeNavTabs(raw: unknown): string[] | null {
  if (!Array.isArray(raw)) return null;
  const out: string[] = [];
  for (const id of raw) {
    if (typeof id === "string" && featureById(id) && !out.includes(id)) {
      out.push(id);
    }
  }
  return out.slice(0, MAX_NAV_TABS);
}

function loadStored(): { navTabs: string[]; visible: Record<string, boolean> } {
  const visible: Record<string, boolean> = {};
  for (const f of FEATURES) visible[f.id] = true;
  const result = { navTabs: [...DEFAULT_NAV_TABS], visible };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return result;
    const parsed = JSON.parse(raw) as StoredFeatures;
    const navTabs = sanitizeNavTabs(parsed.navTabs);
    if (navTabs && navTabs.length >= MIN_NAV_TABS) result.navTabs = navTabs;
    if (parsed.visible && typeof parsed.visible === "object") {
      for (const f of FEATURES) {
        const v = parsed.visible[f.id];
        if (typeof v === "boolean") visible[f.id] = v;
      }
    }
  } catch {
    /* JSON invalide — réglages par défaut */
  }
  result.visible = visible;
  return result;
}

function persist(navTabs: string[], visible: Record<string, boolean>) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ navTabs, visible } satisfies StoredFeatures),
    );
  } catch {
    /* stockage plein / privé — le réglage reste en mémoire */
  }
}

export interface FeatureConfigState {
  /** Liste dynamique des onglets de la barre (1 à MAX_NAV_TABS ids). */
  navTabs: string[];
  /** featureId -> affichée (menu « Plus ») ou non. */
  visible: Record<string, boolean>;
  /** Ajouter une feature à la barre (max 4 items, pas de doublon). */
  addNavTab: (featureId: string) => void;
  /** Retirer une feature de la barre (min 1 item). */
  removeNavTab: (featureId: string) => void;
  /** Déplacer un onglet d'une position (delta = -1 ou +1). */
  moveNavTab: (index: number, delta: -1 | 1) => void;
  /** Afficher / masquer une feature du menu « Plus ». */
  setFeatureVisible: (featureId: string, on: boolean) => void;
  /** Remettre les réglages par défaut. */
  resetFeatures: () => void;
}

const initial = loadStored();
persist(initial.navTabs, initial.visible);

export const useFeatureConfig = create<FeatureConfigState>((set, get) => ({
  navTabs: initial.navTabs,
  visible: initial.visible,

  addNavTab: (featureId) => {
    const state = get();
    if (state.navTabs.length >= MAX_NAV_TABS) return;
    if (state.navTabs.includes(featureId)) return;
    if (!featureById(featureId)) return;
    const navTabs = [...state.navTabs, featureId];
    persist(navTabs, state.visible);
    set({ navTabs });
  },

  removeNavTab: (featureId) => {
    const state = get();
    if (state.navTabs.length <= MIN_NAV_TABS) return;
    if (!state.navTabs.includes(featureId)) return;
    const navTabs = state.navTabs.filter((id) => id !== featureId);
    persist(navTabs, state.visible);
    set({ navTabs });
  },

  moveNavTab: (index, delta) => {
    const state = get();
    const target = index + delta;
    if (target < 0 || target >= state.navTabs.length) return;
    const navTabs = [...state.navTabs];
    const [id] = navTabs.splice(index, 1);
    navTabs.splice(target, 0, id);
    persist(navTabs, state.visible);
    set({ navTabs });
  },

  setFeatureVisible: (featureId, on) => {
    const state = get();
    const visible = { ...state.visible, [featureId]: on };
    persist(state.navTabs, visible);
    set({ visible });
  },

  resetFeatures: () => {
    const visible: Record<string, boolean> = {};
    for (const f of FEATURES) visible[f.id] = true;
    const navTabs = [...DEFAULT_NAV_TABS];
    persist(navTabs, visible);
    set({ navTabs, visible });
  },
}));

// Synchronisation entre onglets (localStorage) — le réglage fait dans un
// onglet s'applique aux autres.
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === STORAGE_KEY && e.newValue) {
      try {
        const parsed = JSON.parse(e.newValue) as StoredFeatures;
        const visible: Record<string, boolean> = {};
        for (const f of FEATURES) visible[f.id] = true;
        if (parsed.visible && typeof parsed.visible === "object") {
          for (const f of FEATURES) {
            const v = parsed.visible[f.id];
            if (typeof v === "boolean") visible[f.id] = v;
          }
        }
        const navTabs = sanitizeNavTabs(parsed.navTabs);
        useFeatureConfig.setState({
          navTabs:
            navTabs && navTabs.length >= MIN_NAV_TABS
              ? navTabs
              : [...DEFAULT_NAV_TABS],
          visible,
        });
      } catch {
        /* JSON invalide — on ignore */
      }
    }
  });
}

/**
 * Features à afficher dans le menu « Plus » : celles qui sont activées
 * (`visible`) et qui ne sont pas déjà dans la barre de navigation
 * (pas de doublon).
 */
export function featuresForMoreMenu(
  navTabs: string[],
  visible: Record<string, boolean>,
): FeatureDef[] {
  return FEATURES.filter(
    (f) => !navTabs.includes(f.id) && (visible[f.id] ?? true),
  );
}

/**
 * Résout la liste de navigation (1 à 4 features) en FeatureDef, en
 * éliminant les doublons et les ids inconnus.
 */
export function featuresForNav(navTabs: string[]): FeatureDef[] {
  const out: FeatureDef[] = [];
  for (const id of navTabs) {
    const f = featureById(id);
    if (f && !out.some((o) => o.id === f.id)) out.push(f);
  }
  return out;
}
