/**
 * Giving Capability — dons, campagnes, pledges, reçus fiscaux.
 *
 * P0 « grande église » : gestion des donateurs + campagnes (but/fonds/objectif),
 * engagements (pledges) avec échelonnement, et reçus fiscaux annuels par
 * donateur. Lumina garde la TRAÇABILITÉ (rattachement des transactions de
 * dîme/dons à un donateur + campagne) ; le PSP en ligne est hors périmètre.
 *
 * Usage :
 *   import { giving, campaignProgress } from "@/capabilities/giving";
 *   await giving.createCampaign({ name: "Fonds mission 2026", targetAmountCents: 5_000_000 });
 */

import { getPowerSyncDatabase } from "@/lib/powersync";
import {
  addGivingDonorPS,
  addGivingCampaignPS,
  updateGivingCampaignPS,
  addPledgePS,
  addTaxReceiptPS,
  linkTransactionGivingPS,
  deleteTransactionGivingPS,
  type PSGivingDonor,
  type PSGivingCampaign,
  type PSPledge,
  type PSTaxReceipt,
  type PSTransactionGiving,
} from "@/lib/dataLayer";

export interface CreateDonorInput {
  fullName: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  memberId?: string | null;
  taxReceiptEnabled?: boolean;
  notes?: string | null;
}

export interface CreateCampaignInput {
  name: string;
  purpose?: string | null;
  fund?: string | null;
  targetAmountCents?: number;
  startDate?: string | null;
  endDate?: string | null;
  status?: string;
  notes?: string | null;
}

export interface CreatePledgeInput {
  campaignId: string;
  donorId: string;
  pledgedAmountCents: number;
  schedule?: "ONCE" | "MONTHLY" | "QUARTERLY" | "YEARLY";
  amountPerPeriodCents?: number;
  startDate?: string | null;
  endDate?: string | null;
  status?: string;
  notes?: string | null;
}

type TxLike = {
  id: string;
  type: string;
  amount: number;
  date: string;
  status: string;
};

/** Réel collecté pour une campagne (transactions dîme/dons liées, APPROVED). */
export function givenForCampaign(
  links: PSTransactionGiving[],
  transactions: TxLike[],
  campaignId: string,
): number {
  const ids = new Set(
    links
      .filter((l) => l.campaign_id === campaignId)
      .map((l) => l.transaction_id),
  );
  return transactions
    .filter((t) => ids.has(t.id) && t.status === "APPROVED")
    .reduce((s, t) => s + (Number(t.amount) || 0), 0);
}

/** Engagements (pledges actifs) pour une campagne. */
export function pledgedForCampaign(
  pledges: PSPledge[],
  campaignId: string,
): number {
  return pledges
    .filter((p) => p.campaign_id === campaignId && p.status === "ACTIVE")
    .reduce((s, p) => s + (Number(p.pledged_amount_cents) || 0), 0);
}

export interface CampaignProgress {
  target: number;
  given: number;
  pledged: number;
  /** % de l'objectif atteint par le réel collecté (null si objectif = 0). */
  pctOfTarget: number | null;
  remaining: number;
}

/** Progression combinée d'une campagne (réel + engagements vs objectif). */
export function campaignProgress(
  campaign: Pick<PSGivingCampaign, "target_amount_cents" | "id">,
  links: PSTransactionGiving[],
  pledges: PSPledge[],
  transactions: TxLike[],
): CampaignProgress {
  const target = Number(campaign.target_amount_cents) || 0;
  const given = givenForCampaign(links, transactions, campaign.id);
  const pledged = pledgedForCampaign(pledges, campaign.id);
  return {
    target,
    given,
    pledged,
    pctOfTarget: target > 0 ? Math.round((given / target) * 100) : null,
    remaining: Math.max(0, target - given),
  };
}

/** Total annuel d'un donateur (transactions de dîme/dons liées, année donnée). */
export function annualDonorTotal(
  links: PSTransactionGiving[],
  transactions: TxLike[],
  donorId: string,
  year: number,
): number {
  const ids = new Set(
    links
      .filter((l) => l.donor_id === donorId)
      .map((l) => l.transaction_id),
  );
  return transactions
    .filter(
      (t) =>
        ids.has(t.id) &&
        t.type === "INCOME" &&
        String(t.date).slice(0, 4) === String(year),
    )
    .reduce((s, t) => s + (Number(t.amount) || 0), 0);
}

class GivingService {
  // ── Donors ──
  async listDonors(): Promise<PSGivingDonor[]> {
    const db = getPowerSyncDatabase();
    const res = await db.execute("SELECT * FROM giving_donors ORDER BY full_name");
    return (res?.array ?? []) as unknown as PSGivingDonor[];
  }

  async createDonor(input: CreateDonorInput): Promise<string> {
    return addGivingDonorPS({
      full_name: input.fullName,
      email: input.email ?? null,
      phone: input.phone ?? null,
      address: input.address ?? null,
      member_id: input.memberId ?? null,
      tax_receipt_enabled: input.taxReceiptEnabled ? 1 : 0,
      notes: input.notes ?? null,
    });
  }

  // ── Campaigns ──
  async listCampaigns(): Promise<PSGivingCampaign[]> {
    const db = getPowerSyncDatabase();
    const res = await db.execute("SELECT * FROM giving_campaigns ORDER BY start_date DESC");
    return (res?.array ?? []) as unknown as PSGivingCampaign[];
  }

  async createCampaign(input: CreateCampaignInput): Promise<string> {
    return addGivingCampaignPS({
      name: input.name,
      purpose: input.purpose ?? null,
      fund: input.fund ?? null,
      target_amount_cents: input.targetAmountCents ?? 0,
      start_date: input.startDate ?? null,
      end_date: input.endDate ?? null,
      status: input.status ?? "ACTIVE",
      notes: input.notes ?? null,
    });
  }

  async updateCampaign(
    id: string,
    patch: Partial<CreateCampaignInput>,
  ): Promise<void> {
    const updates: Record<string, unknown> = {};
    if (patch.name !== undefined) updates.name = patch.name;
    if (patch.purpose !== undefined) updates.purpose = patch.purpose;
    if (patch.fund !== undefined) updates.fund = patch.fund;
    if (patch.targetAmountCents !== undefined)
      updates.target_amount_cents = patch.targetAmountCents;
    if (patch.startDate !== undefined) updates.start_date = patch.startDate;
    if (patch.endDate !== undefined) updates.end_date = patch.endDate;
    if (patch.status !== undefined) updates.status = patch.status;
    if (patch.notes !== undefined) updates.notes = patch.notes;
    if (Object.keys(updates).length > 0)
      await updateGivingCampaignPS(id, updates);
  }

  // ── Pledges ──
  async listPledges(): Promise<PSPledge[]> {
    const db = getPowerSyncDatabase();
    const res = await db.execute("SELECT * FROM pledges ORDER BY created_at DESC");
    return (res?.array ?? []) as unknown as PSPledge[];
  }

  async recordPledge(input: CreatePledgeInput): Promise<string> {
    return addPledgePS({
      campaign_id: input.campaignId,
      donor_id: input.donorId,
      pledged_amount_cents: input.pledgedAmountCents,
      schedule: input.schedule ?? "ONCE",
      amount_per_period_cents: input.amountPerPeriodCents ?? 0,
      start_date: input.startDate ?? null,
      end_date: input.endDate ?? null,
      status: input.status ?? "ACTIVE",
      notes: input.notes ?? null,
    });
  }

  // ── Reçus fiscaux ──
  async listTaxReceipts(): Promise<PSTaxReceipt[]> {
    const db = getPowerSyncDatabase();
    const res = await db.execute("SELECT * FROM tax_receipts ORDER BY year DESC");
    return (res?.array ?? []) as unknown as PSTaxReceipt[];
  }

  /**
   * Génère / met à jour le reçu fiscal annuel d'un donateur. Idempotent :
   * un seul reçu par (org, donateur, année). Le total est recomputé depuis
   * les transactions de dîme/dons liées au donateur pour l'année.
   */
  async generateTaxReceipt(donorId: string, year: number): Promise<string> {
    const db = getPowerSyncDatabase();
    const linksRes = await db.execute(
      "SELECT transaction_id FROM transaction_giving WHERE donor_id = ?",
      [donorId],
    );
    const linkIds = ((linksRes?.array ?? []) as unknown as Array<{ transaction_id: string }>).map(
      (l) => l.transaction_id,
    );
    let total = 0;
    if (linkIds.length > 0) {
      const ph = linkIds.map(() => "?").join(", ");
      const txRes = await db.execute(
        `SELECT id, type, amount, date FROM transactions WHERE id IN (${ph})`,
        linkIds,
      );
      total = ((txRes?.array ?? []) as unknown as TxLike[])
        .filter((t) => t.type === "INCOME" && String(t.date).slice(0, 4) === String(year))
        .reduce((s, t) => s + (Number(t.amount) || 0), 0);
    }

    const receiptNo = `TR-${year}-${donorId.slice(0, 8)}`;
    const now = new Date().toISOString();

    const existing = await db.getOptional<{ id: string; total_amount_cents: number }>(
      "SELECT id, total_amount_cents FROM tax_receipts WHERE donor_id = ? AND year = ?",
      [donorId, year],
    );
    if (existing) {
      await db.execute(
        "UPDATE tax_receipts SET total_amount_cents = ?, issued_at = ?, updated_at = ? WHERE id = ?",
        [total, now, now, existing.id],
      );
      return String(existing.id);
    }

    return addTaxReceiptPS({
      donor_id: donorId,
      year,
      receipt_no: receiptNo,
      total_amount_cents: total,
      issued_at: now,
    });
  }

  // ── Rattachement (traçabilité) ──
  async listLinks(): Promise<PSTransactionGiving[]> {
    const db = getPowerSyncDatabase();
    const res = await db.execute(
      "SELECT * FROM transaction_giving ORDER BY recorded_at DESC",
    );
    return (res?.array ?? []) as unknown as PSTransactionGiving[];
  }

  async linkGive(transactionId: string, donorId: string, campaignId?: string | null): Promise<string> {
    return linkTransactionGivingPS({
      transaction_id: transactionId,
      donor_id: donorId,
      campaign_id: campaignId ?? null,
    });
  }

  async unlinkGive(linkId: string): Promise<void> {
    await deleteTransactionGivingPS(linkId);
  }
}

export const giving = new GivingService();
