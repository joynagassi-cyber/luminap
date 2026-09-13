/**
 * Features configurables de Lumina.
 *
 * L'utilisateur choisit :
 *  - quelles features remplacent les emplacements 3 & 4 de la barre de
 *    navigation (« Groupes » et « Cultes/Événements » par défaut) ;
 *  - quelles features sont affichées (menu « Plus » des pages).
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
   * `core` : emplacements 1-2 de la nav, verrouillés (Accueil, Finances).
   * `feature` : remplaçable / masquable par l'utilisateur.
   */
  kind: "core" | "feature";
}

export const FEATURES: FeatureDef[] = [
  { id: "dashboard", label: "Accueil", route: "/", icon: Home, kind: "core" },
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

/** Nombre d'emplacements de la barre de navigation. */
export const NAV_TAB_COUNT = 4;
/** Emplacements verrouillés (Accueil, Finances). */
export const LOCKED_NAV_TABS: readonly string[] = ["dashboard", "finance"];
/** Réglage par défaut des 4 emplacements. */
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

function loadStored(): { navTabs: string[]; visible: Record<string, boolean> } {
  const visible: Record<string, boolean> = {};
  for (const f of FEATURES) visible[f.id] = true;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { navTabs: [...DEFAULT_NAV_TABS], visible };
    const parsed = JSON.parse(raw) as StoredFeatures;
    // Emplacements : on ne garde que des ids connus ; slots 0-1 verrouillés.
    const navTabs: string[] = [...DEFAULT_NAV_TABS];
    if (Array.isArray(parsed.navTabs)) {
      for (const i of [2, 3] as const) {
        const id = parsed.navTabs[i];
        if (typeof id === "string" && featureById(id)) navTabs[i] = id;
      }
    }
    if (parsed.visible && typeof parsed.visible === "object") {
      for (const f of FEATURES) {
        const v = parsed.visible[f.id];
        if (typeof v === "boolean") visible[f.id] = v;
      }
    }
    return { navTabs, visible };
  } catch {
    return { navTabs: [...DEFAULT_NAV_TABS], visible };
  }
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
  /** 4 ids de features (slots 0-1 = core verrouillés). */
  navTabs: string[];
  /** featureId -> affichée (menu « Plus ») ou non. */
  visible: Record<string, boolean>;
  /** Remplacer l'emplacement 3 ou 4 (index 2/3) par une feature. */
  setNavTab: (slot: 2 | 3, featureId: string) => void;
  /** Afficher / masquer une feature. */
  setFeatureVisible: (featureId: string, on: boolean) => void;
  /** Remettre les réglages par défaut. */
  resetFeatures: () => void;
}

const initial = loadStored();
persist(initial.navTabs, initial.visible);

export const useFeatureConfig = create<FeatureConfigState>((set, get) => ({
  navTabs: initial.navTabs,
  visible: initial.visible,

  setNavTab: (slot, featureId) => {
    const state = get();
    if (slot !== 2 && slot !== 3) return;
    const f = featureById(featureId);
    if (!f) return;
    // Interdit : mettre une feature déjà placée dans un autre slot.
    if (state.navTabs.includes(featureId) && state.navTabs[slot] !== featureId) {
      return;
    }
    const navTabs = [...state.navTabs];
    navTabs[slot] = featureId;
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
        const navTabs = [...DEFAULT_NAV_TABS];
        if (Array.isArray(parsed.navTabs)) {
          for (const i of [2, 3] as const) {
            const id = parsed.navTabs[i];
            if (typeof id === "string" && featureById(id)) navTabs[i] = id;
          }
        }
        const visible: Record<string, boolean> = {};
        for (const f of FEATURES) visible[f.id] = true;
        if (parsed.visible && typeof parsed.visible === "object") {
          for (const f of FEATURES) {
            const v = parsed.visible[f.id];
            if (typeof v === "boolean") visible[f.id] = v;
          }
        }
        useFeatureConfig.setState({ navTabs, visible });
      } catch {
        /* JSON invalide — on ignore */
      }
    }
  });
}

/**
 * Features à afficher dans le menu « Plus » : celles qui sont activées
 * (`visible`) et qui ne sont pas déjà épinglées dans la barre de
 * navigation (pas de doublon).
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
 * Résout les 4 emplacements de la barre en FeatureDef, en éliminant les
 * doublons (une feature mise deux fois ne s'affiche qu'une seule fois, le
 * slot dupliqué retombe sur l'option par défaut de ce slot).
 */
export function featuresForNav(navTabs: string[]): FeatureDef[] {
  const seen = new Set<string>();
  return navTabs.map((id, i) => {
    const f = featureById(id);
    const fallback = featureById(DEFAULT_NAV_TABS[i]) ?? featureById("groups")!;
    if (!f || seen.has(f.id)) return fallback;
    seen.add(f.id);
    return f;
  });
}
