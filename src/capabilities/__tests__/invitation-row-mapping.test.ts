/**
 * Garde anti-régression — mapping des lignes PowerSync (SNAKE_CASE → camelCase).
 *
 * DÉFAUT mesuré : `invitation.getInvitationByCode()` / `getInvitation()` /
 * `getInvitations()` exécutent un SELECT qui renvoie les colonnes en
 * snake_case (`org_id`, `target_role`, `expires_at`, …), puis les exposaient
 * SANS conversion sous le type `Invitation` (camelCase). Résultat : tout
 * appelant lisant `invite.orgId` / `invite.targetRole` / `invite.expiresAt`
 * recevait `undefined`. Conséquence concrète sur `InvitationClaim` (claim par
 * code manuel) : payload sans org/rôle/scope → `selectRole` sauté, audit sans
 * organisation, et comparaison d'expiration sur une date invalide (jamais
 * « expiré » mais invitation mal reconstruite).
 *
 * Ce test verrouille la conversion : il échoue si l'on retire les mappers
 * `mapInvitationRow` / `mapClaimRow` des méthodes de lecture.
 *
 * Run with: npx vitest run src/capabilities/__tests__/invitation-row-mapping.test.ts
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import { mapInvitationRow, mapClaimRow } from "../invitation";

describe("invitation — mapping ligne PowerSync → Invitation (camelCase)", () => {
  it("convertit toutes les colonnes snake_case en camelCase", () => {
    const row = {
      id: "inv-1",
      org_id: "org-1",
      code: "LUM-ABC123",
      target_role: "TREASURier",
      target_scope_type: "GROUP",
      target_group_id: "grp-1",
      target_member_id: null,
      issued_by: "user-1",
      issued_at: "2026-01-01T00:00:00.000Z",
      expires_at: "2026-01-08T00:00:00.000Z",
      max_uses: 3,
      used_count: 1,
      status: "ACTIVE",
      target_scope_resource: "event",
      target_scope_id: "evt-9",
      grants_payload: '[{"resource":"ai","action":"read"}]',
      tags_payload: '["tag-1"]',
    };

    const inv = mapInvitationRow(row);

    expect(inv.orgId).toBe("org-1");
    expect(inv.targetRole).toBe("TREASURier");
    expect(inv.targetScopeType).toBe("GROUP");
    expect(inv.targetGroupId).toBe("grp-1");
    expect(inv.targetMemberId).toBeNull();
    expect(inv.issuedBy).toBe("user-1");
    expect(inv.issuedAt).toBe("2026-01-01T00:00:00.000Z");
    expect(inv.expiresAt).toBe("2026-01-08T00:00:00.000Z");
    expect(inv.maxUses).toBe(3);
    expect(inv.usedCount).toBe(1);
    expect(inv.targetScopeResource).toBe("event");
    expect(inv.targetScopeId).toBe("evt-9");
    expect(inv.grantsPayload).toBe('[{"resource":"ai","action":"read"}]');
    expect(inv.tagsPayload).toBe('["tag-1"]');
    // Non-vacuité : un champ camelCase essentiel ne doit PAS être undefined.
    expect(inv.expiresAt, "expiresAt undefined → INVITATION_EXPIRED faux").toBeDefined();
  });

  it("reste tolérant à une ligne déjà en camelCase", () => {
    const inv = mapInvitationRow({
      id: "inv-2",
      orgId: "org-2",
      code: "LUM-XYZ",
      targetRole: "MEMBRE",
      targetScopeType: "ORG",
      expiresAt: "2026-02-01T00:00:00.000Z",
      status: "ACTIVE",
    });
    expect(inv.orgId).toBe("org-2");
    expect(inv.targetRole).toBe("MEMBRE");
    expect(inv.expiresAt).toBe("2026-02-01T00:00:00.000Z");
  });

  it("convertit une ligne de claim (invitation_claims)", () => {
    const claim = mapClaimRow({
      id: "c-1",
      invitation_id: "inv-1",
      claimed_by_device_id: "dev-1",
      claimed_at: "2026-01-02T00:00:00.000Z",
      resulting_user_id: "user-1",
      status: "CONFIRMED",
      reject_reason: null,
    });
    expect(claim.invitationId).toBe("inv-1");
    expect(claim.claimedByDeviceId).toBe("dev-1");
    expect(claim.resultingUserId).toBe("user-1");
    expect(claim.rejectReason).toBeNull();
  });
});

describe("invitation — les lectures passent RÉELLEMENT par les mappers", () => {
  const src = readFileSync(resolve(__dirname, "../invitation/index.ts"), "utf8");

  it("chaque méthode de lecture applique mapInvitationRow / mapClaimRow", () => {
    for (const fn of [
      "getInvitations",
      "getInvitation(",
      "getInvitationByCode",
      "getClaims",
    ]) {
      const start = src.indexOf(`async ${fn}`);
      expect(start, `${fn} introuvable`).toBeGreaterThan(-1);
      const body = src.slice(start, src.indexOf("\n  }\n", start));
      const mapped =
        body.includes("mapInvitationRow") || body.includes("mapClaimRow");
      expect(
        mapped,
        `${fn} renvoie des lignes snake_case sans passer par un mapper → champs camelCase undefined`,
      ).toBe(true);
    }
  });

  it("aucune méthode de lecture ne caste plus les lignes brutes en Invitation", () => {
    // Le défaut d'origine : `as any[] as Invitation[]` sur le résultat brut.
    expect(src).not.toMatch(/as any\[\] as Invitation/);
    expect(src).not.toMatch(/as any\[\] as InvitationClaim/);
  });
});
