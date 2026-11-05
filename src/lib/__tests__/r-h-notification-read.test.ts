/**
 * R-H — « marquer une notification comme lue » doit être PERSISTANT.
 *
 * DÉFAUT (mesuré en production, 2026-11-04) : la policy
 * `notifications_update` exigeait `admin:settings` (un TREASURIER/PASTEUR ne
 * pouvait pas écrire `is_read`) ET le client ne mutait que l'état React
 * (`notification-service.ts` est PUR, aucune écriture PowerSync/Supabase) →
 * aucune persistance, tout redevenait non lu.
 *
 * Cette garde vérifie :
 *   1. la migration `20261104000002` élargit la RLS à `is_org_member` et
 *      restreint l'écriture à la SEULE colonne `is_read` (privilège colonne) ;
 *   2. le store persiste dans PowerSync (UPDATE … is_read) au lieu d'un simple
 *      `set()` mémoire ;
 *   3. la page Notifications passe par le STORE (persistant), plus par les
 *      fonctions pures ré-exportées.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const root = resolve(__dirname, "../../..");
const read = (p: string) => readFileSync(resolve(root, p), "utf8");

const MIGRATION = "supabase/migrations/20261104000002_notifications_read_policy.sql";

describe("R-H — migration : RLS membre + écriture colonne is_read", () => {
  const sql = read(MIGRATION);

  it("la policy UPDATE est fondée sur is_org_member (plus admin:settings)", () => {
    expect(sql).toMatch(
      /CREATE POLICY notifications_update ON public\.notifications[\s\S]*?is_org_member\(auth\.uid\(\), org_id\)/i,
    );
    // La restriction admin:settings ne doit plus garder l'UPDATE.
    const updateBlock = sql.slice(sql.indexOf("CREATE POLICY notifications_update"));
    const firstSemi = updateBlock.indexOf(";");
    expect(updateBlock.slice(0, firstSemi)).not.toMatch(/has_permission/);
  });

  it("l'écriture est restreinte à la colonne is_read", () => {
    expect(sql).toMatch(/REVOKE UPDATE ON public\.notifications FROM authenticated/i);
    expect(sql).toMatch(/GRANT UPDATE \(is_read\) ON public\.notifications TO authenticated/i);
  });
});

describe("R-H — client : persistance PowerSync", () => {
  const store = read("src/store/useLocalStore.ts");

  it("le store écrit is_read dans PowerSync (UPDATE notifications)", () => {
    expect(store).toMatch(/UPDATE notifications SET is_read = 1/);
    expect(store).toMatch(/async function persistNotificationRead/);
    expect(store).toMatch(/async function persistAllNotificationsRead/);
  });

  it("les handlers du store appellent la persistance avant le set() mémoire", () => {
    expect(store).toMatch(
      /markNotificationRead: async \(id\) => \{\s*await persistNotificationRead\(id\)/,
    );
    expect(store).toMatch(
      /markAllNotificationsRead: async \(\) => \{\s*await persistAllNotificationsRead\(/,
    );
  });

  it("la page Notifications utilise le store, plus les fonctions pures", () => {
    const page = read("src/pages/Notifications.tsx");
    expect(page).toMatch(/const \{ markNotificationRead, markAllNotificationsRead \} = useLocalStore\(\)/);
    expect(page).not.toMatch(/markNotificationRead\(id, \{\} as any\)/);
    expect(page).not.toMatch(/markAllNotificationsRead\(\{\} as any\)/);
  });
});
