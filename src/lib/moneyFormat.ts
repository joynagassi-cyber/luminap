/**
 * Format d'affichage des montants — préférence utilisateur.
 *
 * Les montants sont stockés en CENTIMES de FCFA (entier). Ce module décide
 * COMMENT ils s'écrivent à l'écran, sans jamais changer la valeur stockée.
 *
 * Quatre présentations (exigence produit) :
 *   - `compact`     : « 50K », « 1,5M »  (gain de place : cartes, héros)
 *   - `full`        : « 50 000 »         (chiffres groupés, sans symbole)
 *   - `compactFcfa` : « 50K FCFA »       (compact + devise)
 *   - `fullFcfa`    : « 50 000 FCFA »    (complet + devise)
 *
 * La préférence est LOCALE à l'appareil (comme le mode clair/sombre) : elle
 * est persistée dans `localStorage` sous `lumina-money-format`. Une valeur
 * absente ou illisible retombe sur `fullFcfa` — le format le plus explicite,
 * qui ne peut pas induire en erreur sur un montant.
 *
 * Le réglage est exposé via le store Zustand `useMoneyFormatStore` (React) et
 * via `getMoneyFormat()` (code non-React, ex. rendu PDF canvas).
 */
import { create } from "zustand";

export type MoneyFormat = "compact" | "full" | "compactFcfa" | "fullFcfa";

export const MONEY_FORMAT_STORAGE_KEY = "lumina-money-format";

export const MONEY_FORMAT_OPTIONS: {
  value: MoneyFormat;
  label: string;
  description: string;
}[] = [
  {
    value: "fullFcfa",
    label: "Complet avec devise",
    description: "Ex. 50 000 FCFA — le plus explicite",
  },
  {
    value: "full",
    label: "Complet sans devise",
    description: "Ex. 50 000",
  },
  {
    value: "compactFcfa",
    label: "Compact avec devise",
    description: "Ex. 50K FCFA, 1,5M FCFA",
  },
  {
    value: "compact",
    label: "Compact sans devise",
    description: "Ex. 50K, 1,5M",
  },
];

export const DEFAULT_MONEY_FORMAT: MoneyFormat = "fullFcfa";

const VALID: readonly MoneyFormat[] = [
  "compact",
  "full",
  "compactFcfa",
  "fullFcfa",
];

export function isMoneyFormat(v: unknown): v is MoneyFormat {
  return typeof v === "string" && (VALID as readonly string[]).includes(v);
}

/** Choix persisté. Absent / illisible → défaut (jamais d'exception au boot). */
export function getStoredMoneyFormat(): MoneyFormat {
  if (typeof localStorage === "undefined") return DEFAULT_MONEY_FORMAT;
  try {
    const v = localStorage.getItem(MONEY_FORMAT_STORAGE_KEY);
    return isMoneyFormat(v) ? v : DEFAULT_MONEY_FORMAT;
  } catch {
    return DEFAULT_MONEY_FORMAT;
  }
}

export function persistMoneyFormat(format: MoneyFormat): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(MONEY_FORMAT_STORAGE_KEY, format);
  } catch {
    /* appliqué en mémoire ; persistance perdue, sans conséquence */
  }
}

/**
 * Formatage de base (indépendant de la préférence) : `compact` ou `full`.
 * Exposé pour les tests et pour `export.ts` (rendu canvas).
 */
export function formatAmount(cents: number, style: "compact" | "full"): string {
  const ffa = (Number.isFinite(cents) ? cents : 0) / 100;
  if (style === "full") {
    return new Intl.NumberFormat("fr-FR", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(ffa);
  }
  const abs = Math.abs(ffa);
  if (abs >= 1_000_000) {
    const m = Math.round((ffa / 1_000_000) * 10) / 10;
    return `${String(m).replace(".", ",")}M`;
  }
  if (abs >= 1_000) return `${(ffa / 1_000).toFixed(0)}K`;
  return new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(ffa);
}

/**
 * Rend un montant en centimes selon la préférence courante.
 * Le symbole « FCFA » n'est ajouté que si le format le demande.
 */
export function renderMoney(cents: number, format: MoneyFormat): string {
  switch (format) {
    case "compact":
      return formatAmount(cents, "compact");
    case "full":
      return formatAmount(cents, "full");
    case "compactFcfa":
      return `${formatAmount(cents, "compact")} FCFA`;
    case "fullFcfa":
    default:
      return `${formatAmount(cents, "full")} FCFA`;
  }
}

/** Rendu avec la préférence COURANTE (lecture non-React). */
export function formatMoney(cents: number): string {
  return renderMoney(cents, getMoneyFormat());
}

let current: MoneyFormat = getStoredMoneyFormat();

/** Lecture synchrone de la préférence (utilisable hors composant React). */
export function getMoneyFormat(): MoneyFormat {
  return current;
}

export function setMoneyFormat(format: MoneyFormat): void {
  current = format;
  persistMoneyFormat(format);
}

interface MoneyFormatState {
  format: MoneyFormat;
  setFormat: (format: MoneyFormat) => void;
}

/**
 * Store Zustand — tous les composants qui affichent de l'argent s'abonnent
 * ici, donc changer le réglage re-rend IMMÉDIATEMENT toute l'application.
 */
export const useMoneyFormatStore = create<MoneyFormatState>()((set) => ({
  format: current,
  setFormat: (format) => {
    setMoneyFormat(format);
    set({ format });
  },
}));
