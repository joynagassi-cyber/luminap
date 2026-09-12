import type { Cotisation, Event, Member } from "@/types";

export type CotisationStatut = "NON_PAYE" | "PAYE" | "ABSENT" | "EN_AVANCE";

export const COTISATION_STATUT_LABELS: Record<CotisationStatut, string> = {
  NON_PAYE: "Non payé",
  PAYE: "Payé",
  ABSENT: "Absent",
  EN_AVANCE: "En avance",
};

export const COTISATION_STATUT_COLORS: Record<CotisationStatut, string> = {
  NON_PAYE: "#EF4444",
  PAYE: "#10B981",
  ABSENT: "#808080",
  EN_AVANCE: "#3B82F6",
};

/**
 * Règle critique: Verrouillage après 30 jours
 */
export const JOURS_VERROUILLAGE_CULTE = 30;

/**
 * Vérifie si un culte est verrouillé (plus de 30 jours)
 */
export function isCulteVerrouille(dateCulte: string): boolean {
  const now = new Date();
  const culteDay = new Date(dateCulte);
  const nowDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const daysDiff = Math.floor(
    (nowDay.getTime() - culteDay.getTime()) / (1000 * 60 * 60 * 24),
  );
  return daysDiff > JOURS_VERROUILLAGE_CULTE;
}

/**
 * Vérifie si un paiement est verrouillé
 * (culte verrouillé ET cotisation déjà payée)
 */
export function isPaiementVerrouille(params: {
  dateCulte: string;
  cotisationEstPaye: boolean;
}): boolean {
  return isCulteVerrouille(params.dateCulte) && params.cotisationEstPaye;
}

/**
 * Calcule le nombre de cultes en retard pour un membre.
 * Ignore les cultes antérieurs à la date d'adhésion.
 */
export function calculerNombreRetards(params: {
  cultes: Event[];
  cotisations: Cotisation[];
  dateAdhesion: string;
}): number {
  const { cultes, cotisations, dateAdhesion } = params;
  const adhesionDate = new Date(dateAdhesion);
  const cotisationsMap = new Map(cotisations.map((c) => [c.culteId, c]));
  let retards = 0;

  for (const culte of cultes) {
    if (new Date(culte.startDate) < adhesionDate) continue;
    const cotisation = cotisationsMap.get(culte.id);
    if (cotisation === undefined) {
      retards++;
    } else if (cotisation.statut === "NON_PAYE") {
      retards++;
    }
  }
  return retards;
}

/**
 * Calcule le montant total dû en FCFA à partir du nombre de retards.
 * `montantParCulteCents` DOIT être fourni par l'appelant : aucun montant
 * n'est plus hardcodé — le montant par culte est choisi par l'utilisateur
 * lors de la création du culte.
 */
export function calculerMontantDu(
  nombreRetards: number,
  montantParCulteCents: number,
): number {
  return nombreRetards * montantParCulteCents;
}

/**
 * Détermine si un paiement a été fait avant le culte.
 * Retourne 'EN_AVANCE' si la date de paiement est strictement avant la date du culte.
 */
export function determinerStatutAvance(params: {
  datePaiement: string;
  dateCulte: string;
}): "PAYE" | "EN_AVANCE" {
  const paiementDay = new Date(params.datePaiement);
  const culteDay = new Date(params.dateCulte);
  const paiementDate = new Date(
    paiementDay.getFullYear(),
    paiementDay.getMonth(),
    paiementDay.getDate(),
  );
  const culteDate = new Date(
    culteDay.getFullYear(),
    culteDay.getMonth(),
    culteDay.getDate(),
  );
  return paiementDate < culteDate ? "EN_AVANCE" : "PAYE";
}

/**
 * Calcule l'excédent (don) d'un paiement.
 * Retourne 0 si le paiement est inférieur au montant obligatoire.
 */
export function calculerDon(
  montantPaye: number,
  montantObligatoire: number,
): number {
  return Math.max(0, montantPaye - montantObligatoire);
}

/**
 * Calcule les statistiques globales d'un culte.
 */
export function calculerStatsCulte(params: {
  cotisations: Cotisation[];
  culteId: string;
}): {
  total: number;
  paye: number;
  absent: number;
  nonPaye: number;
  enAvance: number;
  totalCollecte: number;
} {
  const cots = params.cotisations.filter((c) => c.culteId === params.culteId);
  return {
    total: cots.length,
    paye: cots.filter((c) => c.statut === "PAYE").length,
    absent: cots.filter((c) => c.statut === "ABSENT").length,
    nonPaye: cots.filter((c) => c.statut === "NON_PAYE").length,
    enAvance: cots.filter((c) => c.statut === "EN_AVANCE").length,
    totalCollecte: cots.reduce((s, c) => s + c.montantPaye, 0),
  };
}

/**
 * Vérifie si un membre a suffisamment d'avance pour payer
 */
export function aSuffisantAvance(membre: Member, montant: number): boolean {
  return (membre.montantEnAvance || 0) >= montant;
}
