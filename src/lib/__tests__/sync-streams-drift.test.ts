/**
 * Garde anti-dérive — streams PowerSync à la demande (Phase 9).
 *
 * `src/lib/powersync/index.ts` déclare `ON_DEMAND_STREAMS` : les streams que
 * le client doit ouvrir EXPLICITEMENT (`db.syncStream(name).subscribe()`),
 * car `auto_subscribe: false` côté `sync-config.yaml`.
 *
 * Si les deux listes divergent, une table reste silencieusement vide :
 *   - stream `auto_subscribe: false` absent de `ON_DEMAND_STREAMS` → jamais
 *     ouvert par le client (ex. `organizations` vide → « Mes comptes » vide) ;
 *   - entrée de `ON_DEMAND_STREAMS` absente du YAML → `subscribe()` échoue.
 *
 * Ce test verrouille l'égalité des deux ensembles. Il ne remplace pas le
 * déploiement PowerSync (escalade E1) : il garantit la cohérence du dépôt.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { describe, it, expect } from "vitest";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "../../..");

/** Streams `auto_subscribe: false` déclarés dans sync-config.yaml. */
function onDemandStreamsFromYaml(): string[] {
  const yaml = readFileSync(resolve(repoRoot, "powersync/sync-config.yaml"), "utf8");
  const body = yaml.slice(yaml.indexOf("streams:"));
  const blocks = body.split(/\n(?= {2}[a-z_]+:\n)/);
  const out: string[] = [];
  for (const b of blocks) {
    const name = b.match(/^ {2}([a-z_]+):\n/);
    if (name && /auto_subscribe:\s*false/.test(b)) out.push(name[1]);
  }
  return out.sort();
}

/** `ON_DEMAND_STREAMS` déclaré dans src/lib/powersync/index.ts. */
function onDemandStreamsFromClient(): string[] {
  const src = readFileSync(
    resolve(repoRoot, "src/lib/powersync/index.ts"),
    "utf8",
  );
  const block = src.match(/ON_DEMAND_STREAMS\s*=\s*\[([\s\S]*?)\]/);
  if (!block) throw new Error("ON_DEMAND_STREAMS introuvable");
  const names = [...block[1].matchAll(/"([a-z_]+)"/g)].map((m) => m[1]);
  return names.sort();
}

describe("Phase 9 — ON_DEMAND_STREAMS ↔ sync-config.yaml", () => {
  it("les deux ensembles coïncident exactement", () => {
    const yaml = onDemandStreamsFromYaml();
    const client = onDemandStreamsFromClient();
    expect(client, "streams auto_subscribe:false absents du client").toEqual(yaml);
  });

  it("la liste n'est pas vide (sinon le test serait vide de sens)", () => {
    expect(onDemandStreamsFromYaml().length).toBeGreaterThan(0);
  });
});
