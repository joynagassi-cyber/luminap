/**
 * Garde de robustesse — limite de paramètres PowerSync (PSYNC_S2305).
 *
 * Contexte : PowerSync refuse une synchronisation dont une sous-requête de
 * paramètre retourne plus de 1000 résultats (« Too many parameter query
 * results »). Le stream `org_administered` construit sa liste de paramètres
 * via `SELECT org_id FROM org_admins WHERE admin_profile_id = auth.user_id()`.
 * Sans filtre de statut, un compte ayant accumulé des grants vers des
 * organisations de test (cas mesuré : 1493 grants) franchit la limite et la
 * synchronisation ÉCHOUE ENTIÈREMENT — bannière « Synchronisation
 * indisponible » et aucune donnée ne descend.
 *
 * Un grant révoqué (`status = 'REVOKED'`) n'ouvre aucun droit : la RLS ne lit
 * que les grants ACTIVE, et l'UI retire déjà l'admin révoqué de la liste
 * (`CentralAdmin.handleRevoke`). La sous-requête de paramètre DOIT donc se
 * restreindre aux grants ACTIVE.
 *
 * Non-vacuité : ce test échoue si l'on retire le filtre `status = 'ACTIVE'`
 * de la sous-requête `org_admins` du stream `org_administered`.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { describe, it, expect } from "vitest";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "../../..");

function syncConfig(): string {
  return readFileSync(resolve(repoRoot, "powersync/sync-config.yaml"), "utf8");
}

/** Corps (indenté) du stream `name:` — jusqu'au prochain stream de même niveau. */
function streamBlock(yaml: string, name: string): string {
  const start = yaml.indexOf(`\n  ${name}:\n`);
  if (start < 0) throw new Error(`stream ${name} introuvable`);
  const rest = yaml.slice(start + 1);
  const next = rest.search(/\n {2}[a-z_]+:\n/);
  return next < 0 ? rest : rest.slice(0, next);
}

/**
 * Portion d'un stream à partir de la sous-requête `FROM org_admins` (jusqu'à
 * la fin du bloc). Le filtre de statut est porté par le `WHERE` de cette
 * sous-requête : le vérifier sur cette portion évite d'avoir à équilibrer les
 * parenthèses (les `auth.user_id()` internes trompent un `[^)]*`).
 * Renvoie null si le stream ne lit pas `org_admins`.
 */
function orgAdminsParamPortion(stream: string): string | null {
  const i = stream.indexOf("FROM org_admins");
  return i < 0 ? null : stream.slice(i);
}

/**
 * Streams qui utilisent `org_admins` comme SOUS-REQUÊTE DE PARAMÈTRE (et non
 * comme table principale synchronisée). C'est cette sous-requête qui alimente
 * la liste de paramètres PowerSync, donc celle qui doit être bornée.
 */
const PARAM_SUBQUERY_STREAMS = ["org_administered", "profiles"] as const;

describe("PowerSync — sous-requêtes de paramètre org_admins filtrées ACTIVE", () => {
  it("org_administered ne retient que les grants ACTIVE (anti PSYNC_S2305)", () => {
    const sub = orgAdminsParamPortion(streamBlock(syncConfig(), "org_administered"));
    expect(sub, "sous-requête org_admins attendue dans org_administered").not.toBeNull();
    expect(sub!).toMatch(/status\s*=\s*'ACTIVE'/);
  });

  it("chaque sous-requête de paramètre org_admins filtre un statut ACTIVE", () => {
    const yaml = syncConfig();
    const offenders = PARAM_SUBQUERY_STREAMS.filter((n) => {
      const sub = orgAdminsParamPortion(streamBlock(yaml, n));
      return sub === null || !/status\s*=\s*'ACTIVE'/.test(sub);
    });
    expect(offenders, `streams sans filtre ACTIVE : ${offenders.join(", ")}`).toEqual([]);
  });

  it("la garde n'est pas vide (au moins un stream inspecté)", () => {
    const yaml = syncConfig();
    const inspected = PARAM_SUBQUERY_STREAMS.filter(
      (n) => orgAdminsParamPortion(streamBlock(yaml, n)) !== null,
    );
    expect(inspected.length).toBeGreaterThan(0);
  });
});
