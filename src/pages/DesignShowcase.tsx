/**
 * DesignShowcase — Vitrine du système de design Lumina.
 *
 * Cette page démontre TOUS les angles du design couverts par les nouvelles
 * librairies installées :
 *  - Typographie, espacement, bordures, radius (src/design/tokens.ts)
 *  - Mouvement & micro-interactions (framer-motion, tailwindcss-motion)
 *  - Formulaires stylés (@tailwindcss/forms)
 *  - Ombres & élévation
 *  - Thème clair/sombre (déjà existant)
 *
 * Route : /design-showcase (développement uniquement)
 */

import { useState } from "react";
import { Plus, Bell, Settings, TrendingUp } from "lucide-react";
import {
  MotionCard,
  MotionList,
} from "@/design/motion";
import { FormField } from "@/design/forms";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  TYPOGRAPHY,
  SPACING,
  BORDERS,
  SHADOWS,
} from "@/design/tokens";

export default function DesignShowcase() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [count, setCount] = useState(0);

  const items = [
    { id: 1, label: "Transaction approuvée", amount: "+ 1 250 000 FCFA" },
    { id: 2, label: "Cotisation membre", amount: "+ 5 000 FCFA" },
    { id: 3, label: "Versement caisse", amount: "- 50 000 FCFA" },
  ];

  return (
    <div className="min-h-dvh bg-canvas text-text-primary font-sans transition-colors duration-300">
      {/* Header de la page */}
      <div className="px-6 py-8 border-b border-border">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold tracking-tight mb-2">
              Design System Lumina
            </h1>
            <p className="text-text-secondary text-{TYPOGRAPHY.lg.slice(0, -3)}">
              Vitrine de tous les angles du design — Apple × Google
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
              {theme === "dark" ? "Clair" : "Sombre"}
            </Button>
            <Button>
              <Plus size={18} />
              Nouveau
            </Button>
          </div>
        </div>
      </div>

      <div className="px-6 pb-24">
        {/* Section Typographie */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <span style={{ color: "var(--accent-primary)" }}>{{</span>
            Typographie
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[TYPOGRAPHY.xs, TYPOGRAPHY.sm, TYPOGRAPHY.base, TYPOGRAPHY.lg, TYPOGRAPHY.xl, TYPOGRAPHY["2xl"], TYPOGRAPHY["3xl"], TYPOGRAPHY["4xl"]].map((size, i) => (
              <MotionCard key={i} variant="flat">
                <p className="font-medium" style={{ fontSize: size }}>{size}</p>
                <p className="text-xs text-text-tertiary mt-1">Exemple</p>
              </MotionCard>
            ))}
          </div>
        </section>

        {/* Section Espacement */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6">Espacement (échelle 8px)</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {Object.entries(SPACING).map(([key, value]) => (
              <MotionCard key={key} variant="flat" className="p-3 text-center">
                <span className="block text-xs font-medium text-text-secondary">{key}</span>
                <span className="block text-[10px] text-text-tertiary">{value}</span>
              </MotionCard>
            ))}
          </div>
        </section>

        {/* Section Bordures & Radius */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6">Bordures & Radius</h2>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            {Object.entries(BORDERS).filter(([k]) => k !== "width" && k !== "color").map(([key, value]) => (
              <MotionCard key={key} variant="elevated" className={`p-4 text-center style={{ borderRadius: value as any }}`}>
                <span className="block text-xs font-medium text-text-secondary">{key}</span>
                <span className="block text-[10px] text-text-tertiary">{value}</span>
              </MotionCard>
            ))}
          </div>
        </section>

        {/* Section Mouvement (Framer Motion) */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6">Mouvement & Micro-interactions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <MotionCard variant="accent" className="p-6 text-center cursor-pointer" onPress={() => setCount(c => c + 1)}>
              <TrendingUp size={24} className="mx-auto mb-3 text-accent-primary" />
              <p className="font-semibold text-text-primary">{count}</p>
              <p className="text-xs text-text-tertiary">Cliquez pour animer</p>
            </MotionCard>
            <MotionCard variant="flat" className="p-6 text-center">
              <Bell size={24} className="mx-auto mb-3 text-text-secondary" />
              <p className="font-semibold text-text-primary">Notifications</p>
              <p className="text-xs text-text-tertiary">Temps réel</p>
            </MotionCard>
            <MotionCard variant="flat" className="p-6 text-center">
              <Settings size={24} className="mx-auto mb-3 text-text-secondary" />
              <p className="font-semibold text-text-primary">Paramètres</p>
              <p className="text-xs text-text-tertiary">Configuration</p>
            </MotionCard>
          </div>

          {/* Liste animée */}
          <div className="mt-8">
            <h3 className="text-lg font-semibold mb-4">Liste animée (staggered)</h3>
            <MotionList
              items={items}
              variant="slide"
              staggerChildren={0.08}
              itemClassName="flex justify-between items-center"
              renderItem={(item) => (
                <>
                  <span className="text-text-primary">{item.label}</span>
                  <span className="text-text-tertiary text-sm">{item.amount}</span>
                </>
              )}
            />
          </div>
        </section>

        {/* Section Ombres & Élévation */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6">Ombres & Élévation</h2>
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
            {Object.entries(SHADOWS).map(([key, value]) => (
              <MotionCard key={key} variant="flat" className={`p-6 text-center style={{ boxShadow: value as any }}`}>
                <span className="block text-xs font-medium text-text-secondary">{key}</span>
                <span className="block text-[10px] text-text-tertiary mt-1">{value}</span>
              </MotionCard>
            ))}
          </div>
        </section>

        {/* Section Formulaires */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6">Formulaires (@tailwindcss/forms)</h2>
          <div className="max-w-md space-y-4">
            <FormField label="Nom de l'organisation" helperText="Ex: Église MFE-JC Centrale">
              <input type="text" className="form-input" placeholder="Saisir le nom" />
            </FormField>
            <FormField label="Montant" error="Ce champ est requis">
              <input type="number" className="form-input" placeholder="0 FCFA" />
            </FormField>
            <FormField label="Type de transaction" helperText="Entrée ou sortie">
              <select className="form-select">
                <option>Entrée</option>
                <option>Sortie</option>
              </select>
            </FormField>
            <div className="flex items-center gap-2">
              <input type="checkbox" className="form-checkbox" />
              <label className="text-sm text-text-secondary">J'accepte les conditions</label>
            </div>
          </div>
        </section>

        {/* Section Couleurs (tokens existants) */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6">Couleurs (tokens Lumina)</h2>
          <div className="grid grid-cols-1 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            {[
              { label: "Accent principal", value: "var(--accent-primary)" },
              { label: "Revenu (in)", value: "var(--in)" },
              { label: "Dépense (out)", value: "var(--out)" },
              { label: "Attente (warn)", value: "var(--warn)" },
              { label: "Canvas", value: "var(--canvas)" },
              { label: "Surface", value: "var(--surface)" },
              { label: "Texte principal", value: "var(--text-primary)" },
              { label: "Texte secondaire", value: "var(--text-secondary)" },
              { label: "Bordure", value: "var(--border)" },
            ].map(({ label, value }) => (
              <MotionCard key={label} variant="flat" className="p-4">
                <div
                  className="w-10 h-10 rounded-lg mb-2"
                  style={{ backgroundColor: value, border: "1px solid var(--border)" }}
                />
                <p className="text-xs text-text-secondary">{label}</p>
                <p className="text-[10px] text-text-tertiary truncate" title={value}>{value}</p>
              </MotionCard>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
