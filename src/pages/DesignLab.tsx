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
import { Bell, CalendarDays, Flame, Home, List, PieChart, Plus, Settings, ShoppingCart, X } from "lucide-react";
import { LUMINA_THEMES, type ThemeId } from "@/ionic/themes";
import { useTheme } from "@/design-system/theme/theme-context";
import {
  LuAmount,
  LuBadge,
  LuButton,
  LuCard,
  LuChip,
  LuChipRow,
  LuDelta,
  LuEmptyState,
  LuField,
  LuIconButton,
  LuAppBar,
  LuHero,
  LuSectionHeader,
  LuSelect,
  LuSegmented,
  LuTabBar,
  LuBanner,
  LuFab,
  LuProgress,
  LuSwipeToConfirm,
  LuAmountInput,
  LuChart,
  LuSheet,
  LuTimeline,
  LuTransactionRow,
} from "@/design-system/components";

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
  const [sheetOpen, setSheetOpen] = useState(false);
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

          {/* Composants Lu* — P2 lot 2 : cartes, montant, champ, segmented */}
          <Section title="LuCard / LuAmount (P2)">
            <div className="grid grid-cols-2 gap-3">
              <LuCard variant="stat" title="Solde" legend="Depuis le début" icon={<Flame size={18} />} value={<LuAmount amount={142830} size="amount-lg" />} />
              <LuCard variant="stat" title="Dépenses" legend="Ce mois" icon={<ShoppingCart size={18} />} value={<LuAmount amount={-89931} size="amount-lg" />} />
              <LuCard variant="inverse" title="Carte inversée">Point focal unique par écran</LuCard>
              <LuCard variant="accent">Carte accent (aplat)</LuCard>
              <LuCard variant="glass">Carte verre (effects=full)</LuCard>
              <LuCard variant="surface">Surface standard</LuCard>
            </div>
            <div className="mt-3 flex flex-wrap items-end gap-4">
              <LuAmount amount={142830} size="display" />
              <LuAmount amount={-19.1} size="amount-lg" currency="EUR" />
              <LuAmount amount={-3200} signed />
            </div>
            <div className="mt-4 grid grid-cols-4 gap-3">
              <LuCard variant="tile" icon={<Plus size={20} />} label="Ajouter" />
              <LuCard variant="tile" icon={<Home size={20} />} label="Caisse" />
            </div>
          </Section>

          <Section title="LuField / LuSegmented (P2)">
            <div className="max-w-sm">
              <LuField label="Titre" value="Achat fournitures" onChange={() => {}} helper="Visible dans l'historique" />
              <div className="mt-3">
                <LuField label="Montant" value="" onChange={() => {}} error="Montant requis" inputMode="decimal" trailing={<span className="text-xs font-semibold">XOF</span>} />
              </div>
              <div className="mt-3">
                <LuField label="Compte" value="Caisse principale" onChange={() => {}} readOnly trailing={<CalendarDays size={18} />} />
              </div>
            </div>
            <div className="mt-4 max-w-sm">
              <LuSegmented
                value="all"
                onChange={() => {}}
                options={[
                  { value: "out", label: "Sortie" },
                  { value: "in", label: "Entrée" },
                  { value: "all", label: "Toutes" },
                ]}
              />
            </div>
          </Section>

          {/* Composants Lu* — P2 lot 3 : select, section header, empty state */}
          <Section title="LuSelect / LuSectionHeader / LuEmptyState (P2)">
            <div className="grid gap-4 sm:grid-cols-2">
              <LuSelect
                label="Intervalle"
                value="monthly"
                onChange={() => {}}
                options={[
                  { value: "daily", label: "Daily" },
                  { value: "weekly", label: "Weekly" },
                  { value: "monthly", label: "Monthly" },
                ]}
              />
              <LuSelect
                label="Catégorie"
                value="groceries"
                onChange={() => {}}
                options={Array.from({ length: 8 }, (_, i) => ({ value: `c${i}`, label: `Catégorie ${i + 1}` })).map((o, i) => (i === 0 ? { ...o, value: "groceries", label: "Groceries" } : o))}
              />
            </div>
            <div className="mt-4">
              <LuSectionHeader title="Derniers mouvements" meta="3 Total" actionLabel="Voir tout" onAction={() => {}} />
            </div>
            <div className="mt-4 rounded-[var(--lu-radius-xl)] border" style={{ borderColor: "var(--lu-border)" }}>
              <LuEmptyState title="You have nothing to do now." text="You have nothing to do in a while." ctaLabel="Add New" onCta={() => {}} />
            </div>
          </Section>

          {/* Composites Lu* — P3 : hero (3 variantes), app bar, lignes, tab bar */}
          <Section title="LuHero (P3) — 3 variantes">
            <div className="grid gap-4">
              <LuHero variant="solid" greeting="Bonjour, Aïcha" label="Solde total" amount={142830} delta={{ positive: true, children: "+12 %" }} onBell={() => {}}>
                <p className="text-sm font-semibold" style={{ color: "var(--lu-hero-fg)" }}>Prochaine échéance : 15 novembre</p>
              </LuHero>
              <LuHero variant="tinted" greeting="Bonjour, Aïcha" label="Solde total" amount={142830} delta={{ positive: false, children: "−3 %" }} />
              <LuHero variant="dark-orb" label="Vous avez dépensé" amount={48500} onAction={() => {}} />
            </div>
          </Section>
          <Section title="LuAppBar / LuTransactionRow / LuTabBar (P3)">
            <LuAppBar title="Lumina" large meta="3 Total" onBack={() => {}} actions={<Bell size={20} />} />
            <div className="mt-3 rounded-[var(--lu-radius-md)]" style={{ background: "var(--lu-surface)" }}>
              <LuTransactionRow grouped title="Super U" subtitle="Aujourd'hui · 14:32" icon={<ShoppingCart size={20} />} amount={-12500} />
              <LuTransactionRow grouped title="Salaire octobre" icon={<Plus size={20} />} amount={250000} chevron onClick={() => {}} />
              <LuTransactionRow grouped title="Courses" icon={<ShoppingCart size={20} />} count={9} iconTone="accent" />
            </div>
            <div className="relative mt-6 h-24">
              <LuTabBar
                tabs={[
                  { id: "home", label: "Accueil", icon: <Home size={22} /> },
                  { id: "history", label: "Historique", icon: <List size={22} /> },
                  { id: "stats", label: "Stats", icon: <PieChart size={22} /> },
                  { id: "settings", label: "Réglages", icon: <Settings size={22} /> },
                ]}
                active="home"
                onSelect={() => {}}
                activeStyle="pill-active"
              />
            </div>
          </Section>

          {/* Composites Lu* — P3 lot 2 : banner, progress, fab, swipe */}
          <Section title="LuBanner / LuProgress / LuFab / LuSwipeToConfirm (P3)">
            <div className="grid gap-3">
              <LuBanner title="Complétez votre profil pour débloquer les rapports" dismissible onDismiss={() => {}} />
              <LuBanner action title="Voir le rapport mensuel" subtitle="Octobre 2026" icon={<Flame size={20} />} onClick={() => {}} />
              <div className="rounded-[var(--lu-radius-md)] p-4" style={{ background: "var(--lu-surface)" }}>
                <LuProgress value={33} startLabel="1 nov" endLabel="30 nov" legend="10 / 30 jours" />
                <div className="mt-4">
                  <LuProgress value={67} title="Budget courses" amount={80000} />
                </div>
              </div>
              <div className="max-w-sm">
                <LuSwipeToConfirm label="Glisser pour clôturer la période" onConfirm={() => {}} />
              </div>
            </div>
            <LuFab onClick={() => {}} />
          </Section>

          {/* Composites Lu* — P3 lot 3 : sheet, amount input, timeline, chart */}
          <Section title="LuSheet / LuAmountInput / LuTimeline / LuChart (P3)">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-[var(--lu-radius-md)] p-4" style={{ background: "var(--lu-surface)" }}>
                <LuAmountInput value={12500} onAmountChange={() => {}} />
              </div>
              <div className="rounded-[var(--lu-radius-md)] p-4" style={{ background: "var(--lu-surface)" }}>
                <LuChart
                  data={[
                    { label: "Lun", value: 40, amount: 40000 },
                    { label: "Mar", value: 65 },
                    { label: "Mer", value: 100, amount: 100000 },
                    { label: "Jeu", value: 55 },
                    { label: "Ven", value: 80, amount: 80000 },
                  ]}
                />
              </div>
            </div>
            <div className="mt-4 rounded-[var(--lu-radius-md)] p-4" style={{ background: "var(--lu-surface)" }}>
              <LuTimeline
                items={[
                  { id: "1", title: "Vente du matin", subtitle: "Caisse principale · 9 transactions", amount: 45000 },
                  { id: "2", title: "Achat fournitures", subtitle: "Aujourd'hui · 14:32", amount: -12000 },
                  { id: "3", title: "Clôture période", subtitle: "Septembre 2026", amount: 0 },
                ]}
              />
            </div>
            <div className="mt-4 max-w-sm">
              <LuButton onClick={() => setSheetOpen(true)}>Ouvrir LuSheet</LuButton>
            </div>
            <LuSheet open={sheetOpen} onClose={() => setSheetOpen(false)} title="Nouvelle transaction">
              <LuSegmented
                value="out"
                onChange={() => {}}
                options={[
                  { value: "out", label: "Sortie" },
                  { value: "in", label: "Entrée" },
                  { value: "transfer", label: "Transfert" },
                ]}
              />
              <div className="mt-4">
                <LuAmountInput value={0} onAmountChange={() => {}} />
              </div>
            </LuSheet>
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
