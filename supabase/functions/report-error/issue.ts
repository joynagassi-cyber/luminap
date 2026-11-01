/**
 * Logique PURE de l'edge function `report-error` — construction du titre et du
 * corps de l'Issue GitHub, et déduplication.
 *
 * Ce fichier n'importe RIEN (ni Deno, ni npm) : il est exécuté par l'edge
 * function Deno ET par les tests vitest côté dépôt, qui vérifient ainsi la
 * VRAIE logique de formatage plutôt qu'une réimplémentation.
 */

/** Type d'incident (miroir du vocabulaire client). */
export type AppErrorType =
  | "crash"
  | "functional"
  | "database"
  | "sync"
  | "performance";

export interface ReportBreadcrumb {
  at: number;
  category: string;
  message: string;
  data?: Record<string, string>;
}

export interface ErrorReportPayload {
  kind?: string;
  signature?: string;
  type?: AppErrorType;
  message?: string;
  stack?: string;
  componentStack?: string;
  source?: string;
  generatedAt?: string;
  appVersion?: string;
  environment?: string;
  platform?: string;
  route?: string;
  online?: boolean;
  session?: { authenticated?: boolean; role?: string | null };
  breadcrumbs?: ReportBreadcrumb[];
  context?: Record<string, string>;
}

/** Marqueur caché portant la signature (permet la déduplication ultérieure). */
export const SIGNATURE_MARKER = "lumina-error-signature";

const TITLE_MAX = 110;
const MESSAGE_MAX = 4000;
const STACK_MAX = 12000;

/** Enveloppe un texte dans un bloc de code dont la clôture ne peut être cassée. */
export function fencedBlock(content: string, language = ""): string {
  // Si le contenu contient déjà trois backticks, on clôture avec quatre.
  const fence = content.includes("```") ? "````" : "```";
  return `${fence}${language}\n${content}\n${fence}`;
}

/** Première ligne non vide du message, tronquée pour un titre lisible. */
export function shortMessage(message: string | undefined): string {
  const first = (message ?? "Erreur inconnue").split("\n").find((l) => l.trim());
  const text = (first ?? "Erreur inconnue").trim();
  return text.length > TITLE_MAX ? `${text.slice(0, TITLE_MAX - 1)}…` : text;
}

/** Titre de l'Issue : préfixe auto + type + message court. */
export function buildIssueTitle(report: ErrorReportPayload): string {
  const type = report.type ?? "functional";
  return `[auto] ${type} — ${shortMessage(report.message)}`;
}

/** Ligne du marqueur de signature (invisible dans le rendu GitHub). */
export function signatureMarker(signature: string | undefined): string {
  return signature ? `<!-- ${SIGNATURE_MARKER}: ${signature} -->` : "";
}

function formatBreadcrumbs(breadcrumbs: ReportBreadcrumb[] | undefined): string {
  if (!breadcrumbs || breadcrumbs.length === 0) return "_aucune action enregistrée_";
  return breadcrumbs
    .map((b) => {
      const time = new Date(b.at).toISOString().slice(11, 23);
      const data =
        b.data && Object.keys(b.data).length > 0
          ? ` (${Object.entries(b.data)
              .map(([k, v]) => `${k}=${v}`)
              .join(", ")})`
          : "";
      return `- \`${time}\` **${b.category}** — ${b.message}${data}`;
    })
    .join("\n");
}

function formatContext(context: Record<string, string> | undefined): string {
  if (!context || Object.keys(context).length === 0) return "_aucun_";
  return Object.entries(context)
    .map(([k, v]) => `- \`${k}\`: ${v}`)
    .join("\n");
}

/**
 * Corps complet de l'Issue : rapport contextuel structuré (type, stack,
 * contexte d'exécution, fil d'Ariane) + marqueur de signature.
 */
export function buildIssueBody(report: ErrorReportPayload): string {
  const session = report.session ?? {};
  const lines: string[] = [];

  lines.push(signatureMarker(report.signature));
  lines.push(
    "## 🐛 Rapport d'erreur automatique (Lumina)",
    "",
    "> Issue créée automatiquement par le système d'observabilité de l'app. " +
      "Le label `openhands` déclenche la correction autonome.",
    "",
    "### Résumé",
    "",
    "| Champ | Valeur |",
    "| --- | --- |",
    `| **Type d'erreur** | \`${report.type ?? "functional"}\` |`,
    `| **Source** | \`${report.source ?? "inconnue"}\` |`,
    `| **Version** | \`${report.appVersion || "inconnue"}\` |`,
    `| **Environnement** | \`${report.environment ?? "inconnu"}\` |`,
    `| **Plateforme** | \`${report.platform ?? "inconnue"}\` |`,
    `| **Route active** | \`${report.route ?? "inconnue"}\` |`,
    `| **En ligne** | ${report.online ? "oui" : "non"} |`,
    `| **Authentifié** | ${session.authenticated ? "oui" : "non"} |`,
    `| **Rôle** | \`${session.role ?? "—"}\` |`,
    `| **Signature** | \`${report.signature ?? "—"}\` |`,
    `| **Détecté le** | ${report.generatedAt ?? "—"} |`,
    "",
    "### Message",
    "",
    fencedBlock((report.message ?? "").slice(0, MESSAGE_MAX) || "(vide)"),
    "",
  );

  if (report.stack) {
    lines.push(
      "### Stack trace",
      "",
      fencedBlock(report.stack.slice(0, STACK_MAX), "text"),
      "",
    );
  }

  if (report.componentStack) {
    lines.push(
      "### Pile de composants (React)",
      "",
      fencedBlock(report.componentStack.slice(0, STACK_MAX), "text"),
      "",
    );
  }

  lines.push(
    "### Fil d'Ariane (dernières actions)",
    "",
    formatBreadcrumbs(report.breadcrumbs),
    "",
    "### Contexte additionnel",
    "",
    formatContext(report.context),
    "",
    "---",
    "",
    "_Politique de confidentialité : aucun e-mail, nom, identifiant " +
      "utilisateur ou organisation, ni contenu utilisateur libre n'est inclus " +
      "dans ce rapport (expurgé côté client avant envoi)._",
  );

  return lines.join("\n");
}

/** Extrait la signature d'une Issue depuis son corps (marqueur caché). */
export function extractSignature(body: string | undefined): string | null {
  if (!body) return null;
  const match = body.match(
    new RegExp(`<!--\\s*${SIGNATURE_MARKER}:\\s*([^\\s]+)\\s*-->`),
  );
  return match ? match[1] : null;
}

export interface IssueListItem {
  number: number;
  state: string;
  body?: string | null;
  created_at?: string;
}

/**
 * Une Issue identique (même signature, encore ouverte, créée dans la fenêtre)
 * existe-t-elle déjà ? → évite de recréer 100 Issues pour la même erreur.
 */
export function findDuplicate(
  issues: IssueListItem[],
  signature: string | undefined,
  nowMs: number,
  windowMs: number,
): IssueListItem | null {
  if (!signature) return null;
  for (const issue of issues) {
    if (issue.state !== "open") continue;
    if (extractSignature(issue.body ?? undefined) !== signature) continue;
    const created = issue.created_at ? Date.parse(issue.created_at) : NaN;
    if (!Number.isNaN(created) && nowMs - created <= windowMs) return issue;
  }
  return null;
}
