// @vitest-environment node
/**
 * NeverBreak #6 — garde statique : « AuditLog sur toute mutation ».
 *
 * Le contrat (`docs/agent/PROPOSALS.md`, invariant NeverBreak #6) exige qu'une
 * mutation laisse une trace d'audit consultable dans `/trace`. Défaut mesuré :
 * seuls `transaction-service`, `reporting`, `formSystem` et `customFields`
 * écrivaient une entrée ; `member-service`, `cotisation-service`,
 * `versement-service`, `group-lifecycle`, `event-service` et le transfert de
 * propriété n'en écrivaient AUCUNE (grep `writeAudit` = 0).
 *
 * Cette garde dérive la liste des modules « à auditer » DU SOURCE (patron
 * `r52-readiness-guard` : pas de liste recopiée) : un module qui ÉCRIT en base
 * (signal `executeWrite`, `INSERT/UPDATE/DELETE`, ou un writer `*PS`) doit soit
 * appeler `writeAudit`, soit déléguer à un writer déjà audité.
 *
 * NON-VACUITÉ : le validateur est exercé sur une source MUTÉE EN MÉMOIRE
 * (retrait de l'appel `writeAudit`) et doit alors échouer — la garde n'est pas
 * un `expect(true)` déguisé.
 */
import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const LIB = join(process.cwd(), "src", "lib");

/**
 * Signal d'ÉCRITURE en base. Dérivé du code, pas d'une liste d'entités : tout
 * accès qui modifie une ligne (SQL direct ou writer `*PS` du data layer).
 */
const WRITE_SIGNAL =
  /\bexecuteWrite\s*\(|INSERT\s+INTO|UPDATE\s+[a-z_]+\s+SET|DELETE\s+FROM|\b(?:add|update|delete|create|remove|mark|set|persist|clear)[A-Z]\w*PS\s*\(/;

/**
 * Socle d'INFRASTRUCTURE : ces modules portent des writers bas-niveau, pas des
 * cas d'usage métier. Leur traçabilité est assurée par l'appelant métier (qui
 * appelle `writeAudit` après les avoir invoqués) — cf. chaque justification.
 */
const INFRA_ALLOWLIST: Record<string, string> = {
  "dataLayer.ts": "couche d'écriture bas-niveau (les writers `*PS` bruts)",
  "orgSettings.ts": "socle de réglages : tracé par l'appelant (transfert, gel)",
  "receipts.ts": "pièces jointes : tracées côté transaction",
  "orgAdmin.ts": "rôle/capacités : tracé par le transfert de propriété (PR14)",
};

/**
 * Modules dont le signal d'écriture est INDIRECT (ils délèguent) mais que le
 * contrat NeverBreak #6 nomme explicitement : ils DOIVENT être couverts.
 */
const REQUIRED_AUDIT_MODULES = [
  "member-service.ts",
  "cotisation-service.ts",
  "versement-service.ts",
  "event-service.ts",
  "group-lifecycle.ts",
  "ownershipTransfer.ts",
  "transaction-service.ts",
];

/** Un module ÉCRIT une entrée d'audit s'il touche `writeAudit`/le repo. */
function writesAudit(src: string): boolean {
  return /\bwriteAudit\s*\(|auditLogRepo\.write\s*\(/.test(src);
}

/**
 * Un module DÉLÈGUE à un writer audité s'il appelle une fonction exportée par
 * un AUTRE module qui écrit l'audit (ex. une page qui appelle
 * `persistCreateMember`). On exclut les writers définis dans le module courant :
 * un module qui définit un writer audité ne se couvre pas lui-même.
 */
function delegatesToAuditedWriter(
  src: string,
  file: string,
  auditedWriters: Map<string, string>,
): boolean {
  for (const [name, definingFile] of auditedWriters) {
    if (definingFile === file) continue;
    if (new RegExp(`\\b${name}\\s*\\(`).test(src)) return true;
  }
  return false;
}

/** Un module est couvert s'il écrit l'audit OU délègue à un writer audité. */
function isCovered(
  src: string,
  file: string,
  auditedWriters: Map<string, string>,
): boolean {
  return writesAudit(src) || delegatesToAuditedWriter(src, file, auditedWriters);
}

function libFiles(): string[] {
  return readdirSync(LIB).filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts"));
}

function readLib(file: string): string {
  return readFileSync(join(LIB, file), "utf8");
}

/** Modules de mutation métier à auditer (dérivés du source). */
function mutationModules(): string[] {
  return libFiles()
    .filter((f) => !(f in INFRA_ALLOWLIST))
    .filter((f) => WRITE_SIGNAL.test(readLib(f)));
}

/**
 * Noms des fonctions de PERSISTANCE exportées par les modules qui écrivent
 * l'audit → fichier qui les définit. On ne retient que les verbes d'écriture
 * (`persist*`, `apply*`, `create*`, `update*`…) : les helpers purs exportés par
 * un module audité (ex. `resolveAuditActor`) ne constituent PAS une délégation.
 */
const WRITER_NAME = /^(persist|apply|create|update|delete|archive|restore|save|remove|add|mark|audit)/;

function auditedWriterNames(): Map<string, string> {
  const names = new Map<string, string>();
  for (const file of libFiles()) {
    const src = readLib(file);
    if (!writesAudit(src)) continue;
    for (const m of src.matchAll(/export (?:async )?function (\w+)\s*\(/g)) {
      if (WRITER_NAME.test(m[1])) names.set(m[1], file);
    }
  }
  return names;
}

const AUDITED_WRITERS = auditedWriterNames();
const MUTATION_MODULES = mutationModules();

describe("NeverBreak #6 — toute mutation laisse une trace d'audit", () => {
  it("la dérivation trouve bien des modules de mutation (non-vacuité)", () => {
    // Si ce seuil tombait, la garde serait vide et ne prouverait rien.
    expect(MUTATION_MODULES.length).toBeGreaterThanOrEqual(8);
    // Et la délégation doit avoir de quoi s'appuyer.
    expect(AUDITED_WRITERS.size).toBeGreaterThanOrEqual(5);
  });

  it("chaque module de mutation écrit (ou délègue) une entrée d'audit", () => {
    const offenders = MUTATION_MODULES.filter(
      (f) => !isCovered(readLib(f), f, AUDITED_WRITERS),
    );
    expect(
      offenders,
      "Modules qui mutent la base SANS trace d'audit (NeverBreak #6) :\n" +
        offenders.map((f) => `  - src/lib/${f}`).join("\n") +
        "\nAppeler writeAudit(...) dans la fonction de persistance, ou déléguer\n" +
        "à un writer déjà audité, ou justifier dans INFRA_ALLOWLIST.",
    ).toEqual([]);
  });

  it("les modules nommés par le contrat sont couverts (liste explicite)", () => {
    const offenders = REQUIRED_AUDIT_MODULES.filter(
      (f) => !isCovered(readLib(f), f, AUDITED_WRITERS),
    );
    expect(
      offenders,
      `Modules du contrat NeverBreak #6 sans audit : ${offenders.join(", ")}`,
    ).toEqual([]);
  });

  it("les exceptions d'infrastructure existent et sont bien des modules d'écriture", () => {
    for (const file of Object.keys(INFRA_ALLOWLIST)) {
      expect(libFiles(), `exception déclarée mais absente : ${file}`).toContain(file);
      expect(
        WRITE_SIGNAL.test(readLib(file)),
        `${file} n'écrit plus rien → retirer l'exception (sinon elle devient morte)`,
      ).toBe(true);
    }
  });

  // ─── Non-vacuité : le validateur échoue sur une source MUTÉE EN MÉMOIRE ───
  it("NON-VACUITÉ : retirer l'appel `writeAudit` fait échouer le validateur", () => {
    const real = readLib("versement-service.ts");
    expect(isCovered(real, "versement-service.ts", AUDITED_WRITERS)).toBe(true);

    // Même source, appel d'audit neutralisé (en mémoire — rien sur disque).
    const mutated = real.replace(/\bwriteAudit\s*\(/, "writeAuditDisabled(");
    expect(writesAudit(mutated)).toBe(false);
    expect(isCovered(mutated, "versement-service.ts", AUDITED_WRITERS)).toBe(false);
  });

  it("NON-VACUITÉ : la délégation est réellement détectée (sinon couverture factice)", () => {
    // Un module purement synthétique sans audit ni délégation échoue.
    const bare = `export async function doWrite() { await executeWrite("UPDATE t SET a = ?", [1]); }`;
    expect(WRITE_SIGNAL.test(bare)).toBe(true);
    expect(isCovered(bare, "bare.ts", AUDITED_WRITERS)).toBe(false);

    // Et une délégation vers un writer audité d'un AUTRE module est reconnue.
    const delegating = `export async function save() { await persistCreateMember(m); }`;
    expect(writesAudit(delegating)).toBe(false);
    expect(
      delegatesToAuditedWriter(delegating, "some-other.ts", AUDITED_WRITERS),
    ).toBe(true);

    // Un module qui DÉFINIT le writer audité ne se couvre pas par lui-même.
    const selfDefined = readLib("member-service.ts");
    expect(
      delegatesToAuditedWriter(
        selfDefined.replace(/\bwriteAudit\s*\(/g, "noop("),
        "member-service.ts",
        AUDITED_WRITERS,
      ),
    ).toBe(false);
  });
});
