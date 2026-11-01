/**
 * Error reporter — capture structurée + remontée automatique sur GitHub Issues.
 *
 * Ce module est le CŒUR de l'observabilité « auto-réparante » : chaque incident
 * intercepté (crash, erreur métier, base de données, synchronisation,
 * performance) produit un rapport CONTEXTUEL et ULTRA-DÉTAILLÉ, puis — après
 * déduplication / rate-limiting — une GitHub Issue est créée automatiquement
 * sur le dépôt cible avec le label déclencheur `openhands`, afin que
 * l'automatisation cloud OpenHands puisse la corriger sans intervention.
 *
 * Chaîne : capture (clientErrors / ErrorBoundary / PowerSync / perfMonitor)
 *   → `reportError` (dédup en mémoire + persistance bornée)
 *   → file d'attente locale (survit au hors-ligne / rechargement)
 *   → `flushPendingReports` (appel de l'edge function `report-error`)
 *   → GitHub Issue (label `openhands`).
 *
 * Politique PII (CRITIQUE) : le dépôt `joynagassi-cyber/luminap` est PUBLIC —
 * tout ce qui entre dans une Issue est publié. Le rapport ne contient donc
 * JAMAIS d'e-mail, de nom, d'identifiant utilisateur ou d'organisation, ni de
 * contenu utilisateur libre. Le texte est expurgé (`redact`) puis neutralisé
 * (`normalizeText`) et les identités connues sont retirées par VALEUR.
 */
import { redact } from "@/lib/clientErrors";
import { normalizeText } from "@/lib/sanitize";
import { isFeatureEnabled } from "@/lib/featureFlags";
import { pushBreadcrumb, getBreadcrumbs } from "./breadcrumbs";
import type { Breadcrumb } from "./breadcrumbs";

/** Type d'incident — vocabulaire fermé (pilote le titre + les tags de l'Issue). */
export type AppErrorType =
  | "crash"
  | "functional"
  | "database"
  | "sync"
  | "performance";

/** Drapeau (kill switch) : absent ⇒ actif (fail-open). */
export const ERROR_REPORTING_FLAG = "error-reporting";

/** Clé de la file d'attente locale (bornée, jamais de PII). */
export const ERROR_QUEUE_STORAGE_KEY = "lumina-error-reports-queue";

/** Clé des signatures récemment signalées (anti-spam inter-rechargements). */
export const ERROR_SIGNATURES_STORAGE_KEY = "lumina-error-signatures";

/** Nombre maximal de rapports conservés en file (borne du stockage). */
export const MAX_QUEUED_REPORTS = 25;

/** Fenêtre de déduplication : la MÊME erreur n'est pas re-signalée avant ce délai. */
export const DEDUPE_WINDOW_MS = 60_000;

/** Nombre maximal de rapports envoyés par session (garde-fou anti-tempête). */
export const MAX_REPORTS_PER_SESSION = 20;

/** Nombre d'actions du fil d'Ariane joints au rapport. */
export const BREADCRUMBS_IN_REPORT = 5;

const MAX_MESSAGE_LENGTH = 500;
const MAX_STACK_LENGTH = 4000;
const MAX_COMPONENT_STACK_LENGTH = 2000;

/** Dépôt GitHub cible (transmis à l'edge function, qui le valide par allowlist). */
export const TARGET_REPO = "joynagassi-cyber/luminap";

/** Label déclencheur lu par l'automatisation OpenHands. */
export const TRIGGER_LABEL = "openhands";

/**
 * Environnement d'exécution, dérivé du mode Vite (comme `sentry.ts` /
 * `reportProblem.ts`). Constante de module : le rapport reste déterministe.
 */
export const ENVIRONMENT: string =
  (import.meta.env.VITE_SENTRY_ENV as string | undefined) ??
  (import.meta.env.MODE === "production" ? "production" : "development");

export interface ErrorReportSession {
  authenticated: boolean;
  /** Rôle applicatif (jamais l'identité). */
  role: string | null;
}

export interface ErrorReport {
  kind: "lumina-error-report";
  /** Signature stable (dédup client + serveur). */
  signature: string;
  type: AppErrorType;
  message: string;
  stack?: string;
  componentStack?: string;
  /** Origine de la capture (onerror, unhandledrejection, boundary, sync…). */
  source: string;
  generatedAt: string;
  appVersion: string;
  environment: string;
  platform: string;
  route?: string;
  online: boolean;
  session: ErrorReportSession;
  /** Les dernières actions utilisateur (les plus récentes en dernier). */
  breadcrumbs: Breadcrumb[];
  /** Contexte additionnel propre au point de capture (expurgé). */
  context?: Record<string, string>;
}

/** Entrée de capture fournie par un point d'instrumentation. */
export interface ReportErrorInput {
  type?: AppErrorType;
  source: string;
  route?: string;
  componentStack?: string;
  context?: Record<string, unknown>;
}

let sessionContext: ErrorReportSession = { authenticated: false, role: null };

/** Met à jour l'état de session joint aux rapports (appelé par un bridge). */
export function setSessionContext(next: ErrorReportSession): void {
  sessionContext = next;
}

/** Plateforme courante (Capacitor si disponible, sinon `web`). */
function currentPlatform(): string {
  try {
    // Import paresseux : évite de tirer Capacitor dans les tests unitaires.
    const cap = (globalThis as { Capacitor?: { getPlatform?: () => string } })
      .Capacitor;
    return cap?.getPlatform?.() ?? "web";
  } catch {
    return "web";
  }
}

function currentRoute(): string | undefined {
  try {
    return typeof window !== "undefined" ? window.location?.pathname : undefined;
  } catch {
    return undefined;
  }
}

function isOnline(): boolean {
  try {
    if (typeof navigator === "undefined") return true;
    // `navigator.onLine` peut être absent (Node, environnements non-Web) → en
    // ligne par défaut ; seul un `false` explicite signifie hors-ligne.
    return navigator.onLine !== false;
  } catch {
    return true;
  }
}

/**
 * Classification automatique du type d'incident. Un `type` explicite fourni par
 * le point de capture PRIME (ex. l'ErrorBoundary déclare `crash`) ; sinon on
 * infère depuis le message/la stack.
 */
export function classifyError(
  message: string,
  stack: string | undefined,
  hint?: AppErrorType,
  code?: string,
): AppErrorType {
  if (hint) return hint;
  // On classifie sur le MESSAGE, le CODE d'erreur (PostgREST/SQLSTATE porté par
  // `err.code`) et la PREMIÈRE trame utilisateur — pas sur la stack entière,
  // qui contient des internes de framework (bundler, vitest, Ionic)
  // susceptibles de matcher des motifs par accident (ex. un « setTimeout »
  // interne ferait passer toute erreur pour une perf).
  const haystack = `${message}\n${code ?? ""}\n${firstStackFrame(stack)}`;

  // Base de données : codes Postgres/PostgREST, violations RLS, permissions.
  if (
    /(duplicate key|violates (foreign key|unique|not-null|check) constraint|relation ".*" does not exist|column ".*" does not exist|permission denied for|row-level security|RLS policy|new row violates|PGRST\d+|42P01|2350[0-9]|42501|57014|statement timeout)/i.test(
      haystack,
    )
  ) {
    return "database";
  }

  // Synchronisation : PowerSync, réplique, file d'upload, offline.
  if (
    /(PSYNC_[A-Z]?\d+|PowerSync|waitForFirstSync|replica|uploadData|CrudTransaction|syncStream|OfflineError|SyncStream)/i.test(
      haystack,
    )
  ) {
    return "sync";
  }

  // Performance : tâche longue, opération lente, dépassement de budget.
  if (
    /(long task|t[âa]che longue|slow (query|operation)|op[ée]ration lente|performance budget|timed out|timeout)/i.test(
      haystack,
    )
  ) {
    return "performance";
  }

  return "functional";
}

/** djb2 → base36 : signature courte et stable, sans dépendance cryptographique. */
function hash(input: string): string {
  let h = 5381;
  for (let i = 0; i < input.length; i += 1) {
    h = ((h << 5) + h + input.charCodeAt(i)) | 0;
  }
  return (h >>> 0).toString(36);
}

/** Première ligne « utile » d'une stack (fichier:ligne:colonne), normalisée. */
function firstStackFrame(stack: string | undefined): string {
  if (!stack) return "";
  const line = stack
    .split("\n")
    .map((l) => l.trim())
    .find((l) => l.startsWith("at ") || /:\d+:\d+/.test(l));
  if (!line) return "";
  // Retire les hash de build (index-a1b2c3.js) pour regrouper entre déploiements.
  return line.replace(/[-.][0-9a-f]{8,}\./gi, ".").slice(0, 160);
}

/** Calcule la signature stable d'une erreur (type + message + 1re trame). */
export function errorSignature(
  type: AppErrorType,
  message: string,
  stack?: string,
): string {
  return hash(`${type}|${message}|${firstStackFrame(stack)}`);
}

/** Extrait un message lisible d'une valeur inconnue. */
export function extractMessage(err: unknown): string {
  if (err instanceof Error) return err.message || err.name || "Error";
  if (typeof err === "string") return err;
  if (err && typeof err === "object" && "message" in err) {
    return String((err as { message: unknown }).message);
  }
  return "Erreur inconnue";
}

/** Extrait la stack d'une valeur inconnue. */
function extractStack(err: unknown): string | undefined {
  return err instanceof Error ? err.stack : undefined;
}

/**
 * Extrait un code d'erreur exploitable (PostgREST/SQLSTATE/DOMException). Ces
 * bibliothèques exposent le code sur `err.code` / `err.statusCode`, PAS dans le
 * message — sans quoi une violation RLS serait classée « fonctionnelle ».
 */
export function extractCode(err: unknown): string | undefined {
  if (!err || typeof err !== "object") return undefined;
  const e = err as { code?: unknown; statusCode?: unknown; code2?: unknown };
  const value = e.code ?? e.statusCode ?? e.code2;
  return typeof value === "string" || typeof value === "number"
    ? String(value)
    : undefined;
}

/** Échappe les métacaractères d'une chaîne pour un usage dans `RegExp`. */
function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Retire d'un texte toute occurrence d'une identité connue (e-mail, prénom,
 * nom). Ces valeurs n'ont pas de FORME détectable par `redact` : il faut les
 * retirer par VALEUR. Les jetons de moins de 2 caractères sont ignorés.
 */
export function scrubIdentities(
  text: string,
  identities: readonly string[],
): string {
  let out = text;
  for (const raw of identities) {
    const token = (raw ?? "").trim();
    if (token.length < 2) continue;
    out = out.replace(new RegExp(escapeRegExp(token), "gi"), "<masqué>");
  }
  return out;
}

/** Expurge une valeur de contexte (PII + caractères de contrôle). */
function sanitizeValue(
  value: unknown,
  identities: readonly string[],
): string {
  return normalizeText(scrubIdentities(redact(String(value ?? "")), identities), {
    maxLength: 300,
    collapseWhitespace: true,
  });
}

/** Normalise la carte de contexte (clés et valeurs expurgées). */
function sanitizeContext(
  context: Record<string, unknown> | undefined,
  identities: readonly string[],
): Record<string, string> | undefined {
  if (!context) return undefined;
  const out: Record<string, string> = {};
  let keys = 0;
  for (const [key, value] of Object.entries(context)) {
    if (keys >= 15) break;
    if (value === null || value === undefined) continue;
    out[sanitizeValue(key, identities)] = sanitizeValue(value, identities);
    keys += 1;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

/**
 * Construit le rapport contextuel complet. FONCTION PURE (hors lecture du fil
 * d'Ariane et de l'état de session) : l'horodatage et l'identité sont
 * injectables pour les tests. `identities` sert à retirer par valeur les
 * identités de l'utilisateur courant.
 */
export function buildErrorReport(
  err: unknown,
  input: ReportErrorInput,
  now: string,
  identities: readonly string[] = [],
): ErrorReport {
  const rawMessage = extractMessage(err);
  const rawStack = extractStack(err);
  const code = extractCode(err);
  const type = classifyError(rawMessage, rawStack, input.type, code);

  const message = normalizeText(
    scrubIdentities(redact(rawMessage), identities),
    { maxLength: MAX_MESSAGE_LENGTH, collapseWhitespace: false },
  );
  const stack = rawStack
    ? normalizeText(scrubIdentities(redact(rawStack), identities), {
        maxLength: MAX_STACK_LENGTH,
        collapseWhitespace: false,
      })
    : undefined;
  const componentStack = input.componentStack
    ? normalizeText(scrubIdentities(redact(input.componentStack), identities), {
        maxLength: MAX_COMPONENT_STACK_LENGTH,
        collapseWhitespace: false,
      })
    : undefined;

  return {
    kind: "lumina-error-report",
    signature: errorSignature(type, message, rawStack),
    type,
    message,
    stack,
    componentStack,
    source: input.source,
    generatedAt: now,
    appVersion: (import.meta.env.VITE_APP_VERSION as string | undefined) ?? "",
    environment: ENVIRONMENT,
    platform: currentPlatform(),
    route: input.route ?? currentRoute(),
    online: isOnline(),
    session: sessionContext,
    breadcrumbs: getBreadcrumbs(BREADCRUMBS_IN_REPORT),
    context: sanitizeContext(
      code ? { ...input.context, code } : input.context,
      identities,
    ),
  };
}

// ── Déduplication / rate-limiting ──────────────────────────────────────────

/** Signatures récemment signalées → horodatage du dernier signalement. */
const recentSignatures = new Map<string, number>();
let sentThisSession = 0;

function loadSignatures(): void {
  if (typeof localStorage === "undefined") return;
  try {
    const raw = localStorage.getItem(ERROR_SIGNATURES_STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as Record<string, number>;
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    for (const [sig, at] of Object.entries(parsed)) {
      if (typeof at === "number" && at >= cutoff) recentSignatures.set(sig, at);
    }
  } catch {
    /* stockage illisible — repartir à vide */
  }
}

function persistSignatures(): void {
  if (typeof localStorage === "undefined") return;
  try {
    const obj: Record<string, number> = {};
    for (const [sig, at] of recentSignatures) obj[sig] = at;
    localStorage.setItem(ERROR_SIGNATURES_STORAGE_KEY, JSON.stringify(obj));
  } catch {
    /* stockage indisponible — la dédup reste en mémoire */
  }
}

// Recharge les signatures persistées (dédup inter-rechargements).
loadSignatures();

/**
 * L'erreur doit-elle être signalée maintenant ? `false` si la même signature a
 * déjà été signalée dans la fenêtre de dédup, ou si le plafond de session est
 * atteint.
 */
export function shouldReport(signature: string, now: number): boolean {
  if (sentThisSession >= MAX_REPORTS_PER_SESSION) return false;
  const last = recentSignatures.get(signature);
  if (last !== undefined && now - last < DEDUPE_WINDOW_MS) return false;
  return true;
}

/** Test helper — réinitialise la dédup (mémoire + stockage). */
export function resetReporterState(): void {
  recentSignatures.clear();
  sentThisSession = 0;
  flushInFlight = null;
  if (typeof localStorage !== "undefined") {
    try {
      localStorage.removeItem(ERROR_SIGNATURES_STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }
}

// ── File d'attente locale (survit au hors-ligne / rechargement) ─────────────

/** Lit la file d'attente persistée (tolérant : corrompu ⇒ vide). */
export function getQueuedReports(): ErrorReport[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(ERROR_QUEUE_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ErrorReport[]) : [];
  } catch {
    return [];
  }
}

function persistQueue(queue: ErrorReport[]): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(
      ERROR_QUEUE_STORAGE_KEY,
      JSON.stringify(queue.slice(-MAX_QUEUED_REPORTS)),
    );
  } catch {
    /* stockage plein/refusé : la file reste en mémoire */
  }
}

/** Test helper — vide la file d'attente locale. */
export function clearQueuedReports(): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.removeItem(ERROR_QUEUE_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

function enqueue(report: ErrorReport): void {
  const queue = getQueuedReports();
  queue.push(report);
  persistQueue(queue);
}

// ── Transport (edge function → GitHub) ─────────────────────────────────────

export type ReportTransport = (
  report: ErrorReport,
) => Promise<{ ok: boolean; drop?: boolean }>;

/**
 * La remontée automatique est-elle autorisée dans cet environnement ?
 *
 * FAUX POSITIF CORRIGÉ (audit 2026-11-01) : un serveur de développement
 * (`vite dev`, localhost) remontait ses erreurs au dépôt PUBLIC — mesuré :
 * ~45 Issues « Tâche longue détectée » + 4 « no such column: kind » émises
 * depuis `environment: development` / `platform: web` / route `/reports`. Ces
 * rapports sont du bruit pour l'agent autonome (chemins `node_modules`,
 * artefacts HMR) et polluent le dépôt.
 *
 * Politique : on ne transmet QUE depuis un build de production. Un développeur
 * qui veut tester la chaîne de bout en bout force la voie avec
 * `VITE_REPORT_ERRORS_IN_DEV=true`. Les rapports bloqués sont RETIRÉS de la
 * file (pas de réessai infini) mais restent visibles localement (page Santé).
 */
export function isTransmissionAllowed(): boolean {
  if (import.meta.env.VITE_REPORT_ERRORS_IN_DEV === "true") return true;
  return import.meta.env.PROD === true;
}

/**
 * Transport par défaut : appelle l'edge function `report-error`, qui détient le
 * jeton GitHub (jamais exposé au client) et crée l'Issue. Import DYNAMIQUE du
 * client Supabase : garde ce module léger et testable sans variables d'env.
 *
 * PRÉ-LOGIN : si aucune session n'est disponible, on envoie QUAND MÊME le
 * rapport (voie anonyme). L'edge function applique alors un plafond serré par
 * origine (hachage d'IP) — un utilisateur bloqué à l'écran de connexion ne
 * pourrait sinon jamais remonter son crash. Sans jeton, `functions.invoke`
 * n'attache aucun en-tête `Authorization` (la clé publishable voyage en
 * `apikey`), donc l'appel est bien identifié comme anonyme côté serveur.
 */
async function defaultTransport(
  report: ErrorReport,
): Promise<{ ok: boolean; drop?: boolean }> {
  if (!isTransmissionAllowed()) {
    // Bruit de développement : on retire le rapport sans créer d'Issue.
    console.warn(
      "[observability] remontée GitHub ignorée hors production (dev/localhost) :",
      report.type,
      report.message,
    );
    return { ok: false, drop: true };
  }

  const { supabase } = await import("@/integrations/supabase/client");
  const { data } = await supabase.auth.getSession();
  const accessToken = data?.session?.access_token;

  const res = await supabase.functions.invoke("report-error", {
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
    body: { report },
  });
  if (res.error) return { ok: false };
  return { ok: (res.data as { ok?: boolean })?.ok === true };
}

let transport: ReportTransport = defaultTransport;

/** Injecte un transport (tests). `null` restaure le transport par défaut. */
export function setReportTransport(next: ReportTransport | null): void {
  transport = next ?? defaultTransport;
}

/**
 * Identités de l'utilisateur courant à masquer par VALEUR (e-mail, prénom,
 * nom). Renseignées par un bridge (`setReportIdentities`) qui lit le profil
 * synchrone — évite tout import statique de `auth` dans ce module.
 */
let reportIdentities: string[] = [];

/** Met à jour les identités retirées par valeur des rapports. */
export function setReportIdentities(identities: readonly string[]): void {
  reportIdentities = identities.filter((s) => typeof s === "string");
}

/** Évite la ré-entrance : un échec d'envoi ne doit pas déclencher un rapport. */
let flushInFlight: Promise<number> | null = null;

/**
 * Envoie les rapports en file d'attente. Les rapports envoyés avec succès sont
 * retirés ; un échec (hors-ligne, 5xx, pas de session) les laisse en file pour
 * un nouvel essai. Ne lève JAMAIS.
 *
 * Un flush déjà en cours n'est PAS doublé : les appels concurrents partagent le
 * même résultat (évite qu'un second flush reparte d'une file périmée).
 */
export function flushPendingReports(): Promise<number> {
  if (flushInFlight) return flushInFlight;
  flushInFlight = runFlush().finally(() => {
    flushInFlight = null;
  });
  return flushInFlight;
}

async function runFlush(): Promise<number> {
  const queue = getQueuedReports();
  if (queue.length === 0) return 0;
  let sent = 0;
  const remaining: ErrorReport[] = [];
  for (const report of queue) {
    try {
      const result = await transport(report);
      if (result.ok) {
        sent += 1;
        recentSignatures.set(report.signature, Date.now());
      } else if (!result.drop) {
        // Échec transitoire (hors-ligne, 5xx) → garder pour un nouvel essai.
        remaining.push(report);
      }
      // `drop: true` (bruit de dev, environnement non autorisé) : retiré
      // définitivement — inutile de réessayer à chaque flush.
    } catch {
      remaining.push(report);
    }
  }
  persistQueue(remaining);
  if (sent > 0) persistSignatures();
  return sent;
}

/**
 * Signale un incident d'origine UTILISATEUR (« Signaler un problème ») : il est
 * traité comme une erreur fonctionnelle et remonte donc aussi vers GitHub
 * Issues, au même titre qu'une capture automatique. Le texte fourni est déjà
 * expurgé par `reportProblem` ; le reporter applique sa propre passe PII.
 */
export function reportUserProblem(
  summary: string,
  context?: Record<string, unknown>,
): void {
  reportError(new Error(summary), {
    type: "functional",
    source: "report-problem",
    context,
  });
}

/**
 * Signale une erreur : construit le rapport, applique la dédup, l'ajoute au fil
 * d'Ariane et à la file, puis déclenche un envoi. Ne lève JAMAIS et ne bloque
 * jamais l'appelant (l'envoi est fire-and-forget).
 */
export function reportError(err: unknown, input: ReportErrorInput): void {
  try {
    if (!isFeatureEnabled(ERROR_REPORTING_FLAG)) return;

    const rawMessage = extractMessage(err);
    const rawStack = extractStack(err);
    const code = extractCode(err);
    const type = classifyError(rawMessage, rawStack, input.type, code);
    const signature = errorSignature(
      type,
      normalizeText(redact(rawMessage), { maxLength: MAX_MESSAGE_LENGTH }),
      rawStack,
    );

    const now = Date.now();
    if (!shouldReport(signature, now)) return;
    recentSignatures.set(signature, now);
    persistSignatures();
    sentThisSession += 1;

    const report = buildErrorReport(
      err,
      { ...input, type },
      new Date(now).toISOString(),
      reportIdentities,
    );

    // Trace le signalement dans le fil d'Ariane (utile pour les erreurs
    // suivantes) sans jamais exposer le rapport lui-même.
    pushBreadcrumb("system", `erreur signalée (${type}) : ${report.message}`);

    enqueue(report);
    void flushPendingReports().catch(() => {
      /* fire-and-forget : l'échec laisse le rapport en file */
    });
  } catch {
    /* le reporter ne doit JAMAIS faire échouer le flux appelant */
  }
}
