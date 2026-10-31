// @vitest-environment jsdom
/**
 * Phase 13 — verrouillage du tutoriel (`/tutoriel`).
 *
 * Objectif : figer la **structure de contenu** de `SECTIONS` et le
 * **comportement de rendu** de la page, pour que toute régression future
 * (section supprimée, titre vidé, paragraphe retiré, navigation cassée, écran
 * vide) fasse échouer la CI.
 *
 * Deux angles complémentaires :
 *
 *   1. **Statique** — le tableau `SECTIONS` n'est pas exporté par la page ;
 *      on l'extrait depuis la source (`src/pages/Tutorial.tsx`) et on évalue
 *      le littéral. On peut ainsi vérifier **chaque** section (id unique,
 *      titre non vide, ≥ 1 paragraphe non vide, tips/warnings non vides),
 *      même celles jamais affichées par défaut.
 *   2. **Rendu** — on monte `<Tutorial />` sous `MemoryRouter` (composants
 *      Ionic remplacés par le mock HTML partagé, `recharts` neutralisé) et on
 *      vérifie : titre de section active visible, changement de section par
 *      onglet ET par pagination, et **jamais** d'écran vide (≥ 1 `<h1>`).
 *
 * Non-vacuité (preuve documentée) : les seuils ci-dessous sont les valeurs
 * **réellement mesurées** sur `main` au 2026-10-28 (19 sections, 76
 * paragraphes, 69 conseils, 12 précautions). Retirer un seul paragraphe (ou
 * un conseil, ou une section) fait passer le total sous le seuil → le test
 * échoue. Vérifié en retirant temporairement un paragraphe de la section
 * « overview » : `Tutorial.test.tsx` est passé au rouge, puis la source a été
 * restaurée (`git checkout -- src/pages/Tutorial.tsx`).
 */
import { describe, it, expect, vi, beforeAll, afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, cleanup, fireEvent, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { readFileSync } from "fs";
import { resolve } from "path";

// ─── Ionic → HTML (contrat partagé, comme a11y-screens.test.tsx) ──────────────
vi.mock("@ionic/react", async () => {
  const { createIonicMock } = await import("@/test/ionic-mock");
  return createIonicMock();
});

// Sous-composants sans rapport avec le contenu du tutoriel.
vi.mock("@/components/BottomNav", () => ({ default: () => null }));
vi.mock("@/components/TopHeader", () => ({
  default: ({ title }: { title?: string }) => <div>{title}</div>,
}));

// `recharts` tire `ResponsiveContainer` (ResizeObserver absent de jsdom) : on le
// neutralise par des enveloppes inertes. Les graphiques ne portent pas
// d'invariant testé ici (le diagramme SVG, lui, reste réel).
vi.mock("recharts", () => {
  const Stub = ({ children }: { children?: React.ReactNode }) => <div>{children}</div>;
  return {
    PieChart: Stub,
    Pie: Stub,
    Cell: Stub,
    LineChart: Stub,
    Line: Stub,
    AreaChart: Stub,
    Area: Stub,
    BarChart: Stub,
    Bar: Stub,
    XAxis: Stub,
    YAxis: Stub,
    CartesianGrid: Stub,
    Tooltip: Stub,
    ResponsiveContainer: Stub,
  };
});

import { CHART_COLORS } from "@/lib/utils";
import Tutorial from "@/pages/Tutorial";

// ─── Extraction statique du littéral `SECTIONS` ───────────────────────────────
interface ExtractedSection {
  id: string;
  title: string;
  paragraphs: string[];
  tips?: string[];
  warnings?: string[];
  faqs?: { q: string; a: string }[];
  errors?: { title: string; solution: string }[];
}

const START_MARKER = "const SECTIONS: SectionData[] = [";
const END_MARKER = "// ─── SVG Diagrams";

/**
 * `SECTIONS` n'est pas exporté : on lit le littéral du tableau dans la source
 * et on l'évalue. Les valeurs `icon: BookOpen` (identifiants lucide-react) sont
 * remplacées par des chaînes — on ne teste pas les icônes, seulement la
 * structure textuelle. `CHART_COLORS` est injecté tel quel.
 */
function extractSections(): ExtractedSection[] {
  const src = readFileSync(resolve(__dirname, "../Tutorial.tsx"), "utf8");
  const startIdx = src.indexOf(START_MARKER);
  expect(startIdx, "tableau SECTIONS introuvable dans Tutorial.tsx").toBeGreaterThan(-1);
  const endIdx = src.indexOf(END_MARKER, startIdx);
  expect(endIdx, "marqueur de fin « SVG Diagrams » introuvable").toBeGreaterThan(startIdx);

  const openBracket = startIdx + START_MARKER.length - 1; // pointe sur '['
  const closeBracket = src.lastIndexOf("];", endIdx); // pointe sur ']'
  expect(closeBracket).toBeGreaterThan(openBracket);

  const literal = src
    .slice(openBracket, closeBracket + 1)
    .replace(/icon:\s*([A-Za-z_$][\w$]*)\s*,/g, 'icon: "$1",');

  const factory = new Function("CHART_COLORS", `return ${literal};`);
  return factory(CHART_COLORS) as ExtractedSection[];
}

const SECTIONS = extractSections();

// ─── Seuils mesurés — voir en-tête du fichier ────────────────────────────────
// Relevé sur `main` (2026-10-28) : 19 sections, 76 paragraphes, 69 conseils,
// 12 précautions. Relevé à nouveau après l'ajout de la section
// « Signaler un problème » (PR5, 2026-10-31) : 20 / 80 / 72 / 13.
// Relevé après l'ajout de la section « Rappels de rapport » (PR10,
// 2026-10-31) : 21 / 84 / 75 / 14.
const MIN_SECTIONS = 21;
const MIN_PARAGRAPHS = 84;
const MIN_TIPS = 75;
const MIN_WARNINGS = 14;

beforeAll(() => {
  // jsdom n'implémente pas `scrollIntoView` (appelé au changement d'onglet).
  Element.prototype.scrollIntoView = () => undefined;
});

afterEach(() => {
  cleanup();
});

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/tutoriel"]}>
      <Tutorial />
    </MemoryRouter>,
  );
}

describe("Tutorial — structure de SECTIONS (verrouillage statique)", () => {
  it("le seuil de non-vacuité est atteint (sections, paragraphes, tips, warnings)", () => {
    expect(SECTIONS.length).toBeGreaterThanOrEqual(MIN_SECTIONS);
    expect(SECTIONS.reduce((n, s) => n + s.paragraphs.length, 0)).toBeGreaterThanOrEqual(
      MIN_PARAGRAPHS,
    );
    expect(
      SECTIONS.reduce((n, s) => n + (s.tips?.length ?? 0), 0),
    ).toBeGreaterThanOrEqual(MIN_TIPS);
    expect(
      SECTIONS.reduce((n, s) => n + (s.warnings?.length ?? 0), 0),
    ).toBeGreaterThanOrEqual(MIN_WARNINGS);
  });

  it("chaque section a un id unique", () => {
    const ids = SECTIONS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) {
      expect(id.trim().length, `id vide ou espacé : « ${id} »`).toBeGreaterThan(0);
      expect(id).toBe(id.trim());
    }
  });

  it("chaque section a un title non vide", () => {
    for (const s of SECTIONS) {
      expect(s.title.trim().length, `title vide pour la section « ${s.id} »`).toBeGreaterThan(0);
    }
  });

  it("chaque section a au moins un paragraphe non vide", () => {
    for (const s of SECTIONS) {
      expect(
        s.paragraphs.length,
        `section « ${s.id} » : aucun paragraphe`,
      ).toBeGreaterThan(0);
      for (const p of s.paragraphs) {
        expect(p.trim().length, `section « ${s.id} » : paragraphe vide`).toBeGreaterThan(0);
      }
    }
  });

  it("les tips/warnings déclarés ne contiennent aucune entrée vide", () => {
    for (const s of SECTIONS) {
      for (const t of s.tips ?? []) {
        expect(t.trim().length, `section « ${s.id} » : conseil vide`).toBeGreaterThan(0);
      }
      for (const w of s.warnings ?? []) {
        expect(w.trim().length, `section « ${s.id} » : précaution vide`).toBeGreaterThan(0);
      }
    }
  });

  it("les FAQ / erreurs déclarées sont complètes (question + réponse)", () => {
    for (const s of SECTIONS) {
      for (const f of s.faqs ?? []) {
        expect(f.q.trim().length, `section « ${s.id} » : question FAQ vide`).toBeGreaterThan(0);
        expect(f.a.trim().length, `section « ${s.id} » : réponse FAQ vide`).toBeGreaterThan(0);
      }
      for (const e of s.errors ?? []) {
        expect(e.title.trim().length, `section « ${s.id} » : titre d'erreur vide`).toBeGreaterThan(0);
        expect(
          e.solution.trim().length,
          `section « ${s.id} » : solution d'erreur vide`,
        ).toBeGreaterThan(0);
      }
    }
  });
});

describe("Tutorial — rendu et navigation (MemoryRouter)", () => {
  it("affiche un unique <h1> « Tutoriel » et l'état « ready » (jamais d'écran vide)", () => {
    const { container } = renderPage();
    const h1s = Array.from(container.querySelectorAll("h1"));
    expect(h1s).toHaveLength(1);
    expect(h1s[0].textContent?.trim()).toBe("Tutoriel");
    expect(container.querySelector('[data-screen-state="ready"]')).not.toBeNull();
  });

  it("affiche le titre de la section active (par défaut « Vue d'ensemble »)", () => {
    renderPage();
    const panel = screen.getByRole("tabpanel");
    const title = within(panel).getByRole("heading", { level: 2 });
    expect(title.textContent?.trim()).toBe(SECTIONS[0].title);
  });

  it("rend un onglet par section, avec aria-selected correct", () => {
    renderPage();
    const tabs = screen.getAllByRole("tab");
    expect(tabs).toHaveLength(SECTIONS.length);
    expect(tabs[0]).toHaveAttribute("aria-selected", "true");
    // Le libellé de chaque onglet correspond au titre de la section.
    expect(tabs.map((t) => t.textContent?.trim())).toEqual(
      SECTIONS.map((s) => s.title),
    );
  });

  it("change de section via un onglet", () => {
    renderPage();
    const faq = SECTIONS.find((s) => s.id === "faq");
    expect(faq).toBeDefined();

    const tab = screen.getByRole("tab", { name: faq!.title });
    fireEvent.click(tab);

    expect(tab).toHaveAttribute("aria-selected", "true");
    const panel = screen.getByRole("tabpanel");
    expect(within(panel).getByRole("heading", { level: 2 }).textContent?.trim()).toBe(
      faq!.title,
    );
    // Le contenu réel de la FAQ est bien monté (première question).
    expect(within(panel).getByText(faq!.faqs![0].q)).toBeInTheDocument();
  });

  it("change de section via les boutons de pagination (Suivant / Précédent)", () => {
    renderPage();
    const heading = () => within(screen.getByRole("tabpanel")).getByRole("heading", { level: 2 });

    fireEvent.click(screen.getByRole("button", { name: "Section suivante" }));
    expect(heading().textContent?.trim()).toBe(SECTIONS[1].title);

    fireEvent.click(screen.getByRole("button", { name: "Section précédente" }));
    expect(heading().textContent?.trim()).toBe(SECTIONS[0].title);
  });

  it("« Précédent » est désactivé sur la première section", () => {
    renderPage();
    expect(screen.getByRole("button", { name: "Section précédente" })).toBeDisabled();
  });

  it("affiche les paragraphes de la section active (contenu réellement monté)", () => {
    renderPage();
    const panel = screen.getByRole("tabpanel");
    for (const p of SECTIONS[0].paragraphs) {
      expect(within(panel).getByText(p)).toBeInTheDocument();
    }
  });
});
