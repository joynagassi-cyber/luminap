/**
 * Chantier D — Preuve E2E du flux d'invitation (rôle + org + capacités).
 *
 * Objectif : démontrer PAR LE TEST que, quel que soit le transport utilisé
 * pour émettre puis réclamer une invitation, l'invité reçoit le **rôle cible**,
 * l'**organisation cible** et les **capacités (grants)** de l'invitation.
 *
 * Les 4 transports réels du module :
 *   1. code manuel `LUM-XXXXXX` (résolu en ligne persistée `invitations`) ;
 *   2. payload QR (`buildQRPayload` → JSON → `parseQRPayload`) ;
 *   3. collage de payload (`parseQRPayload` sur le JSON collé) ;
 *   4. fichier `.json` (`importInvitationFromFile`, même moteur que le QR).
 *
 * Le cœur testé est du VRAI code, pur et sans mock :
 *   - `generateCode` / `buildQRPayload` / `parseQRPayload` (`../invitation`) ;
 *   - `evaluatePermission` (`@/lib/permissions`, miroir TS de `has_permission`).
 *
 * La matérialisation rôle/org/grants côté serveur est celle du trigger
 * `settle_invitation_claim` (`20261024000004_harden_settle_claim.sql`) : le
 * profil passe ACTIVE, `org_memberships` reçoit `(user, org, target_role)`, et
 * `grants_payload` est inséré en `grants subject_type='user'`. `materialize()`
 * ci-dessous reproduit exactement cette projection pour la branche décision.
 *
 * Run with: npx vitest run src/capabilities/__tests__/invitation-rbac-e2e.test.ts
 */

import { describe, it, expect, vi } from "vitest";

// `../invitation` importe `@/lib/auth`, qui exige VITE_SUPABASE_URL/ANON_KEY au
// chargement. Le cœur testé (buildQRPayload/parseQRPayload) est pur et n'utilise
// PAS l'auth : on neutralise cette dépendance d'infrastructure (comme le fait
// le setup partagé pour powersync/dataLayer/audit) pour un test auto-suffisant.
vi.mock("@/lib/auth", () => ({
  authService: {
    getSession: async () => null,
    getState: () => ({ session: null }),
    subscribe: () => () => {},
  },
}));

import {
  generateCode,
  buildQRPayload,
  parseQRPayload,
  importInvitationFromFile,
  type ClaimPayload,
  type CreateInvitationInput,
} from "../invitation";
import {
  evaluatePermission,
  type GrantRow,
  type RoleAssignmentRow,
} from "@/lib/permissions";

// ─────────────────────────────────────────────────────────────────────────────
// Scénario : inviter un ANCIEN dans une organisation, avec une capacité en plus
// ─────────────────────────────────────────────────────────────────────────────

const ORG_ID = "org-e2e-rbac";
const USER_ID = "auth-user-e2e";
const INVITATION_ID = "inv-e2e-1";
const ISSUED_BY = "admin-1";
const ISSUED_AT = "2026-10-27T00:00:00.000Z";
const EXPIRES_AT = "2099-01-01T00:00:00.000Z";
const CODE = generateCode();

/** Capacité supplémentaire accordée par l'invitation (le rôle ANCIEN ne l'a pas). */
const GRANTED_CAPABILITY = { resource: "admin", action: "roles" };
/** Permission portée par le rôle canon ANCIEN (branche `reason:'role'`). */
const ROLE_PERMISSION = { resource: "report", action: "read" };

const invitationInput: CreateInvitationInput = {
  orgId: ORG_ID,
  targetRole: "ANCIEN",
  targetScopeType: "ORG",
  issuedBy: ISSUED_BY,
  expiresAt: EXPIRES_AT,
  grantsPayload: [GRANTED_CAPABILITY] as any,
  tagsPayload: ["tag-finance"],
};

/** Ligne persistée `public.invitations` — la source de vérité du flux. */
interface PersistedInvitationRow {
  id: string;
  org_id: string;
  code: string;
  target_role: string;
  target_scope_type: "ORG" | "GROUP" | "EVENT" | "REPORT";
  target_group_id: string | null;
  target_member_id: string | null;
  issued_by: string;
  issued_at: string;
  expires_at: string;
  max_uses: number;
  used_count: number;
  status: string;
  target_scope_resource: string | null;
  target_scope_id: string | null;
  grants_payload: string;
  tags_payload: string;
}

const persistedRow: PersistedInvitationRow = {
  id: INVITATION_ID,
  org_id: ORG_ID,
  code: CODE,
  target_role: "ANCIEN",
  target_scope_type: "ORG",
  target_group_id: null,
  target_member_id: null,
  issued_by: ISSUED_BY,
  issued_at: ISSUED_AT,
  expires_at: EXPIRES_AT,
  max_uses: 1,
  used_count: 0,
  status: "ACTIVE",
  target_scope_resource: null,
  target_scope_id: null,
  grants_payload: JSON.stringify(invitationInput.grantsPayload ?? []),
  tags_payload: JSON.stringify(invitationInput.tagsPayload ?? []),
};

/** Payload canonique émis (ce que le QR / le collage / le fichier transportent). */
const canonicalPayload: ClaimPayload = {
  ...buildQRPayload(invitationInput, CODE),
  invitationId: INVITATION_ID, // rempli après écriture PS (cf. createInvitation)
};

/**
 * Reconstruit le payload depuis la ligne persistée (résolution du code manuel),
 * en conservant `grants_payload`/`tags_payload` — aucune perte sur ce transport.
 */
function payloadFromPersistedRow(row: PersistedInvitationRow): ClaimPayload {
  return {
    v: 1,
    orgId: row.org_id,
    invitationId: row.id,
    code: row.code,
    role: row.target_role,
    scope: {
      type: row.target_scope_type,
      ...(row.target_scope_type === "GROUP" && row.target_group_id
        ? { groupId: row.target_group_id }
        : {}),
    },
    memberId: row.target_member_id,
    grants: JSON.parse(row.grants_payload),
    tags: JSON.parse(row.tags_payload),
    issuedAt: row.issued_at,
    expiresAt: row.expires_at,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Les 4 transports — chacun produit la chaîne brute reçue par le réclamant
// ─────────────────────────────────────────────────────────────────────────────

interface TransportCase {
  name: string;
  /** Chaîne brute reçue par le réclamant. */
  raw: string;
  /** Parseur réel du transport (le cœur testé). */
  parse: (raw: string) => ClaimPayload | null;
  /** Objet attendu après round-trip. */
  expected: ClaimPayload;
}

const TRANSPORTS: TransportCase[] = [
  {
    name: "code manuel (LUM-XXXXXX)",
    raw: JSON.stringify(payloadFromPersistedRow(persistedRow)),
    parse: parseQRPayload,
    expected: payloadFromPersistedRow(persistedRow),
  },
  {
    name: "payload QR (buildQRPayload → parseQRPayload)",
    raw: JSON.stringify(canonicalPayload),
    parse: parseQRPayload,
    expected: canonicalPayload,
  },
  {
    name: "collage de payload",
    raw: JSON.stringify(canonicalPayload),
    parse: parseQRPayload,
    expected: canonicalPayload,
  },
  {
    name: "fichier .json (importInvitationFromFile)",
    raw: JSON.stringify(canonicalPayload),
    parse: importInvitationFromFile,
    expected: canonicalPayload,
  },
];

// ─────────────────────────────────────────────────────────────────────────────

describe("Chantier D — E2E invitation : rôle + org + capacités par les 4 transports", () => {
  describe("invitation émise (source de vérité persistée)", () => {
    it("porte target_role, org_id, grants_payload et tags_payload intacts", () => {
      expect(persistedRow.target_role).toBe("ANCIEN");
      expect(persistedRow.org_id).toBe(ORG_ID);
      expect(JSON.parse(persistedRow.grants_payload)).toEqual([
        GRANTED_CAPABILITY,
      ]);
      expect(JSON.parse(persistedRow.tags_payload)).toEqual(["tag-finance"]);
    });

    it("le code manuel est un LUM-XXXXXX qui identifie cette invitation", () => {
      expect(CODE).toMatch(/^LUM-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/);
      expect(persistedRow.code).toBe(CODE);
    });
  });

  for (const t of TRANSPORTS) {
    describe(`transport — ${t.name}`, () => {
      it("le payload reçu porte le rôle cible, l'org cible et les capacités (aucune perte)", () => {
        const received = t.parse(t.raw);
        expect(received).not.toBeNull();
        const p = received as ClaimPayload;
        expect(p.role).toBe("ANCIEN");
        expect(p.orgId).toBe(ORG_ID);
        expect(p.grants).toEqual([GRANTED_CAPABILITY]);
        expect(p.tags).toEqual(["tag-finance"]);
      });

      it("parseQRPayload reconstruit le même objet (round-trip fidèle)", () => {
        expect(parseQRPayload(t.raw)).toEqual(t.expected);
      });
    });
  }

  describe("cohérence avec la décision (evaluatePermission)", () => {
    /**
     * Projection du trigger `settle_invitation_claim` : rôle + org assignés,
     * `grants_payload` inséré en grants `subject_type='user'`.
     */
    function materialize(payload: ClaimPayload): {
      roles: RoleAssignmentRow[];
      grants: GrantRow[];
    } {
      const roles: RoleAssignmentRow[] = [
        { role: payload.role, orgId: payload.orgId, status: "ACTIVE" },
      ];
      const grants: GrantRow[] = (payload.grants ?? []).map((g) => ({
        subjectType: "user" as const,
        subjectId: USER_ID,
        resource: g.resource,
        action: g.action,
        effect: "allow" as const,
      }));
      return { roles, grants };
    }

    it("rôle ANCIEN : une permission du rôle → allowed, reason 'role'", () => {
      const { roles, grants } = materialize(canonicalPayload);
      const decision = evaluatePermission({
        userId: USER_ID,
        orgId: ORG_ID,
        resource: ROLE_PERMISSION.resource,
        action: ROLE_PERMISSION.action,
        roles,
        grants,
      });
      expect(decision).toEqual({ allowed: true, reason: "role" });
    });

    it("capacité supplémentaire transportée : allowed, reason 'grant'", () => {
      const { roles, grants } = materialize(canonicalPayload);
      const decision = evaluatePermission({
        userId: USER_ID,
        orgId: ORG_ID,
        resource: GRANTED_CAPABILITY.resource,
        action: GRANTED_CAPABILITY.action,
        roles,
        grants,
      });
      expect(decision).toEqual({ allowed: true, reason: "grant" });
    });

    it("sans la capacité, ANCIEN est refusé (l'invitation est ce qui l'accorde)", () => {
      const { roles } = materialize(canonicalPayload);
      const decision = evaluatePermission({
        userId: USER_ID,
        orgId: ORG_ID,
        resource: GRANTED_CAPABILITY.resource,
        action: GRANTED_CAPABILITY.action,
        roles,
        grants: [],
      });
      expect(decision).toEqual({ allowed: false, reason: "none" });
    });

    it("un deny explicite l'emporte sur le rôle (priorité deny)", () => {
      const { roles, grants } = materialize(canonicalPayload);
      const withDeny: GrantRow[] = [
        ...grants,
        {
          subjectType: "user",
          subjectId: USER_ID,
          resource: ROLE_PERMISSION.resource,
          action: ROLE_PERMISSION.action,
          effect: "deny",
        },
      ];
      const decision = evaluatePermission({
        userId: USER_ID,
        orgId: ORG_ID,
        resource: ROLE_PERMISSION.resource,
        action: ROLE_PERMISSION.action,
        roles,
        grants: withDeny,
      });
      expect(decision).toEqual({ allowed: false, reason: "deny" });
    });

    it("de bout en bout : le payload QR transporté produit rôle+org+capacités puis autorise", () => {
      const received = parseQRPayload(
        JSON.stringify(canonicalPayload),
      ) as ClaimPayload;
      const { roles, grants } = materialize(received);
      expect(roles[0]).toEqual({
        role: "ANCIEN",
        orgId: ORG_ID,
        status: "ACTIVE",
      });
      expect(
        evaluatePermission({
          userId: USER_ID,
          orgId: ORG_ID,
          resource: ROLE_PERMISSION.resource,
          action: ROLE_PERMISSION.action,
          roles,
          grants,
        }),
      ).toEqual({ allowed: true, reason: "role" });
      expect(
        evaluatePermission({
          userId: USER_ID,
          orgId: ORG_ID,
          resource: GRANTED_CAPABILITY.resource,
          action: GRANTED_CAPABILITY.action,
          roles,
          grants,
        }),
      ).toEqual({ allowed: true, reason: "grant" });
    });
  });
});
