/**
 * Garde anti-régression R115 — surface RPC des fonctions de trigger.
 *
 * CLASSE DE DÉFAUT (mesurée le 2026-10-28, instance dev) : une migration qui
 * RECRÉE une fonction de trigger (ou la fonction de règlement) hors du chemin
 * de durcissement R103 rouvre la surface RPC. Deux instances réelles :
 *
 *   (A) `denorm_child_org_id` / `denorm_cascade_org_id` (20261027000001) sont
 *       créées APRÈS le balayage générique de 20261026000005 → SECURITY DEFINER
 *       et EXECUTE-ables par anon/authenticated.
 *   (B) `20261027000011` recrée `settle_invitation_claim` en repartant du corps
 *       pré-R103 → la garde `pg_trigger_depth() = 0` a été silencieusement
 *       perdue (le REVOKE tenait encore, donc la faille d'escalade n'était pas
 *       rouverte, mais la défense en profondeur l'était).
 *
 * Le test existant `settle-claim-rpc-hardening.test.ts` concatène TOUTES les
 * migrations et vérifie qu'un motif apparaît *quelque part* : il ne peut pas
 * voir qu'une migration ULTÉRIEURE a régressé l'état. Ce test-ci modélise
 * l'état FINAL en rejouant les migrations DANS L'ORDRE :
 *
 *   - `CREATE OR REPLACE FUNCTION` d'une fonction de trigger → (re)définie,
 *     et ses privilèges par défaut sont RÉINITIALISÉS (donc « non révoquée ») ;
 *   - un balayage générique (DO block `prorettype = 'trigger'`) révoque toutes
 *     les fonctions de trigger définies jusqu'ici ;
 *   - un `REVOKE ... ON FUNCTION public.X` explicite révoque X.
 *
 * Invariant final : AUCUNE fonction de trigger SECURITY DEFINER ne doit rester
 * exécutable par anon/authenticated, et `settle_invitation_claim` doit porter
 * la garde `pg_trigger_depth()` dans sa DERNIÈRE définition.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "fs";
import { resolve } from "path";

const migrationsDir = resolve(__dirname, "../../../supabase/migrations");

interface Event {
  kind: "create" | "revoke" | "sweep";
  name?: string;
  securityDefiner?: boolean;
  body?: string;
}

/** Rejoue les migrations dans l'ordre et produit la suite d'événements. */
function events(): Event[] {
  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();
  const out: Event[] = [];

  // Motifs ordonnés ; on prend toujours l'occurrence la plus à gauche.
  const create =
    /create\s+or\s+replace\s+function\s+(?:public\.)?"?(\w+)"?\s*\(/gi;
  const revokeNamed =
    /revoke\s+(?:all|execute)\s+on\s+function\s+(?:public\.)?"?(\w+)"?\s*\(/gi;
  const sweep = /revoke\s+execute\s+on\s+function\s+%s\s+from/gi;

  for (const file of files) {
    const src = readFileSync(resolve(migrationsDir, file), "utf8");

    const found: { pos: number; ev: Event }[] = [];
    for (const m of src.matchAll(create)) {
      // Le corps utile (returns + security definer) suit immédiatement.
      const body = src.slice(m.index! + m[0].length, m.index! + m[0].length + 800);
      const head = body.slice(0, body.search(/create\s+or\s+replace\s+function/i) + 1 || body.length);
      found.push({
        pos: m.index!,
        ev: {
          kind: "create",
          name: m[1].toLowerCase(),
          securityDefiner: /security\s+definer/i.test(head),
          body: head,
        },
      });
    }
    for (const m of src.matchAll(revokeNamed)) {
      found.push({
        pos: m.index!,
        ev: { kind: "revoke", name: m[1].toLowerCase() },
      });
    }
    for (const m of src.matchAll(sweep)) {
      found.push({ pos: m.index!, ev: { kind: "sweep" } });
    }

    found.sort((a, b) => a.pos - b.pos);
    out.push(...found.map((f) => f.ev));
  }
  return out;
}

/** Fonctions de trigger définies + état « révoquée » + corps final. */
function finalState() {
  const triggers = new Map<string, { securityDefiner: boolean; revoked: boolean }>();
  let settleBody = "";

  for (const ev of events()) {
    if (ev.kind === "create") {
      const isTrigger = /returns\s+trigger/i.test(ev.body ?? "");
      if (isTrigger) {
        // Une redéfinition réinitialise les privilèges par défaut.
        triggers.set(ev.name!, {
          securityDefiner: ev.securityDefiner ?? false,
          revoked: false,
        });
      }
      if (ev.name === "settle_invitation_claim") settleBody = ev.body ?? "";
    } else if (ev.kind === "sweep") {
      for (const t of triggers.values()) t.revoked = true;
    } else if (ev.kind === "revoke") {
      const t = triggers.get(ev.name!);
      if (t) t.revoked = true;
    }
  }
  return { triggers, settleBody };
}

describe("R115 — surface RPC des fonctions de trigger", () => {
  const { triggers, settleBody } = finalState();

  it("l'inventaire n'est pas vide (sinon le test serait vide de sens)", () => {
    expect(triggers.size).toBeGreaterThan(3);
  });

  it("aucune fonction de trigger SECURITY DEFINER n'est exécutable par anon/authenticated", () => {
    const exposed = [...triggers.entries()]
      .filter(([, v]) => v.securityDefiner && !v.revoked)
      .map(([k]) => k);
    expect(
      exposed,
      `fonctions de trigger SECURITY DEFINER non révoquées : ${exposed.join(", ")}`,
    ).toEqual([]);
  });

  it("les fonctions denorm_* (créées après le balayage R103) sont bien révoquées", () => {
    for (const name of ["denorm_child_org_id", "denorm_cascade_org_id"]) {
      const t = triggers.get(name);
      expect(t, `${name} doit exister`).toBeDefined();
      expect(t!.securityDefiner).toBe(true);
      expect(t!.revoked, `${name} doit être révoquée`).toBe(true);
    }
  });

  it("settle_invitation_claim conserve la garde pg_trigger_depth() (R103)", () => {
    expect(settleBody).toMatch(/pg_trigger_depth\(\)\s*=\s*0/);
    expect(settleBody).toMatch(/RAISE\s+EXCEPTION/i);
  });
});
