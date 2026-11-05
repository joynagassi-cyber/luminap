// @vitest-environment node
/**
 * Garde anti-régression — R74 : `notifications.action_type` porte un TYPE
 * D'ÉVÉNEMENT, jamais un RÔLE destinataire.
 *
 * DÉFAUT (audit) : `sendNotification` écrivait `data.targetRole ?? "PUSH"`
 * dans `action_type` → la colonne (qui contient partout `EVENT_CREATED`,
 * `INVITATION_RECEIVED`, `TRANSACTION_PENDING`…) recevait des rôles
 * (`TREASURIER`, `ADMIN`), et `notifIconKey` ne pouvait plus choisir l'icône.
 * Le rôle est désormais réservé au CIBLAGE (`target_role`/`targetUserId`).
 *
 * Non-vacuité : remettre `data.targetRole` dans l'INSERT (ou retirer
 * `actionType` d'un site d'appel) fait échouer les assertions.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { ROLE_LABELS } from "@/lib/rbac";

const ROLE_NAMES = new Set(Object.keys(ROLE_LABELS));

function read(rel: string): string {
  return readFileSync(resolve(process.cwd(), rel), "utf8");
}

describe("R74 — action_type = type d'événement (jamais un rôle)", () => {
  it("sendNotification écrit `data.actionType`, pas `data.targetRole`", () => {
    const src = read("src/capabilities/notification/index.ts");
    expect(src).toMatch(/data\.actionType \?\? "PUSH"/);
    expect(src).not.toMatch(/data\.targetRole \?\? "PUSH"/);
  });

  it("cloudPush transmet `payload.actionType`, pas `payload.targetRole`", () => {
    const src = read("src/lib/cloudPush.ts");
    expect(src).toMatch(/actionType: payload\.actionType \?\? "PUSH"/);
    expect(src).not.toMatch(/actionType: payload\.targetRole/);
  });

  it("les littéraux `actionType` du client ne sont JAMAIS des rôles", () => {
    const files = [
      "src/pages/TransactionDetail.tsx",
      "src/pages/TransactionNew.tsx",
      "src/pages/EventNew.tsx",
      "src/pages/GivingCampaign.tsx",
      "src/pages/FormFill.tsx",
      "src/pages/InvitationEmit.tsx",
      "src/pages/InvitationClaim.tsx",
      "src/pages/Versement.tsx",
      "src/pages/SettingsNotifications.tsx",
      "src/lib/reportReminders.ts",
    ];
    for (const f of files) {
      const src = read(f);
      for (const m of src.matchAll(/actionType:\s*"([A-Z_]+)"/g)) {
        expect(
          ROLE_NAMES.has(m[1]),
          `${f} : actionType="${m[1]}" est un RÔLE, pas un type d'événement (R74)`,
        ).toBe(false);
      }
    }
  });
});
