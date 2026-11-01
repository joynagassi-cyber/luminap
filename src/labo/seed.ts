/**
 * Labo Design — Seed déterministe.
 *
 * Génère des données de démo cohérentes pour le développement et les tests.
 *
 * Règles métier appliquées (Faker ne sert QUE pour les noms et libellés) :
 *  - Un solde de caisse = somme des transactions APPROVED qui y sont liées.
 *  - Une cotisation : montantPaye <= montantObligatoire.
 *  - Un événement : budget >= somme des lignes budgétaires.
 *  - Toutes les dates sont cohérentes (pas de transaction dans le futur par
 *    rapport à la date figée du Labo).
 *
 * Faker est configuré avec la locale `fr` et une graine fixe : même graine,
 * mêmes captures (tutoriel PDF, tests Playwright).
 */

import { fr } from "@faker-js/faker";
import type {
  Caisse,
  Transaction,
  Member,
  Event,
  Category,
  Cotisation,
  Group,
  Account,
  Organisation,
} from "@/types";

// ─────────────────────────────────────────────────────────────────────────────
// Configuration du générateur
// ─────────────────────────────────────────────────────────────────────────────

const SEED = 20261101; // graine fixe — reproducible

// faker est instancié avec la locale fr pour des noms/libellés réalistes en français.
const faker = fr;

// Utilitaires internes (non exportés : Faker ne sort pas de ce module)
function rand<T>(arr: T[]): T {
  return arr[faker.number.int({ min: 0, max: arr.length - 1 })];
}

function cents(amount: number): number {
  // Montants en centimes, arrondis à l'entier.
  return Math.round(amount * 100);
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function randomPastDate(maxDaysAgo = 180): string {
  const d = new Date();
  d.setDate(d.getDate() - faker.number.int({ min: 0, max: maxDaysAgo }));
  return isoDate(d);
}

// ─────────────────────────────────────────────────────────────────────────────
// Scénarios métier
// ─────────────────────────────────────────────────────────────────────────────

export type LaboScenario =
  | "org-neuve"
  | "org-normale"
  | "5000-transactions"
  | "noms-longs"
  | "montant-geant";

export interface LaboSeedData {
  org: Organisation;
  categories: Category[];
  caisses: Caisse[];
  accounts: Account[];
  groups: Group[];
  members: Member[];
  transactions: Transaction[];
  events: Event[];
  cotisations: Cotisation[];
  // Solde calculé par caisse (somme des APPROVED) — invariant métier.
  caisseSoldes: Record<string, number>;
}

/**
 * Génère un jeu de données pour un scénario donné. Déterministe : même
 * scenario + même graine => mêmes données.
 */
export function generateLaboSeed(scenario: LaboScenario = "org-normale"): LaboSeedData {
  faker.seed([SEED, scenario]);

  // ── Organisation
  const org: Organisation = {
    id: `labo-org-${scenario}`,
    name:
      scenario === "org-neuve"
        ? "Nouvelle organisation"
        : scenario === "noms-longs"
          ? "Association avec un nom très long pour tester le dépassement de l'interface"
          : "Église MFE-JC Centrale",
    type: "Eglise",
    accentColor: "#FF6B00",
    logoUrl: undefined,
  };

  // ── Catégories (noms en français via Faker)
  const categories: Category[] = [
    { id: "cat-dime", key: "dime", labelFr: "Dîme", type: "INCOME", orgId: org.id },
    { id: "cat-offrande", key: "offrande", labelFr: "Offrande", type: "INCOME", orgId: org.id },
    { id: "cat-mission", key: "mission", labelFr: "Offrande mission", type: "INCOME", orgId: org.id },
    { id: "cat-salaire", key: "salaire", labelFr: "Salaire pasteur", type: "EXPENSE", orgId: org.id },
    { id: "cat-fonctionnement", key: "fonctionnement", labelFr: "Frais de fonctionnement", type: "EXPENSE", orgId: org.id },
    { id: "cat-entretien", key: "entretien", labelFr: "Entretien", type: "EXPENSE", orgId: org.id },
    { id: "cat-aumone", key: "aumone", labelFr: "Aumône", type: "EXPENSE", orgId: org.id },
  ];

  // ── Caisses
  const nbGroupes =
    scenario === "org-neuve" ? 1 : scenario === "5000-transactions" ? 8 : 5;
  const caisses: Caisse[] = [];
  const accounts: Account[] = [];

  // Caisse principale (org)
  caisses.push({
    id: "caisse-principale",
    name: "Caisse principale",
    description: "Fonds généraux de l'organisation",
    type: "MAIN",
    color: "#FF6B00",
    orgId: org.id,
    createdAt: isoDate(new Date(Date.now() - 86_400_000 * 30)),
    updatedAt: isoDate(new Date()),
    archivedAt: null,
    archivedBy: null,
    archiveReason: null,
    status: "ACTIVE",
  });
  accounts.push({
    id: "caisse-principale",
    orgId: org.id,
    ownerType: "ORGANIZATION",
    ownerId: org.id,
    name: "Caisse principale",
    currency: "XOF",
    status: "ACTIVE",
    archivedAt: null,
    archivedBy: null,
    archiveReason: null,
    createdAt: isoDate(new Date(Date.now() - 86_400_000 * 30)),
    updatedAt: isoDate(new Date()),
  });

  // Caisses de groupe
  for (let i = 0; i < nbGroupes; i++) {
    const id = `caisse-groupe-${i}`;
    const name =
      scenario === "noms-longs"
        ? `Groupe des ${faker.lorem.words(6)} — comité d'organisation et de suivi`
        : rand([
            "Diacres",
            "Jeunesse",
            "Dames",
            "Messieurs",
            "Chorale",
            "Intercession",
            "Accueil",
          ]);
    caisses.push({
      id,
      name,
      description: faker.lorem.sentence(),
      type: "GROUP",
      color: faker.color.rgb({ opacity: 0 }) as string, // remplacé par des hex ci-dessous
      orgId: org.id,
      createdAt: isoDate(faker.date.past()),
      updatedAt: isoDate(new Date()),
      archivedAt: null,
      archivedBy: null,
      archiveReason: null,
      status: "ACTIVE",
    });
    accounts.push({
      id,
      orgId: org.id,
      ownerType: "GROUP",
      ownerId: id,
      name,
      currency: "XOF",
      status: "ACTIVE",
      archivedAt: null,
      archivedBy: null,
      archiveReason: null,
      createdAt: isoDate(faker.date.past()),
      updatedAt: isoDate(new Date()),
    });
  }

  // Couleurs fixes pour les caisses (pas de Faker ici, cohérence visuelle)
  const caisseColors = ["#FF6B00", "#7C3AED", "#DC2626", "#2563EB", "#10B981", "#0D9488", "#D97706", "#DB2777"];
  for (let i = 0; i < caisses.length; i++) {
    caisses[i].color = caisseColors[i % caisseColors.length];
  }

  // ── Membres
  const nbMembres =
    scenario === "org-neuve" ? 2 : scenario === "5000-transactions" ? 200 : 25;
  const members: Member[] = [];
  for (let i = 0; i < nbMembres; i++) {
    const firstName =
      scenario === "noms-longs"
        ? faker.person.firstName().repeat(3) // noms très longs
        : faker.person.firstName();
    const lastName =
      scenario === "noms-longs"
        ? faker.person.lastName().repeat(3)
        : faker.person.lastName();
    members.push({
      id: `membre-${i}`,
      orgId: org.id,
      firstName,
      lastName,
      phone: faker.phone.number("+229 6# ## ## ##"),
      email: faker.internet.email(),
      status: rand(["ACTIVE", "ACTIVE", "ACTIVE", "INACTIVE"]),
      joinedAt: isoDate(faker.date.past()),
      archivedAt: null,
      archivedBy: null,
      archiveReason: null,
      totalDons: 0, // calculé après les transactions
      montantEnAvance: 0,
      createdAt: isoDate(faker.date.past()),
      updatedAt: isoDate(new Date()),
    });
  }

  // ── Groupes
  const groups: Group[] = caisses
    .filter((c) => c.type === "GROUP")
    .map((c) => ({
      id: c.id,
      orgId: org.id,
      name: c.name,
      parentGroupId: null,
      responsableMemberId: members[0]?.id ?? null,
      status: "ACTIVE",
      archivedAt: null,
      archivedBy: null,
      archiveReason: null,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }));

  // ── Transactions (l'entité centrale — solde = somme des APPROVED)
  const nbTransactions =
    scenario === "org-neuve"
      ? 0
      : scenario === "5000-transactions"
        ? 5000
        : 60;
  const transactions: Transaction[] = [];
  const caisseSoldes: Record<string, number> = {};
  caisses.forEach((c) => (caisseSoldes[c.id] = 0));

  const types: ("INCOME" | "EXPENSE")[] = ["INCOME", "EXPENSE", "EXPENSE", "EXPENSE", "INCOME"];
  const statuses: ("DRAFT" | "PENDING" | "APPROVED" | "REJECTED")[] = [
    "APPROVED",
    "APPROVED",
    "APPROVED",
    "PENDING",
    "DRAFT",
    "REJECTED",
  ];

  for (let i = 0; i < nbTransactions; i++) {
    const caisse = caisses[i % caisses.length];
    const type = rand(types);
    const baseAmount =
      scenario === "montant-geant"
        ? faker.number.int({ min: 1_000_000, max: 50_000_000 }) // montant géant
        : faker.number.int({ min: 1_000, max: 500_000 });
    const amount = cents(baseAmount);
    const status = rand(statuses);
    const date = randomPastDate(90);

    transactions.push({
      id: `tx-${i}`,
      orgId: org.id,
      type,
      amount,
      description:
        scenario === "noms-longs"
          ? faker.lorem.words(12).join(" ")
          : type === "INCOME"
            ? rand(["Dîme du dimanche", "Offrande", "Don de mission", "Cotisation membre"])
            : rand([
                "Salaire pasteur",
                "Électricité",
                "Entretien local",
                "Aumône",
                "Fournitures bureau",
              ]),
      date,
      status,
      categoryId: rand(categories).id,
      orgUnitId: caisse.type === "GROUP" ? caisse.id : null,
      eventId: null,
      source: rand(["CAISSE", "COTISATION", "PERSONNE"]),
      personName: members[i % members.length]?.firstName ?? null,
      compensatesFor: null,
      comment: null,
      version: 1,
      createdById: members[0]?.id ?? "labo-seed-user",
      approvedById: status === "APPROVED" ? members[0]?.id ?? null : null,
      approvedAt: status === "APPROVED" ? isoDate(new Date()) : null,
      createdAt: isoDate(faker.date.recent()),
      updatedAt: isoDate(faker.date.recent()),
      sourceCaisseId: caisse.id,
      versementId: null,
      reversalOfId: null,
    });

    // Invariant métier : seul APPROVED alimente le solde de la caisse.
    if (status === "APPROVED") {
      caisseSoldes[caisse.id] += type === "INCOME" ? amount : -amount;
    }
  }

  // ── Événements
  const nbEvents =
    scenario === "org-neuve" ? 0 : scenario === "5000-transactions" ? 20 : 8;
  const events: Event[] = [];
  for (let i = 0; i < nbEvents; i++) {
    const start = faker.date.soon({ days: 60 });
    const end = new Date(start.getTime() + 86_400_000 * faker.number.int({ min: 0, max: 2 }));
    const budget = cents(faker.number.int({ min: 100_000, max: 2_000_000 }));
    events.push({
      id: `event-${i}`,
      orgId: org.id,
      name:
        scenario === "noms-longs"
          ? `Culte de ${faker.lorem.words(8)} — édition spéciale et prolongée`
          : rand([
              "Culte dominical",
              "Réunion de prière",
              "Concert de louange",
              "Séminaire de formation",
              "Mariage",
              "Baptême",
            ]),
      description: faker.lorem.sentence(),
      startDate: isoDate(start),
      endDate: isoDate(end),
      status: rand(["PLANIFIED", "ONGOING", "COMPLETED"]),
      type: "CULTE",
      budget,
      budgetItems: [],
      shoppingItems: [],
      createdAt: isoDate(faker.date.past()),
      updatedAt: isoDate(new Date()),
    });
  }

  // ── Cotisations (montantPaye <= montantObligatoire)
  const nbCotisations =
    scenario === "org-neuve" ? 0 : scenario === "5000-transactions" ? 300 : 30;
  const cotisations: Cotisation[] = [];
  for (let i = 0; i < nbCotisations; i++) {
    const obligatoire = cents(faker.number.int({ min: 2_000, max: 10_000 }));
    const statut = rand(["NON_PAYE", "PAYE", "ABSENT", "EN_AVANCE"]);
    const paye =
      statut === "PAYE"
        ? obligatoire
        : statut === "EN_AVANCE"
          ? obligatoire + cents(faker.number.int({ min: 1_000, max: 5_000 }))
          : statut === "ABSENT"
            ? 0
            : 0;
    cotisations.push({
      id: `cotisation-${i}`,
      culteId: events[0]?.id ?? `event-0`,
      membreId: members[i % members.length]?.id ?? `membre-0`,
      statut,
      montantObligatoire: obligatoire,
      montantPaye: paye,
      datePaiement: statut === "PAYE" || statut === "EN_AVANCE" ? randomPastDate(30) : null,
      notes: null,
      createdAt: isoDate(faker.date.past()),
      updatedAt: isoDate(new Date()),
    });
  }

  // totalDons des membres (somme des cotisations payées)
  for (const m of members) {
    m.totalDons = cotisations
      .filter((c) => c.membreId === m.id && c.statut === "PAYE")
      .reduce((s, c) => s + c.montantPaye, 0);
    m.montantEnAvance = cotisations
      .filter((c) => c.membreId === m.id && c.statut === "EN_AVANCE")
      .reduce((s, c) => s + c.montantPaye, 0);
  }

  return {
    org,
    categories,
    caisses,
    accounts,
    groups,
    members,
    transactions,
    events,
    cotisations,
    caisseSoldes,
  };
}

export type { LaboScenario };
