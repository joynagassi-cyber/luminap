import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

export default {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "1rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        // Lumina Design System — pointeurs sur les tokens CSS (src/App.css),
        // qui basculent dark/light via [data-theme] sur <html>.
        canvas: "var(--canvas)",
        surface: "var(--surface)",
        "surface-hover": "var(--surface-hover)",
        "surface-active": "var(--surface-active)",
        card: "var(--card)",
        "text-primary": "var(--text-primary)",
        "text-secondary": "var(--text-secondary)",
        "text-tertiary": "var(--text-tertiary)",
        "text-placeholder": "var(--text-placeholder)",
        // Financial colors — invariants (le langage de l'argent ne change pas)
        income: "var(--data-income)",
        expense: "var(--data-expense)",
        pending: "var(--data-pending)",
        // Statuts sémantiques (hors finances) — invariants (DESIGN.md §2)
        planified: "var(--data-planified)",
        advance: "var(--data-advance)",
        success: "var(--data-success)",
        alert: "var(--data-alert)",
        // « data-muted » (état de statut, ci-dessous) ≠ alias shadcn `muted`
        // (objet { DEFAULT, foreground }) pour les composantes ui/*.
        // Texte « inversé » sur accent — bascule si un thème org pousse
        // un accent clair (H1 : plus de text-white hard-codée)
        "on-accent": "var(--on-accent)",
        // Élévations nommées (H3 / M16) : shadow-card & shadow-pop suivent
        // les modes, shadow-accent/Sm sont invariants (teinte d'accent)
        "shadow-card": "var(--shadow-card)",
        "shadow-pop": "var(--shadow-pop)",
        "shadow-accent": "var(--shadow-accent)",
        "shadow-accent-sm": "var(--shadow-accent-sm)",
        // Lumina brand
        lumina: {
          DEFAULT: "#FF6B00",
          light: "#FF8533",
          dark: "#CC5500",
        },
        border: "var(--border)",
        input: "var(--border)",
        ring: "var(--accent-primary)",
        background: "var(--canvas)",
        foreground: "var(--text-primary)",
        primary: {
          DEFAULT: "var(--accent-primary)",
          foreground: "#FFFFFF",
        },
        secondary: {
          DEFAULT: "var(--surface-hover)",
          foreground: "var(--text-secondary)",
        },
        destructive: {
          DEFAULT: "var(--data-expense)",
          foreground: "#FFFFFF",
        },
        muted: {
          DEFAULT: "var(--surface-hover)",
          foreground: "var(--text-tertiary)",
        },
        // Voile (scrim) — suit le mode (60 % sombre / 35 % clair, App.css)
        // pour ne pas écraser les surfaces blanches en light mode (M14).
        scrim: "var(--scrim)",
        accent: {
          DEFAULT: "var(--accent-primary)",
          foreground: "#FFFFFF",
        },
        // Couleurs de statut sémantiques (invariantes, DESIGN.md §2) — nommées
        // sans préfixe pour ne pas coller avec le token `muted` shadcn.
        "data-muted": "var(--data-muted)",
        "data-pink": "var(--data-pink)",
        "data-exhausted": "var(--data-exhausted)",
        popover: {
          DEFAULT: "var(--surface)",
          foreground: "var(--text-primary)",
        },
        "card-foreground": "var(--text-primary)",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      // Élévations : shadow-card/shadow-pop suivent les tokens (mode clair =
      // ombres 0.08/0.12), shadow-accent = teinte d'accent invariante (H3/M16)
      boxShadow: {
        card: "var(--shadow-card)",
        pop: "var(--shadow-pop)",
        accent: "var(--shadow-accent)",
        "accent-sm": "var(--shadow-accent-sm)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        fadeIn: {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        fadeIn: "fadeIn 0.3s ease-out",
      },
    },
  },
  plugins: [tailwindcssAnimate],
} satisfies Config;
