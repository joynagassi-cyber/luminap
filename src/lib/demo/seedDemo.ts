/**
 * Données de démo (fakerjs) — 100 % DEV, jamais en production.
 *
 * Objectif : prévisualiser l'interface avec un grand livre crédible
 * (Dashboard, Historique, stats) sans backend réel. Le module n'est
 * câblé que depuis le Design Lab (route DEV uniquement) ; en build prod
 * `import.meta.env.DEV` est false et tout le code est éliminé.
 *
 * Aucune logique métier n'est modifiée : on passe par le chemin
 * d'écriture normal `addTransactionPS`.
 */
import { fakerFR as faker } from "@faker-js/faker";
import { addTransactionPS, type PSTransaction } from "@/lib/dataLayer";
import { getOrganizationId } from "@/lib/orgContext";

/** Vrai uniquement en dev (vite DEV) — jamais en build prod. */
export const DEMO_ENABLED: boolean = import.meta.env.DEV;

const CATEGORIES: { label: string; type: "INCOME" | "EXPENSE" }[] = [
  { label: " dîme", type: "INCOME" },
  { label: "Offrande", type: "INCOME" },
  { label: "Don libre", type: "INCOME" },
  { label: "Salaire pasteur", type: "EXPENSE" },
  { label: "Loyer salle", type: "EXPENSE" },
  { label: "Électricité", type: "EXPENSE" },
  { label: "Courses cantine", type: "EXPENSE" },
  { label: "Transport", type: "EXPENSE" },
  { label: "Impression bulletins", type: "EXPENSE" },
  { label: " sonorisation", type: "EXPENSE" },
  { label: "Entretien bâtiment", type: "EXPENSE" },
  { label: "Soutien missionnaire", type: "EXPENSE" },
];

export type DemoTx = Omit<PSTransaction, "id" | "created_at" | "updated_at" | "version">;

/**
 * Construit `count` transactions de démo déterministes (seed fixe) pour
 * `orgId`, réparties sur les 6 derniers mois. Pur : testable sans DB.
 */
export function buildDemoTransactions(count: number, orgId: string, seed = 42): DemoTx[] {
  faker.seed(seed);
  const now = new Date();
  const out: DemoTx[] = [];
  for (let i = 0; i < count; i += 1) {
    const cat = CATEGORIES[faker.number.int({ min: 0, max: CATEGORIES.length - 1 })];
    const monthsAgo = faker.number.int({ min: 0, max: 5 });
    const day = faker.number.int({ min: 1, max: 27 });
    const date = new Date(now.getFullYear(), now.getMonth() - monthsAgo, day)
      .toISOString()
      .slice(0, 10);
    const amount = faker.number.int({ min: 500, max: 250000 }); // centimes
    const pending = faker.number.int({ min: 1, max: 10 }) === 1;
    out.push({
      org_id: orgId,
      type: cat.type,
      amount,
      description: `${cat.label.trim()} — ${faker.person.lastName()}`,
      date,
      status: pending ? "PENDING" : "APPROVED",
      category_id: null,
      org_unit_id: null,
      compensates_for: null,
      comment: null,
      created_by_id: null,
      approved_by_id: pending ? null : "demo",
      approved_at: pending ? null : date,
      event_id: null,
      source: "MANUAL",
      person_name: faker.person.fullName(),
      source_caisse_id: null,
      versement_id: null,
      reversal_of_id: null,
      cotisation_id: null,
    });
  }
  return out.sort((a, b) => b.date.localeCompare(a.date));
}

/**
 * Insère les transactions de démo dans la base locale via le chemin normal.
 * Ne fait RIEN hors dev. Retourne le nombre de lignes insérées.
 */
export async function seedDemoData(count = 60): Promise<number> {
  if (!DEMO_ENABLED) return 0;
  const orgId = getOrganizationId();
  const rows = buildDemoTransactions(count, orgId);
  let inserted = 0;
  for (const tx of rows) {
    try {
      await addTransactionPS(tx);
      inserted += 1;
    } catch {
      // une date hors période interdite, etc. : on ignore la ligne
    }
  }
  return inserted;
}
