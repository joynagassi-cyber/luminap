import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  policy,
  cotisationCanModify,
  cotisationValidateAmount,
  transactionValidateAmount,
  transactionCanEdit,
  versementCheckBalance,
  versementValidateAtomic,
  type PolicyResult,
} from "../policy";

describe("policy capability", () => {
  // ─── Cotisation Policy ────────────────────────────────────────────────────

  describe("cotisationCanModify", () => {
    it("allows modification of NON_PAYE cotisation within 30 days", () => {
      const result = cotisationCanModify({
        culteDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0],
        statut: "NON_PAYE",
        montantPaye: 0,
        montantObligatoire: 5000,
      });
      expect(result.ok).toBe(true);
    });

    it("blocks modification of NON_PAYE cotisation after 30-day lock", () => {
      const result = cotisationCanModify({
        culteDate: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0],
        statut: "NON_PAYE",
        montantPaye: 0,
        montantObligatoire: 5000,
      });
      expect(result.ok).toBe(false);
      expect(result.rule).toBe("COTISATION_CULTE_LOCKED");
    });

    it("allows modification of PAYE cotisation within 30 days", () => {
      const result = cotisationCanModify({
        culteDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0],
        statut: "PAYE",
        montantPaye: 5000,
        montantObligatoire: 5000,
      });
      expect(result.ok).toBe(true);
    });

    it("blocks modification of PAYE cotisation after 30-day lock", () => {
      const result = cotisationCanModify({
        culteDate: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0],
        statut: "PAYE",
        montantPaye: 5000,
        montantObligatoire: 5000,
      });
      expect(result.ok).toBe(false);
      expect(result.rule).toBe("COTISATION_LOCKED");
    });

    it("allows ABSENT cotisation within 30 days (not locked by payment)", () => {
      const result = cotisationCanModify({
        culteDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0],
        statut: "ABSENT",
        montantPaye: 0,
        montantObligatoire: 5000,
      });
      expect(result.ok).toBe(true);
    });

    it("allows EN_AVANCE cotisation within 30 days", () => {
      const result = cotisationCanModify({
        culteDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0],
        statut: "EN_AVANCE",
        montantPaye: 3000,
        montantObligatoire: 5000,
      });
      expect(result.ok).toBe(true);
    });
  });

  describe("cotisationValidateAmount", () => {
    it("allows amount of exactly 1 FCFA (100 cents)", () => {
      const result = cotisationValidateAmount(100);
      expect(result.ok).toBe(true);
    });

    it("rejects zero amount", () => {
      const result = cotisationValidateAmount(0);
      expect(result.ok).toBe(false);
      expect(result.rule).toBe("COTISATION_MIN_AMOUNT");
    });

    it("rejects negative amount", () => {
      const result = cotisationValidateAmount(-500);
      expect(result.ok).toBe(false);
      expect(result.rule).toBe("COTISATION_MIN_AMOUNT");
    });

    it("rejects amount below 1 FCFA", () => {
      const result = cotisationValidateAmount(50);
      expect(result.ok).toBe(false);
      expect(result.rule).toBe("COTISATION_MIN_AMOUNT");
    });

    it("allows normal amount (5000 FCFA)", () => {
      const result = cotisationValidateAmount(500000);
      expect(result.ok).toBe(true);
    });

    it("rejects amount above maximum", () => {
      const result = cotisationValidateAmount(100000000000);
      expect(result.ok).toBe(false);
      expect(result.rule).toBe("COTISATION_MAX_AMOUNT");
    });
  });

  // ─── Transaction Policy ──────────────────────────────────────────────────

  describe("transactionValidateAmount", () => {
    it("allows positive amount in cents", () => {
      const result = transactionValidateAmount(500000);
      expect(result.ok).toBe(true);
    });

    it("rejects zero amount", () => {
      const result = transactionValidateAmount(0);
      expect(result.ok).toBe(false);
      expect(result.rule).toBe("TRANSACTION_POSITIVE_AMOUNT");
    });

    it("rejects negative amount", () => {
      const result = transactionValidateAmount(-100);
      expect(result.ok).toBe(false);
      expect(result.rule).toBe("TRANSACTION_POSITIVE_AMOUNT");
    });

    it("rejects amount above maximum", () => {
      const result = transactionValidateAmount(100000000000);
      expect(result.ok).toBe(false);
      expect(result.rule).toBe("TRANSACTION_MAX_AMOUNT");
    });

    it("allows minimum positive amount (1 cent)", () => {
      const result = transactionValidateAmount(1);
      expect(result.ok).toBe(true);
    });
  });

  describe("transactionCanEdit", () => {
    it("allows editing DRAFT transaction", () => {
      const result = transactionCanEdit("DRAFT");
      expect(result.ok).toBe(true);
    });

    it("allows editing PENDING transaction", () => {
      const result = transactionCanEdit("PENDING");
      expect(result.ok).toBe(true);
    });

    it("blocks editing APPROVED transaction", () => {
      const result = transactionCanEdit("APPROVED");
      expect(result.ok).toBe(false);
      expect(result.rule).toBe("TRANSACTION_APPROVED_IMMUTABLE");
    });

    it("allows editing REJECTED transaction", () => {
      const result = transactionCanEdit("REJECTED");
      expect(result.ok).toBe(true);
    });
  });

  // ─── Versement Policy ────────────────────────────────────────────────────

  describe("versementCheckBalance", () => {
    it("allows versement when amount equals balance", () => {
      const result = versementCheckBalance({
        balanceCents: 500000,
        amountCents: 500000,
      });
      expect(result.ok).toBe(true);
    });

    it("allows versement when amount is below balance", () => {
      const result = versementCheckBalance({
        balanceCents: 500000,
        amountCents: 300000,
      });
      expect(result.ok).toBe(true);
    });

    it("blocks versement when amount exceeds balance", () => {
      const result = versementCheckBalance({
        balanceCents: 500000,
        amountCents: 600000,
      });
      expect(result.ok).toBe(false);
      expect(result.rule).toBe("VERSEMENT_INSUFFICIENT_BALANCE");
    });

    it("blocks versement with zero amount", () => {
      const result = versementCheckBalance({
        balanceCents: 500000,
        amountCents: 0,
      });
      expect(result.ok).toBe(false);
      expect(result.rule).toBe("VERSEMENT_POSITIVE_AMOUNT");
    });

    it("blocks versement with negative amount", () => {
      const result = versementCheckBalance({
        balanceCents: 500000,
        amountCents: -100,
      });
      expect(result.ok).toBe(false);
      expect(result.rule).toBe("VERSEMENT_POSITIVE_AMOUNT");
    });

    it("allows versement when balance is zero and amount is zero — no, amount must be positive", () => {
      const result = versementCheckBalance({
        balanceCents: 0,
        amountCents: 100,
      });
      expect(result.ok).toBe(false);
      expect(result.rule).toBe("VERSEMENT_INSUFFICIENT_BALANCE");
    });
  });

  describe("versementValidateAtomic", () => {
    it("allows atomic versement (equal source and target)", () => {
      const result = versementValidateAtomic(500000, 500000);
      expect(result.ok).toBe(true);
    });

    it("blocks non-atomic versement (different amounts)", () => {
      const result = versementValidateAtomic(500000, 400000);
      expect(result.ok).toBe(false);
      expect(result.rule).toBe("VERSEMENT_ATOMIC");
    });

    it("blocks non-atomic versement (source > target)", () => {
      const result = versementValidateAtomic(600000, 500000);
      expect(result.ok).toBe(false);
      expect(result.rule).toBe("VERSEMENT_ATOMIC");
    });
  });

  // ─── PolicyService singleton ─────────────────────────────────────────────

  describe("PolicyService singleton", () => {
    it("exposes cotisation sub-policy", () => {
      expect(typeof policy.cotisation.canModify).toBe("function");
      expect(typeof policy.cotisation.validateAmount).toBe("function");
    });

    it("exposes transaction sub-policy", () => {
      expect(typeof policy.transaction.validateAmount).toBe("function");
      expect(typeof policy.transaction.canEdit).toBe("function");
    });

    it("exposes versement sub-policy", () => {
      expect(typeof policy.versement.checkBalance).toBe("function");
      expect(typeof policy.versement.validateAtomic).toBe("function");
    });

    it("cotisation.canModify delegates correctly", () => {
      const result = policy.cotisation.canModify({
        culteDate: new Date().toISOString().split("T")[0],
        statut: "NON_PAYE",
        montantPaye: 0,
        montantObligatoire: 5000,
      });
      expect(result.ok).toBe(true);
    });

    it("transaction.canEdit delegates correctly", () => {
      expect(policy.transaction.canEdit("DRAFT").ok).toBe(true);
      expect(policy.transaction.canEdit("APPROVED").ok).toBe(false);
    });

    it("versement.checkBalance delegates correctly", () => {
      expect(
        policy.versement.checkBalance({
          balanceCents: 100000,
          amountCents: 50000,
        }).ok,
      ).toBe(true);
      expect(
        policy.versement.checkBalance({
          balanceCents: 100000,
          amountCents: 200000,
        }).ok,
      ).toBe(false);
    });
  });
});
