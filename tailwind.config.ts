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
        accent: {
          DEFAULT: "var(--accent-primary)",
          foreground: "#FFFFFF",
        },
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
