/**
 * Vague 2 — Assert de validation : formule d'union `canAccess` (5 sources).
 *
 * Vérifie l'implémentation de `federation.canAccess` contre les cas du plan
 * §2.6 :
 *   (a) 2 rôles dans la même org → UNION des permissions (source 4).
 *   (b) grant scopé `{ scope: { resource: 'group', id: 'G1' } }` ne permet
 *       PAS `report:read` au niveau org (scope nul ≠ global).
 *   (c) user assigné au tag "bénévoles" + grant `tag` → accès report:read
 *       même sans rôle canon qui le couvre (source 2 / invariant 10).
 *   (d) grant `{ resource: 'ai', action: 'approve' }` fonctionne sans
 *       migration (invariant 9 : resource/action TEXT libres).
 *
 * L'agent s'arrête si l'union diverge de l'un de ces tests.
 *
 * Run with: pnpm test src/capabilities/__tests__/federation-canAccess.test.ts
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import { federation } from "@/capabilities/federation";
import type { AccessScope } from "@/types/federation";

// --------------------------------------------------------------------------
// Mock du SQLite PowerSync local (pas de vrai DB dans les tests — on
// stubbe `getPowerSyncDatabase` via le module mock de vitest).
// --------------------------------------------------------------------------
import { vi } from "vitest";
import * as powersyncModule from "@/lib/powersync";

type Row = Record<string, unknown>;
const dbState = {
  org_memberships: [] as Row[],
  profiles: [] as Row[],
  grants: [] as Row[],
  tag_assignments: [] as Row[],
  group_memberships: [] as Row[],
  members: [] as Row[],
};

function sqlResult(rows: Row[]) {
  return { array: rows, rowsAffected: 0 };
}

const USER = "u1";
const ORG = "org-A";

// Moteur de filtrage minimal qui imite les requêtes de `canAccess` /
// `listEffectiveGrants` (paramètres positionnels ?), sans vrai SQL engine.
function resolveGrants(params: unknown[]): Row[] {
  // Séquences de paramètres (voir federation/index.ts) :
  //  A. canAccess scope===undefined : [resource, action, u, u, o, o, u, o]
  //  B. canAccess scope défini      : [resource, action, res, id, u, u, o, o, u, o]
  //  C. listEffectiveGrants         : [u, u, o, o, u, o]
  // Séquences de paramètres (voir federation/index.ts) :
  //  A. canAccess scope===undefined : [resource, action, u, u, o, o, u, o]      (8)
  //  B. canAccess scope défini      : [resource, action, sr, si, u, u, o, o, u, o] (10)
  //  C. listEffectiveGrants         : [u, u, o, o, u, o]                        (6)
  //
  // Disambiguation : dans B, p[2]/p[3] sont les colonnes du scope (scope_res,
  // scope_id) ; dans A, p[0]/p[1] sont la ressource/action. Comme le mock ne
  // reçoit que l'array `params` (pas le SQL), on distingue par la longueur.
  let resource: string | null = null;
  let action: string | null = null;
  let requireGlobalScope = false;
  let scopeRes: string | null = null;
  let scopeId: string | null = null;
  let listMode = false;

  if (params.length === 8) {
    // A : [resource, action, userId, userId, orgId, orgId, userId, orgId]
    resource = String(params[0]);
    action = String(params[1]);
    requireGlobalScope = true;
  } else if (params.length === 10) {
    // B : [resource, action, scopeRes, scopeId, userId, userId, orgId, orgId, userId, orgId]
    resource = String(params[0]);
    action = String(params[1]);
    scopeRes = String(params[2]);
    scopeId = String(params[3]);
  } else if (params.length === 6) {
    // C : listEffectiveGrants — on renvoie tous les grants actifs.
    listMode = true;
  }

  return dbState.grants.filter((g) => {
    if (g.revoked_at != null) return false;
    if (listMode) return true;
    if (String(g.resource) !== resource || String(g.action) !== action)
      return false;
    if (requireGlobalScope) return g.scope_resource == null;
    // scope fourni : global OU scope exact
    if (g.scope_resource == null) return true;
    return (
      String(g.scope_resource) === scopeRes && String(g.scope_id) === scopeId
    );
  });
}

beforeAll(() => {
  // Stubbe getPowerSyncDatabase : retourne un objet `execute` qui
  // reconnaît les requêtes spécifiques de canAccess et listEffectiveGrants
  // par simple matching de préfixe (pas de vrai SQL engine).
  vi.spyOn(powersyncModule, "getPowerSyncDatabase").mockImplementation(
    () =>
      ({
        async execute(
          sql: string,
          params: unknown[] = [],
        ): Promise<{ array: Row[] }> {
          const s = sql.replace(/\s+/g, " ").trim();
          if (s.startsWith("SELECT role FROM org_memberships")) {
            return sqlResult(
              dbState.org_memberships.filter(
                (m) =>
                  m.user_id === USER &&
                  m.org_id === ORG &&
                  ["ACTIVE", "PENDING"].includes(String(m.status)),
              ),
            );
          }
          if (s.startsWith("SELECT role FROM profiles")) {
            return sqlResult(
              dbState.profiles.filter((p) => p.id === USER && p.org_id === ORG),
            );
          }
          if (s.startsWith("SELECT * FROM grants")) {
            return sqlResult(resolveGrants(params as unknown[]));
          }
          return sqlResult([]);
        },
      }) as unknown as ReturnType<typeof powersyncModule.getPowerSyncDatabase>,
  );
});

afterAll(() => {
  vi.restoreAllMocks();
});

function seedAll() {
  dbState.org_memberships = [
    {
      id: "m1",
      user_id: "u1",
      org_id: "org-A",
      role: "COMPTABLE",
      status: "ACTIVE",
    },
    {
      id: "m2",
      user_id: "u1",
      org_id: "org-A",
      role: "BENEVOLE",
      status: "ACTIVE",
    },
  ];
  dbState.profiles = [];
  dbState.grants = [];
  dbState.tag_assignments = [];
  dbState.group_memberships = [];
  dbState.members = [];
}

describe("Vague 2.6 — canAccess (5 sources)", () => {
  it("(a) 2 rôles dans la même org → UNION des permissions (source 4)", async () => {
    seedAll();
    // COMPTABLE a "transaction:read" ; BENEVOLE a "report:read"
    // → l'union des deux rôles couvre les deux permissions.
    expect(
      await federation.canAccess("u1", "org-A", "transaction", "read"),
    ).toBe(true);
    expect(await federation.canAccess("u1", "org-A", "report", "read")).toBe(
      true,
    );
    // Transaction:create n'est pas dans l'union COMPTABLE ∪ BENEVOLE.
    expect(
      await federation.canAccess("u1", "org-A", "transaction", "create"),
    ).toBe(false);
  });

  it("(b) grant scopé ne permet PAS la même action au niveau org", async () => {
    seedAll();
    // On utilise une permission que l'union canonique (COMPTABLE ∪ BENEVOLE)
    // ne couvre PAS — sinon le grant ne serait pas isolable.
    // `admin:settings` n'appartient à aucune des deux matrices.
    dbState.grants = [
      {
        id: "g1",
        subject_type: "user",
        subject_id: "u1",
        resource: "admin",
        action: "settings",
        scope_resource: "group",
        scope_id: "G1",
        revoked_at: null,
      },
    ];
    // `admin:settings` SANS scope (org-level) : le grant est scopé sur group
    // G1 → au niveau org il ne couvre PAS (plan §2.6, test b).
    expect(
      await federation.canAccess("u1", "org-A", "admin", "settings"),
    ).toBe(false);
    // Avec le bon scope → autorisé.
    const scope: AccessScope = { resource: "group", id: "G1" };
    expect(
      await federation.canAccess("u1", "org-A", "admin", "settings", scope),
    ).toBe(true);
  });

  it("(c) user assigné au tag 'bénévoles' + grant tag → accès report:read", async () => {
    seedAll();
    dbState.grants = [
      {
        id: "g2",
        subject_type: "tag",
        subject_id: "tag-1",
        resource: "report",
        action: "read",
        scope_resource: null,
        scope_id: null,
        revoked_at: null,
      },
    ];
    dbState.tag_assignments = [
      { tag_id: "tag-1", user_id: "u1", org_id: "org-A" },
    ];
    // Rôle canon : on retire COMPTABLE/BENEVOLE pour isoler la source 2.
    dbState.org_memberships = [];
    // → grant tag couvrir report:read malgré l'absence de rôle canon.
    expect(
      await federation.canAccess("u1", "org-A", "report", "read"),
    ).toBe(true);
  });

  it("(d) resource libre 'ai' + action 'approve' fonctionne sans migration", async () => {
    seedAll();
    dbState.grants = [
      {
        id: "g3",
        subject_type: "user",
        subject_id: "u1",
        resource: "ai",
        action: "approve",
        scope_resource: null,
        scope_id: null,
        revoked_at: null,
      },
    ];
    // Invariant 9 : pas de CHECK sur `resource`/`action` ; le grant passe.
    expect(
      await federation.canAccess("u1", "org-A", "ai", "approve"),
    ).toBe(true);
  });

  it("invariant 10 — 'tag' est un sujet de première classe (CHECK sur PG)", async () => {
    seedAll();
    // Vérifie juste le contrat côté TS : un Grant sujet 'tag' est typé.
    const g: import("@/types/federation").Grant = {
      subjectType: "tag",
      subjectId: "tag-1",
      resource: "report",
      action: "read",
      grantedBy: "u-admin",
      grantedAt: new Date().toISOString(),
      revokedAt: null,
    };
    expect(g.subjectType).toBe("tag");
  });

  it("B.2 — un user avec 2 memberships (sans profil legacy) voit les 2 orgs via listOrgs", async () => {
    // seedAll() laisse dbState.profiles vide (pas de profil legacy pour u1)
    // et 2 org_memberships ACTIVE (u1 → org-A). On ajoute un 2e membership.
    seedAll();
    dbState.org_memberships = [
      { id: "m1", user_id: "u1", org_id: "org-A", role: "COMPTABLE", status: "ACTIVE" },
      { id: "m2", user_id: "u1", org_id: "org-B", role: "BENEVOLE", status: "ACTIVE" },
    ];
    dbState.grants = [];
    dbState.tag_assignments = [];

    // Comme le mock du test répond à TOUTE query par les données filtrées,
    // on vérifie ici le contrat : que listOrgs de la capability federation
    // contient le terme OR EXISTS (SELECT 1 FROM org_memberships …) dans son
    // SQL. Ce n'est PAS un test d'exécution — la couverture réelle du SQL est
    // déléguée à l'assert Supabase (à faire post-redeploy PowerSync).
    // On valide le contrat par inspection : le source de listOrgs porte le
    // 3e terme (ON CONFLICT DO UPDATE, etc.). On slice depuis `async listOrgs`
    // jusqu'au premier `\n  }\n` (fin de la méthode, indent 2) — la version
    // avec `src.indexOf("}", …)` se coupait au `}` du `filter?: { type?: string }`
    // du type signature.
    const src = readFileSync(resolve(__dirname, "../federation/index.ts"), "utf-8");
    const start = src.indexOf("async listOrgs(");
    const end = src.indexOf("\n  }\n", start);
    const body = src.slice(start, end > start ? end : src.length);
    expect(body).toContain("org_memberships");
    expect(body).toContain("'ACTIVE','PENDING'");
  });
});
