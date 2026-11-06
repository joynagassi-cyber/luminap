/**
 * Design Lab — route `/dev/design-lab`, HORS PRODUCTION (dev uniquement :
 * la route React est compilée hors du build prod via `import.meta.env.DEV`
 * dans `src/ionic/routes/system.tsx`, et le résolveur n'accepte l'URL qu'en
 * dev — en prod elle retombe sur not-found).
 *
 * Page de recette du design system (spec §8) : affiche tous les jetons
 * `--lu-*` résolus dans la combinaison courante, avec une barre fixe pour
 * changer de thème / mode / effets à la volée. Les composants `Lu*` (P2/P3)
 * y seront exposés dans tous leurs états au fur et à mesure.
 *
 * Règles §0 : aucun littéral de couleur ici — les valeurs affichées sont
 * LUES via getComputedStyle et réinjectées telles quelles (jamais de var()
 * dynamique sur un jeton ni de littéral hex en style inline ; le ratchet veille).
 */
import { useEffect, useState } from "react";
import { IonPage, IonContent } from "@ionic/react";
import { Bell, ShoppingCart } from "lucide-react";
import { LUMINA_THEMES, type ThemeId } from "@/ionic/themes";
import { useTheme } from "@/design-system/theme/theme-context";
import { LuBadge, LuButton, LuChip, LuChipRow, LuDelta, LuIconButton } from "@/design-system/components";

// ─── Lecture résolue des jetons ──────────────────────────────────────────────

/** Valeur résolue actuelle d'un jeton `--lu-*` sur <html>, re-lue à chaque
 *  changement de data-theme / data-mode / data-effects. */
function useTokenValue(name: string): string {
  const { themeId, mode, effects } = useTheme();
  const [value, setValue] = useState("");
  useEffect(() => {
    const root = document.documentElement;
    const read = () =>
      setValue(getComputedStyle(root).getPropertyValue(`--lu-${name}`).trim());
    read();
    const observer = new MutationObserver(read);
    observer.observe(root, {
      attributes: true,
      attributeFilter: ["data-theme", "data-mode", "data-effects"],
    });
    return () => observer.disconnect();
    // themeId/mode/effects forcent aussi la relecture (double sécurité).
  }, [name, themeId, mode, effects]);
  return value;
}

// ─── Sections de jetons ──────────────────────────────────────────────────────

const COLOR_GROUPS: { title: string; tokens: string[] }[] = [
  { title: "Fonds & surfaces", tokens: ["bg", "surface", "surface-2", "surface-inverse", "glass-bg", "scrim"] },
  { title: "Texte", tokens: ["fg", "fg-muted", "fg-subtle", "fg-inverse", "on-accent"] },
  { title: "Accent", tokens: ["accent", "accent-pressed", "accent-soft", "accent-vivid", "focus-ring"] },
  { title: "Sémantique", tokens: ["income", "income-soft", "expense", "expense-soft", "warning", "warning-soft", "info", "info-soft"] },
  { title: "Bordures", tokens: ["border", "border-strong", "glass-border"] },
  { title: "Graphiques", tokens: ["chart-1", "chart-2", "chart-3", "chart-4", "chart-5", "chart-6"] },
  { title: "Hero", tokens: ["hero-bg", "hero-fg"] },
];

const RADIUS_TOKENS = ["radius-xs", "radius-sm", "radius-md", "radius-lg", "radius-xl", "radius-2xl", "radius-pill"];
const SHADOW_TOKENS = ["shadow-sm", "shadow-md", "shadow-lg"];

// ─── Sous-composants de présentation (100 % jetons résolus) ──────────────────

function Swatch({ name }: { name: string }) {
  const value = useTokenValue(name);
  return (
    <figure data-token={`lu-${name}`} className="m-0">
      <div
        className="h-12 w-full rounded-[var(--lu-radius-md)] border"
        style={{ background: value || "transparent", borderColor: "var(--lu-border)" }}
      />
      <figcaption className="mt-1 text-[11px] leading-tight" style={{ color: "var(--lu-fg-muted)" }}>
        <span className="font-mono" style={{ color: "var(--lu-fg)" }}>--lu-{name}</span>
        <br />
        <span className="font-mono">{value || "—"}</span>
      </figcaption>
    </figure>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-[15px] font-bold" style={{ color: "var(--lu-fg)" }}>{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function LabButton({ variant, children }: { variant: "solid" | "outline"; children: React.ReactNode }) {
  return (
    <button
      type="button"
      className="px-5 py-2.5 text-sm font-semibold transition-transform active:scale-95"
      style={
        variant === "solid"
          ? { background: "var(--lu-accent)", color: "var(--lu-on-accent)", borderRadius: "var(--lu-radius-pill)" }
          : {
              background: "transparent",
              color: "var(--lu-accent)",
              border: "1px solid var(--lu-accent)",
              borderRadius: "var(--lu-radius-pill)",
            }
      }
    >
      {children}
    </button>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function DesignLab() {
  const { themeId, mode, effects, setTheme, setMode, setEffects } = useTheme();
  const accentValue = useTokenValue("accent");

  return (
    <IonPage data-screen-state="ready" data-testid="design-lab">
      <IonContent>
        {/* Barre fixe de recette : thème × mode × effets */}
        <div
          className="sticky top-0 z-10 flex flex-wrap items-center gap-3 px-4 py-3"
          style={{ background: "var(--lu-surface)", borderBottom: "1px solid var(--lu-border)" }}
        >
          <h1 className="text-sm font-bold" style={{ color: "var(--lu-fg)" }}>Design Lab</h1>
          <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Thème">
            {LUMINA_THEMES.map((t) => (
              <button
                key={t.id}
                type="button"
                data-testid={`lab-theme-${t.id}`}
                aria-pressed={themeId === t.id}
                onClick={() => setTheme(t.id as ThemeId)}
                className="flex items-center gap-1.5 rounded-[var(--lu-radius-pill)] border px-2.5 py-1 text-xs font-semibold"
                style={
                  themeId === t.id
                    ? { background: "var(--lu-accent)", color: "var(--lu-on-accent)", borderColor: "var(--lu-accent)" }
                    : { background: "transparent", color: "var(--lu-fg-muted)", borderColor: "var(--lu-border)" }
                }
              >
                <span className="inline-block h-3 w-3 rounded-full" style={{ background: t.primary }} />
                {t.name}
              </button>
            ))}
          </div>
          <div className="flex overflow-hidden rounded-[var(--lu-radius-pill)] border" style={{ borderColor: "var(--lu-border)" }}>
            {(["dark", "light"] as const).map((m) => (
              <button
                key={m}
                type="button"
                data-testid={`lab-mode-${m}`}
                onClick={() => setMode(m)}
                className="px-3 py-1 text-xs font-semibold"
                style={
                  mode === m
                    ? { background: "var(--lu-accent)", color: "var(--lu-on-accent)" }
                    : { background: "transparent", color: "var(--lu-fg-muted)" }
                }
              >
                {m === "dark" ? "Sombre" : "Clair"}
              </button>
            ))}
          </div>
          <div className="flex overflow-hidden rounded-[var(--lu-radius-pill)] border" style={{ borderColor: "var(--lu-border)" }}>
            {(["full", "lite"] as const).map((e) => (
              <button
                key={e}
                type="button"
                data-testid={`lab-effects-${e}`}
                onClick={() => setEffects(e)}
                className="px-3 py-1 text-xs font-semibold"
                style={
                  effects === e
                    ? { background: "var(--lu-accent)", color: "var(--lu-on-accent)" }
                    : { background: "transparent", color: "var(--lu-fg-muted)" }
                }
              >
                {e === "full" ? "Effets complets" : "Effets allégés"}
              </button>
            ))}
          </div>
          <code className="ml-auto font-mono text-[11px]" style={{ color: "var(--lu-fg-subtle)" }} data-testid="lab-state">
            {`data-theme=${themeId} · data-mode=${mode} · data-effects=${effects} · --lu-accent=${accentValue || "—"}`}
          </code>
        </div>

        <div className="max-w-3xl mx-auto px-4 pb-16 pt-4">
          <p className="text-xs" style={{ color: "var(--lu-fg-muted)" }}>
            Route de recette hors production. Chaque section reflète les jetons résolus pour la
            combinaison courante. Les composants <code>Lu*</code> (P2/P3) s&apos;afficheront ici
            dans tous leurs états.
          </p>

          {/* Aperçu hero + cartes — maquette des écrans P4 (réfs visuelles) */}
          <Section title="Hero & cartes (aperçu P3/P4)">
            <div
              className="p-5"
              style={{ background: "var(--lu-hero-bg)", color: "var(--lu-hero-fg)", borderRadius: "var(--lu-radius-xl)" }}
            >
              <p className="text-xs font-medium opacity-80">Solde de la caisse</p>
              <p className="mt-1 text-4xl font-bold tracking-tight" style={{ fontFamily: "var(--lu-font-display)" }}>
                142 830 <span className="text-xl font-semibold">XOF</span>
              </p>
              <span
                className="mt-2 inline-block rounded-[var(--lu-radius-pill)] border px-3 py-1 text-xs font-semibold"
                style={{ borderColor: "var(--lu-hero-fg)" }}
              >
                ▲ +12 500 cette semaine
              </span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {["Solde", "Budget du mois"].map((label) => (
                <div
                  key={label}
                  className="p-4"
                  style={{
                    background: "var(--lu-surface)",
                    borderRadius: "var(--lu-radius-lg)",
                    boxShadow: "var(--lu-shadow-md)",
                    border: "1px solid var(--lu-border)",
                  }}
                >
                  <p className="text-xs" style={{ color: "var(--lu-fg-muted)" }}>{label}</p>
                  <p className="mt-1 text-2xl font-bold" style={{ color: "var(--lu-fg)", fontFamily: "var(--lu-font-display)" }}>
                    142,83
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <LabButton variant="solid">Continuer</LabButton>
              <LabButton variant="outline">Ignorer cette étape</LabButton>
            </div>
          </Section>

          {/* Couleurs */}
          {COLOR_GROUPS.map((group) => (
            <Section key={group.title} title={`Couleurs — ${group.title}`}>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {group.tokens.map((name) => (
                  <Swatch key={name} name={name} />
                ))}
              </div>
            </Section>
          ))}

          {/* Rayons */}
          <Section title="Rayons">
            <div className="flex flex-wrap items-end gap-4">
              {RADIUS_TOKENS.map((name) => (
                <RadiusBox key={name} name={name} />
              ))}
            </div>
          </Section>

          {/* Ombres */}
          <Section title="Ombres">
            <div className="flex flex-wrap gap-4">
              {SHADOW_TOKENS.map((name) => (
                <ShadowBox key={name} name={name} />
              ))}
            </div>
          </Section>

          {/* Typographie */}
          <Section title="Typographie">
            <p className="text-3xl font-bold" style={{ fontFamily: "var(--lu-font-display)", color: "var(--lu-fg)" }}>
              Chiffre héros 142 830 XOF
            </p>
            <p className="mt-2 text-sm" style={{ fontFamily: "var(--lu-font-body)", color: "var(--lu-fg-muted)" }}>
              Corps de texte en font-body — Inter conservée (décision P0), la police Manrope reste
              conditionnée au budget (lot 7).
            </p>
          </Section>
        </div>
      </IonContent>
    </IonPage>
  );
}

/** Pastille de rayon : la valeur résolue du jeton est appliquée telle quelle. */
function RadiusBox({ name }: { name: string }) {
  const value = useTokenValue(name);
  return (
    <div className="text-center">
      <div
        className="h-14 w-14 border"
        style={{ borderRadius: value || "0px", background: "var(--lu-surface-2)", borderColor: "var(--lu-border-strong)" }}
      />
      <p className="mt-1 font-mono text-[10px]" style={{ color: "var(--lu-fg-muted)" }}>--lu-{name}</p>
    </div>
  );
}

/** Bloc d'ombre : la valeur résolue du jeton est appliquée telle quelle. */
function ShadowBox({ name }: { name: string }) {
  const value = useTokenValue(name);
  return (
    <div className="text-center">
      <div
        className="h-16 w-24"
        style={{ boxShadow: value || "none", background: "var(--lu-surface)", borderRadius: "var(--lu-radius-lg)" }}
      />
      <p className="mt-1 font-mono text-[10px]" style={{ color: "var(--lu-fg-muted)" }}>--lu-{name}</p>
    </div>
  );
}
