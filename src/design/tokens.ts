/**
 * Lumina Design Tokens — Source unique de vérité pour tout le design.
 *
 * Cet fichier centralise TOUS les angles du design :
 *  - Typographie (tailles, graisses, interlettrage, hauteur de ligne)
 *  - Espacement (échelle 8px, padding, margin, gaps)
 *  - Bordures & radius (coins arrondis cohérents Apple/Google)
 *  - Ombres & élévation (shadow-card, shadow-pop, shadow-accent, etc.)
 *  - Mouvement & animation (durées, easing, courbes)
 *  - Couleurs (déjà dans src/App.css, référencées ici)
 *  - Interactions (états hover, active, focus, disabled)
 *
 * Toutes les valeurs sont des références vers les CSS variables de
 * src/App.css pour garder la cohérence dark/light automatique.
 */

// ─── Typographie ──────────────────────────────────────────────────────────────

export const TYPOGRAPHY = {
  // Tailles de police (rem → px via root 16px)
  xs: "0.75rem",      // 12px — captions, métadonnées
  sm: "0.875rem",     // 14px — texte secondaire, labels
  base: "1rem",       // 16px — texte de corps par défaut
  lg: "1.125rem",     // 18px — texte légèrement plus grand
  xl: "1.25rem",      // 20px — sous-titres
  "2xl": "1.5rem",    // 24px — titres de section
  "3xl": "1.875rem",  // 30px — titres de page
  "4xl": "2.25rem",   // 36px — héro, gros titres

  // Graisses
  thin: "100",
  light: "300",
  normal: "400",
  medium: "500",
  semibold: "600",
  bold: "700",
  extrabold: "800",

  // Hauteurs de ligne
  tight: "1.25",
  normal: "1.5",
  relaxed: "1.75",

  // Interlettrage (tracking)
  tighter: "-0.05em",
  tight: "-0.025em",
  normal: "0em",
  wide: "0.025em",
  wider: "0.05em",
  widest: "0.1em",

  // Famille de police (définie dans src/App.css : --font-sans)
  fontFamily: "var(--font-sans)",
} as const;

// ─── Espacement (échelle 8px) ─────────────────────────────────────────────────

export const SPACING = {
  0: "0",
  1: "0.25rem",   // 4px
  2: "0.5rem",    // 8px
  3: "0.75rem",   // 12px
  4: "1rem",      // 16px
  5: "1.25rem",   // 20px
  6: "1.5rem",    // 24px
  8: "2rem",      // 32px
  10: "2.5rem",   // 40px
  12: "3rem",     // 48px
  16: "4rem",     // 64px
  20: "5rem",     // 80px
  24: "6rem",     // 96px
} as const;

// ─── Bordures & Radius (coins arrondis cohérents) ─────────────────────────────

export const BORDERS = {
  // Radius — suivre le design Apple/Google : coins doux, pas trop arrondis
  none: "0",
  sm: "0.25rem",   // 4px — petits éléments, badges
  md: "0.5rem",    // 8px — cartes, inputs
  lg: "0.75rem",   // 12px — modales, grandes cartes
  xl: "1rem",      // 16px — conteneurs principaux
  full: "9999px",  // pilules, cercles, avatars

  // Épaisseur de bordure
  width: {
    none: "0",
    sm: "1px",
    md: "2px",
  },

  // Couleurs de bordure (référencent les CSS vars)
  color: "var(--border)",
} as const;

// ─── Ombres & Élévation ───────────────────────────────────────────────────────

export const SHADOWS = {
  none: "none",
  // shadow-card : suit le mode (0 sombre / douce en clair)
  card: "var(--shadow-card)",
  // shadow-pop : élévation forte pour modales, dropdowns
  pop: "var(--shadow-pop)",
  // shadow-accent : ombre teintée de l'accent (FAB, éléments mis en avant)
  accent: "var(--shadow-accent)",
  "accent-sm": "var(--shadow-accent-sm)",
  // shadow-fab : ombre spécifique pour le bouton flottant
  fab: "var(--shadow-fab)",
} as const;

// ─── Mouvement & Animation ────────────────────────────────────────────────────

export const MOTION = {
  // Durées (secondes / ms)
  instant: 0,
  fast: 0.15,      // 150ms — hover, micro-interactions
  normal: 0.3,     // 300ms — entrées de page, modales
  slow: 0.5,       // 500ms — transitions lentes,Hero
  slower: 0.75,    // 750ms — entrées héro

  // Courbes d'easing (cubical-bezier)
  ease: "cubic-bezier(0.4, 0, 0.2, 1)",      // standard
  easeIn: "cubic-bezier(0.4, 0, 1, 1)",      // démarrage lent
  easeOut: "cubic-bezier(0, 0, 0.2, 1)",     // arrêt lent
  easeInOut: "cubic-bezier(0.4, 0, 0.2, 1)", // les deux
  spring: "cubic-bezier(0.34, 1.56, 0.64, 1)", // rebond élastique
  bounce: "cubic-bezier(0.68, -0.55, 0.265, 1.55)", // rebond prononcé

  // Délais stagger pour les listes
  stagger: 0.05, // 50ms entre chaque élément d'une liste
} as const;

// ─── Interactions ─────────────────────────────────────────────────────────────

export const INTERACTION = {
  // États de survol
  hoverScale: 1.02,
  activeScale: 0.98,
  // Transitions
  transitionAll: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
  transitionOpacity: "opacity 0.3s ease",
  transitionTransform: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
  // Focus ring (accessibilité)
  focusRing: "2px solid var(--accent-primary)",
  // Hitzone tactile minimale (44px Apple, 48px Google)
  minTouchTarget: "44px",
} as const;

// ─── Breakpoints ──────────────────────────────────────────────────────────────

export const BREAKPOINTS = {
  sm: "640px",
  md: "768px",
  lg: "1024px",
  xl: "1280px",
  "2xl": "1536px",
} as const;

export type TypographyScale = keyof typeof TYPOGRAPHY;
export type SpacingScale = keyof typeof SPACING;
export type RadiusScale = keyof typeof BORDERS;
