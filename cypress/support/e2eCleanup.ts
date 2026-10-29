/**
 * Cypress E2E — Auto-nettoyage des artefacts de test (P39).
 *
 * ## Défaut visé (classe, pas instance)
 *
 * La suite Cypress crée des données RÉELLES dans l'organisation de test
 * « Lumina Org E2E » (org-e2e) sans jamais les nettoyer. Mesure (2026-10-29) :
 *   * 84 groupes « Jeunesse … » (+ autant de `org_units`, `accounts`,
 *     `caisses` portant le même id) ;
 *   * 54 événements « Event Persist F5 » (persistence.cy.ts), plus des
 *     milliers de `CalEvent …` (performance-batch.cy.ts) et les événements
 *     « Culte de Noël … » / « Conférence … » / « Event Tasks … » ;
 *   * des membres « E2e… » (members.cy.ts) ;
 *   * des annexes « Annexe A/B … » (organisations, dont `PENDING`).
 * Chaque `cypress run` ajoute sa couche : la base de test ne converge pas,
 * les listes deviennent illisibles et les assertions dépendantes du volume
 * (listes tronquées à 50) deviennent instables.
 *
 * ## Principe
 *
 * Chaque spec devient auto-nettoyant via `cy.cleanupTestArtifacts(...)` :
 *   * il ARCHIVE (jamais de purge destructive) les entités qu'il a créées ;
 *   * il ne touche QUE les entités du run courant — par id suivi
 *     (`trackTestArtifact`) ET/OU par préfixe de nom unique au run
 *     (`Date.now()`), repli utilisé quand le test échoue avant d'avoir pu
 *     capturer l'id ;
 *   * le nettoyage est VOLONTAIREMENT NON FATAL : il s'exécute dans le
 *     contexte navigateur via `window.fetch`, entièrement enveloppé dans un
 *     `try/catch`, donc un échec (RLS, réseau, PowerSync indisponible) est
 *     LOGGÉ et n'échoue jamais le spec.
 *
 * ## Statuts d'archivage par table (alignés sur le modèle de l'app)
 *
 * | Table                | Statut terminal          | Source                       |
 * |----------------------|--------------------------|------------------------------|
 * | `groups`             | `ARCHIVED`               | `groups_status_check`        |
 * | `members`            | `ARCHIVED`               | `members_status_check`       |
 * | `organizations`      | `ARCHIVED`               | `organizations_status_check` |
 * | `form_definitions`   | `ARCHIVED`               | `form_definitions_status_check` |
 * | `events`             | `CANCELLED`              | `capabilities/lifecycle` (les |
 * |                      |                          | événements n'ont pas d'ARCHIVED) |
 * | `transactions`       | aucun (pas d'archivage)  | `transactions_status_check`  |
 *
 * Les transactions n'ont pas de statut d'archivage : seules les lignes
 * `DRAFT`/`PENDING` du run courant sont SUPPRIMÉES (jamais `APPROVED` — la
 * base refuse déjà la suppression d'une pièce approuvée, trigger
 * `prevent_approved_transaction_delete`).
 *
 * ## Limite documentée (E5 — réplique PowerSync)
 *
 * Si la réplique PowerSync ne se peuple pas (blocage d'auth R132/E5 :
 * `connected:false`), les écritures de test peuvent ne JAMAIS atteindre
 * Supabase. Dans ce cas `cleanupTestArtifacts` ne trouve rien à archiver :
 * c'est un no-op LOGGÉ, pas un échec — exactement le comportement voulu
 * (le nettoyage ne peut pas vérifier une écriture qui n'a pas eu lieu).
 */
/* eslint-disable @typescript-eslint/no-namespace */
declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Archive (ou, pour les transactions non approuvées, supprime) les
       * entités créées par le run courant. Non fatal : ne fait jamais échouer
       * le spec. À appeler dans un hook `after()`.
       */
      cleanupTestArtifacts(options?: CleanupOptions): Chainable<void>;
    }
  }
}

/** Familles d'artefacts nettoyables. */
export type CleanupKind =
  | "groups"
  | "events"
  | "organizations"
  | "members"
  | "formDefinitions"
  | "formSubmissions"
  | "transactions"
  | "orgUnits"
  | "accounts"
  | "caisses"
  | "customFields";

export interface CleanupOptions {
  /**
   * Ids créés par le run courant, par famille. Prioritaire sur les préfixes.
   * Alimentés par `trackTestArtifact()` et/ou passés directement.
   */
  ids?: Partial<Record<CleanupKind, string[]>>;
  /** Préfixe(s) de nom des groupes créés par ce run (« Jeunesse »). */
  groupNamePrefix?: string | string[];
  /** Préfixe(s) de nom des événements créés par ce run. */
  eventNamePrefix?: string | string[];
  /** Préfixe(s) de nom des organisations (annexes) créées par ce run. */
  orgNamePrefix?: string | string[];
  /** Préfixe(s) de `last_name` des membres créés par ce run. */
  memberLastNamePrefix?: string | string[];
  /** Préfixe(s) de nom des formulaires créés par ce run (→ ARCHIVED). */
  formNamePrefix?: string | string[];
  /**
   * Nom(s) exact(s)/préfixe(s) du formulaire dont on veut purger les
   * soumissions du run courant. Les soumissions n'ont pas de statut
   * d'archivage : elles sont SUPPRIMÉES, uniquement pour le(s) formulaire(s)
   * désigné(s) (fixture e2e partagée — cf. forms-v2.cy.ts).
   */
  formSubmissionFormNamePrefix?: string | string[];
  /** Préfixe(s) de description des transactions créées par ce run. */
  transactionDescriptionPrefix?: string | string[];
  /** Préfixe(s) de `name` des `org_units` créés par ce run. */
  orgUnitNamePrefix?: string | string[];
  /** Préfixe(s) de `name` des `accounts` créés par ce run. */
  accountNamePrefix?: string | string[];
  /** Préfixe(s) de `name` des `caisses` créés par ce run. */
  caisseNamePrefix?: string | string[];
  /** Préfixe(s) de `label` des `custom_field_definitions` créés par ce run. */
  customFieldLabelPrefix?: string | string[];
  /**
   * Borne temporelle stricte : ne nettoie que les entités créées APRÈS cet
   * instant (ISO 8601). Garantit « uniquement le run courant » même quand un
   * préfixe de nom n'est pas unique (p.ex. suffixe `Date.now()` sur 6 chiffres,
   * qui se répète toutes les ~16,7 min, ou nom déterministe).
   */
  sinceIso?: string;
}

const REASON = "Nettoyage automatique — spec Cypress E2E (P39)";

// ── Registre d'ids (état module = un par fichier de spec) ────────────────────

const EMPTY = (): Record<CleanupKind, Set<string>> => ({
  groups: new Set(),
  events: new Set(),
  organizations: new Set(),
  members: new Set(),
  formDefinitions: new Set(),
  formSubmissions: new Set(),
  transactions: new Set(),
  orgUnits: new Set(),
  accounts: new Set(),
  caisses: new Set(),
  customFields: new Set(),
});

const tracked = EMPTY();

/** Enregistre un id créé par le run courant (à appeler dès qu'il est connu). */
export function trackTestArtifact(kind: CleanupKind, id: string | null | undefined): void {
  if (id) tracked[kind].add(id);
}

/** Vide le registre (le prochain spec repart d'un état propre). */
export function resetTrackedArtifacts(): void {
  for (const kind of Object.keys(tracked) as CleanupKind[]) tracked[kind].clear();
}

// ── Métadonnées par famille ─────────────────────────────────────────────────

interface TableMeta {
  table: string;
  /** Colonne utilisée pour le repli par préfixe. */
  column: string;
  /** Corps d'archivage (statut terminal) — absent ⇒ suppression ciblée. */
  archive?: () => Record<string, unknown>;
  /** Statut(s) terminal(aux) à exclure des replis (déjà nettoyés). */
  terminalFilter?: string;
  /** Colonne temporelle pour la borne `sinceIso`. */
  sinceColumn: string;
}

const TABLES: Record<CleanupKind, TableMeta> = {
  groups: {
    table: "groups",
    column: "name",
    sinceColumn: "created_at",
    archive: () => ({
      status: "ARCHIVED",
      archived_at: new Date().toISOString(),
      archive_reason: REASON,
    }),
    terminalFilter: "status=neq.ARCHIVED",
  },
  members: {
    table: "members",
    column: "last_name",
    sinceColumn: "created_at",
    archive: () => ({
      status: "ARCHIVED",
      archived_at: new Date().toISOString(),
      archive_reason: REASON,
    }),
    terminalFilter: "status=neq.ARCHIVED",
  },
  organizations: {
    table: "organizations",
    column: "name",
    sinceColumn: "created_at",
    archive: () => ({
      status: "ARCHIVED",
      archived_at: new Date().toISOString(),
      archive_reason: REASON,
    }),
    terminalFilter: "status=neq.ARCHIVED",
  },
  formDefinitions: {
    table: "form_definitions",
    column: "name",
    sinceColumn: "created_at",
    archive: () => ({ status: "ARCHIVED" }),
    terminalFilter: "status=neq.ARCHIVED",
  },
  events: {
    table: "events",
    column: "name",
    sinceColumn: "created_at",
    // Les événements n'ont pas de statut ARCHIVED : leur statut terminal est
    // CANCELLED (cf. capabilities/lifecycle — « Event uses CANCELLED instead
    // of ARCHIVED »).
    archive: () => ({ status: "CANCELLED" }),
    terminalFilter: "status=neq.CANCELLED",
  },
  transactions: {
    table: "transactions",
    column: "description",
    sinceColumn: "created_at",
    // Pas d'archivage : suppression ciblée, jamais APPROVED.
    terminalFilter: "status=in.(DRAFT,PENDING)",
  },
  formSubmissions: {
    table: "form_submissions",
    column: "form_definition_id",
    sinceColumn: "created_at",
    // Pas d'archivage : suppression ciblée par formulaire (fixture e2e).
    // Le repli par préfixe est traité à part (le préfixe désigne un NOM de
    // formulaire, pas un id) — voir `cleanupFormSubmissionsByFormName`.
  },
  orgUnits: {
    table: "org_units",
    column: "name",
    sinceColumn: "created_at",
    // Pas d'archivage : `org_units.is_active` est un drapeau 0/1, pas un
    // statut. Ces lignes sont créées par le spec cloud-sync (POST REST
    // direct) ; suppression ciblée du run courant.
  },
  accounts: {
    table: "accounts",
    column: "name",
    sinceColumn: "created_at",
    // `accounts` a un statut ACTIVE/ARCHIVED : on archive (jamais de
    // suppression destructive).
    archive: () => ({
      status: "ARCHIVED",
      archived_at: new Date().toISOString(),
      archive_reason: REASON,
    }),
    terminalFilter: "status=neq.ARCHIVED",
  },
  caisses: {
    table: "caisses",
    column: "name",
    sinceColumn: "created_at",
    // Pas de statut d'archivage : suppression ciblée du run courant.
  },
  customFields: {
    table: "custom_field_definitions",
    column: "label",
    sinceColumn: "created_at",
    // Pas de statut d'archivage : suppression ciblée du run courant.
  },
};

const PREFIX_OPTION: Partial<Record<CleanupKind, keyof CleanupOptions>> = {
  groups: "groupNamePrefix",
  events: "eventNamePrefix",
  organizations: "orgNamePrefix",
  members: "memberLastNamePrefix",
  formDefinitions: "formNamePrefix",
  transactions: "transactionDescriptionPrefix",
  orgUnits: "orgUnitNamePrefix",
  accounts: "accountNamePrefix",
  caisses: "caisseNamePrefix",
  customFields: "customFieldLabelPrefix",
};

// ── Exécution du nettoyage (contexte navigateur, non fatal) ─────────────────

function asArray(value: string | string[] | undefined): string[] {
  if (value === undefined || value === null) return [];
  // Un préfixe vide produirait `like.*` (toute la table) : on rejette les
  // chaînes vides/blanches. Le repli par préfixe est best-effort — jamais un
  // balayage global.
  return (Array.isArray(value) ? value : [value])
    .map((s) => (s ?? "").trim())
    .filter((s) => s.length > 0);
}

function supaUrl(): string {
  return (
    (Cypress.expose("SUPABASE_URL") as string) ||
    "https://hhgovvrnalibhgpakswi.supabase.co"
  );
}

function anonKey(): string {
  return Cypress.expose("SUPABASE_ANON_KEY") as string;
}

/** Résout un JWT réel : session locale, sinon login REST (motif cloud-sync). */
async function resolveToken(win: Window): Promise<string | null> {
  try {
    const ls = win.localStorage;
    const sbKey = Object.keys(ls).find((k) => /-auth-token$/.test(k));
    if (sbKey) {
      const token = JSON.parse(ls.getItem(sbKey) ?? "{}")?.access_token;
      if (typeof token === "string" && token) return token;
    }
  } catch {
    /* session illisible — on tente le login REST */
  }
  try {
    const creds = Cypress.expose("orgCreds") as
      | { email?: string; password?: string }
      | undefined;
    const email =
      creds?.email || (Cypress.expose("ORG_EMAIL") as string) || "";
    const password =
      creds?.password || (Cypress.expose("ORG_PASSWORD") as string) || "";
    if (!email || !password) return null;
    const res = await win.fetch(`${supaUrl()}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: {
        apikey: anonKey(),
        Authorization: `Bearer ${anonKey()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json().catch(() => null);
    return data?.access_token ?? null;
  } catch {
    return null;
  }
}

/** Org courante du compte (RLS scope déjà, mais on cible explicitement). */
async function resolveOrgId(win: Window, token: string): Promise<string | null> {
  try {
    const res = await win.fetch(
      `${supaUrl()}/rest/v1/profiles?select=org_id&limit=1`,
      { headers: { apikey: anonKey(), Authorization: `Bearer ${token}` } },
    );
    const rows = await res.json().catch(() => null);
    return Array.isArray(rows) ? rows[0]?.org_id ?? null : null;
  } catch {
    return null;
  }
}

interface FetchResult {
  ok: boolean;
  status: number;
  data: unknown;
}

async function rest(
  win: Window,
  method: string,
  path: string,
  token: string,
  body?: Record<string, unknown>,
): Promise<FetchResult> {
  const res = await win.fetch(`${supaUrl()}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: anonKey(),
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    /* réponse sans corps (return=minimal) */
  }
  return { ok: res.ok, status: res.status, data };
}

/** Nettoie une famille : d'abord par id (exact), puis par préfixe (repli). */
async function cleanupKind(
  win: Window,
  kind: CleanupKind,
  token: string,
  orgId: string | null,
  ids: string[],
  prefixes: string[],
  sinceIso?: string,
): Promise<number> {
  const meta = TABLES[kind];
  let touched = 0;
  const scoped = ["groups", "events", "members", "transactions", "formSubmissions"].includes(
    kind,
  );
  const orgFilter = scoped && orgId ? `&org_id=eq.${encodeURIComponent(orgId)}` : "";
  // Borne temporelle stricte : n'affecte QUE le run courant.
  const sinceFilter = sinceIso
    ? `&${meta.sinceColumn}=gte.${encodeURIComponent(sinceIso)}`
    : "";

  const apply = async (id: string): Promise<void> => {
    const guard = meta.terminalFilter
      ? `&${meta.terminalFilter}`
      : "";
    const url = `${meta.table}?id=eq.${encodeURIComponent(id)}${guard}${sinceFilter}${orgFilter}`;
    if (meta.archive) {
      const res = await rest(win, "PATCH", url, token, meta.archive());
      if (res.ok) touched += 1;
    } else {
      const res = await rest(win, "DELETE", url, token);
      if (res.ok) touched += 1;
    }
  };

  // 1. Ids suivis (chemin exact).
  for (const id of ids) {
    try {
      await apply(id);
    } catch {
      /* id isolé : on continue */
    }
  }

  // 2. Repli par préfixe de nom (le test a échoué avant de capturer l'id).
  for (const prefix of prefixes) {
    try {
      const guard = meta.terminalFilter ? `&${meta.terminalFilter}` : "";
      const filter = `${meta.column}=like.${encodeURIComponent(prefix)}*`;
      const list = await rest(
        win,
        "GET",
        `${meta.table}?select=id&${filter}${guard}${sinceFilter}${orgFilter}`,
        token,
      );
      const rows = Array.isArray(list.data) ? (list.data as Array<{ id?: string }>) : [];
      for (const row of rows) {
        if (row?.id) await apply(row.id);
      }
    } catch {
      /* préfixe isolé : on continue */
    }
  }

  return touched;
}

/**
 * Purge les soumissions de formulaire du run courant.
 *
 * `form_submissions` n'a pas de statut d'archivage et ne porte pas le nom du
 * formulaire : on résout d'abord les `form_definitions` par nom, puis on
 * supprime les soumissions rattachées à ces ids. Limité aux formulaires
 * désignés (fixture e2e partagée) — jamais un balayage global.
 */
async function cleanupFormSubmissionsByFormName(
  win: Window,
  token: string,
  orgId: string | null,
  formNamePrefixes: string[],
  sinceIso?: string,
): Promise<number> {
  let touched = 0;
  const orgFilter = orgId ? `&org_id=eq.${encodeURIComponent(orgId)}` : "";
  const sinceFilter = sinceIso
    ? `&created_at=gte.${encodeURIComponent(sinceIso)}`
    : "";
  for (const prefix of formNamePrefixes) {
    try {
      const defs = await rest(
        win,
        "GET",
        `form_definitions?select=id&name=like.${encodeURIComponent(prefix)}*${orgFilter}`,
        token,
      );
      const rows = Array.isArray(defs.data) ? (defs.data as Array<{ id?: string }>) : [];
      for (const row of rows) {
        if (!row?.id) continue;
        const res = await rest(
          win,
          "DELETE",
          `form_submissions?form_definition_id=eq.${encodeURIComponent(row.id)}${sinceFilter}${orgFilter}`,
          token,
        );
        if (res.ok) touched += 1;
      }
    } catch {
      /* préfixe isolé : on continue */
    }
  }
  return touched;
}

async function runCleanup(win: Window, options: CleanupOptions): Promise<void> {
  const token = await resolveToken(win);
  if (!token) {
    console.info(
      "[cleanupTestArtifacts] aucune session Supabase — nettoyage ignoré (non fatal)",
    );
    return;
  }
  const orgId = await resolveOrgId(win, token);

  const kinds = Object.keys(TABLES) as CleanupKind[];
  const summary: string[] = [];
  for (const kind of kinds) {
    const ids = [
      ...tracked[kind],
      ...(options.ids?.[kind] ?? []),
    ];
    const optionKey = PREFIX_OPTION[kind];
    const prefixes = asArray(
      optionKey ? (options[optionKey] as string | string[] | undefined) : undefined,
    );
    if (ids.length === 0 && prefixes.length === 0) continue;
    try {
      const touched = await cleanupKind(
        win,
        kind,
        token,
        orgId,
        ids,
        prefixes,
        options.sinceIso,
      );
      summary.push(`${kind}: ${touched}`);
    } catch (e) {
      console.info(`[cleanupTestArtifacts] ${kind} ignoré (non fatal)`, e);
    }
  }

  // Soumissions de formulaire : purge ciblée par nom de formulaire.
  const formNamePrefixes = asArray(options.formSubmissionFormNamePrefix);
  if (formNamePrefixes.length > 0) {
    try {
      const touched = await cleanupFormSubmissionsByFormName(
        win,
        token,
        orgId,
        formNamePrefixes,
        options.sinceIso,
      );
      summary.push(`formSubmissions: ${touched}`);
    } catch (e) {
      console.info(
        "[cleanupTestArtifacts] formSubmissions ignoré (non fatal)",
        e,
      );
    }
  }

  console.info(
    `[cleanupTestArtifacts] terminé — ${summary.join(", ") || "rien à nettoyer"}`,
  );
}

// ── Commande Cypress ────────────────────────────────────────────────────────

Cypress.Commands.add("cleanupTestArtifacts", (options: CleanupOptions = {}) => {
  // Tout s'exécute dans le contexte NAVIGATEUR via `window.fetch`, enveloppé
  // dans un try/catch : contrairement à `cy.request`, une erreur réseau ou RLS
  // ne fait pas échouer le spec (exigence « non fatal »).
  cy.window({ log: false }).then(async (win) => {
    try {
      await runCleanup(win, options);
    } catch (e) {
      console.info("[cleanupTestArtifacts] échec global ignoré (non fatal)", e);
    } finally {
      resetTrackedArtifacts();
    }
  });
});

export {};
