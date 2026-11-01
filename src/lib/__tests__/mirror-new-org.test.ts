// @vitest-environment node
/**
 * Miroir local d'une organisation fraîchement créée (`mirrorNewOrganizationLocally`).
 *
 * Le serveur (`create_org`) écrit en base ; la réplique PowerSync locale n'est
 * pas encore à jour. Ce miroir optimiste est ce qui rend la garde
 * « needs-membership » satisfaite IMMÉDIATEMENT après création (sinon le
 * dashboard reste inaccessible jusqu'au prochain download).
 *
 * Non-vacuité : le mock PowerSync est STATEFUL (il stocke les lignes). Retirer
 * une des écritures (organizations / org_admins / org_memberships / profiles)
 * fait échouer l'assertion correspondante. Il refuse aussi les `ON CONFLICT` /
 * `INSERT OR REPLACE` (échec réel « cannot UPSERT a view ») : le miroir doit
 * utiliser DELETE + INSERT.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const ps = vi.hoisted(() => ({
  organizations: [] as any[],
  org_admins: [] as any[],
  org_memberships: [] as any[],
  profiles: [] as any[],
  failTables: new Set<string>(),
}));

vi.mock("@/lib/powersync", () => ({
  getPowerSyncDatabase: () => ({
    execute: async (sql: string, params: any[] = []) => {
      if (/ON CONFLICT|INSERT OR REPLACE/i.test(sql)) {
        throw new Error("cannot UPSERT a view");
      }
      const table = sql.match(/(?:FROM|INTO|UPDATE)\s+(\w+)/i)?.[1] ?? "";
      if (ps.failTables.has(table)) throw new Error("db down");
      const store = (ps as any)[table] as any[] | undefined;
      if (!store) return { rowsAffected: 0 };
      if (/^DELETE FROM/i.test(sql.trim())) {
        const [id] = params;
        const idx = store.findIndex((r) => r.id === id);
        if (idx >= 0) store.splice(idx, 1);
        return { rowsAffected: 1 };
      }
      if (/^INSERT INTO/i.test(sql.trim())) {
        // Paramètres = ceux des `?` uniquement (les littéraux SQL 'ACTIVE' / 1
        // ne sont PAS des paramètres).
        if (table === "organizations") {
          const [id, name, type, created_at, updated_at] = params;
          store.push({ id, name, type, status: "ACTIVE", created_at, updated_at });
        } else if (table === "org_admins") {
          const [id, admin_profile_id, org_id, granted_by, created_at, updated_at] = params;
          store.push({ id, admin_profile_id, org_id, status: "ACTIVE", granted_by, created_at, updated_at });
        } else if (table === "org_memberships") {
          const [id, user_id, org_id, role, joined_at] = params;
          store.push({ id, user_id, org_id, role, is_primary: 1, status: "ACTIVE", joined_at });
        }
        return { rowsAffected: 1 };
      }
      if (/^UPDATE profiles/i.test(sql.trim())) {
        const [org_id, role, updated_at, id] = params;
        const row = store.find((r) => r.id === id);
        if (row) Object.assign(row, { org_id, role, updated_at });
        return { rowsAffected: row ? 1 : 0 };
      }
      return { rowsAffected: 0 };
    },
  }),
}));

import { mirrorNewOrganizationLocally } from "@/lib/dataLayer";

beforeEach(() => {
  ps.organizations = [];
  ps.org_admins = [];
  ps.org_memberships = [];
  ps.profiles = [{ id: "user-1", org_id: "__no_org__", role: "MEMBRE" }];
  ps.failTables = new Set();
});

const INPUT = {
  orgId: "org-x",
  name: "Église X",
  type: "CHURCH",
  userId: "user-1",
  role: "ADMIN",
  grantId: "grant-x",
};

describe("mirrorNewOrganizationLocally", () => {
  it("écrit organizations + org_admins + org_memberships + profiles", async () => {
    await mirrorNewOrganizationLocally(INPUT);
    expect(ps.organizations).toHaveLength(1);
    expect(ps.organizations[0]).toMatchObject({ id: "org-x", name: "Église X", status: "ACTIVE" });
    expect(ps.org_admins).toHaveLength(1);
    expect(ps.org_admins[0]).toMatchObject({
      id: "grant-x",
      admin_profile_id: "user-1",
      org_id: "org-x",
      status: "ACTIVE",
    });
    expect(ps.org_memberships).toHaveLength(1);
    expect(ps.org_memberships[0]).toMatchObject({
      user_id: "user-1",
      org_id: "org-x",
      role: "ADMIN",
      status: "ACTIVE",
    });
    // Le profil local est rattaché : `canAccessOrganization` (branche
    // profiles.org_id) répond OUI.
    expect(ps.profiles[0]).toMatchObject({ org_id: "org-x", role: "ADMIN" });
  });

  it("est idempotent : un 2e appel ne duplique pas les lignes", async () => {
    await mirrorNewOrganizationLocally(INPUT);
    await mirrorNewOrganizationLocally(INPUT);
    expect(ps.organizations).toHaveLength(1);
    expect(ps.org_admins).toHaveLength(1);
    expect(ps.org_memberships).toHaveLength(1);
  });

  it("une écriture qui échoue est non fatale (le reste est écrit)", async () => {
    ps.failTables = new Set(["org_admins"]);
    await expect(mirrorNewOrganizationLocally(INPUT)).resolves.toBeUndefined();
    expect(ps.organizations).toHaveLength(1);
    expect(ps.profiles[0]).toMatchObject({ org_id: "org-x" });
  });
});
