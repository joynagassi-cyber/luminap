import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

import {
  buildIssueBody,
  buildIssueTitle,
  findDuplicate,
  type ErrorReportPayload,
  type IssueListItem,
} from "./issue.ts";
import { dedupeKey } from "./dedupe.ts";
import { isNonProductionReport } from "./environment.ts";
import {
  ANON_MAX_PER_HOUR,
  DEFAULT_IP_SALT,
  extractClientIp,
  ipBucket,
  isAnonymousCaller,
  userBucket,
  USER_MAX_PER_HOUR,
} from "./throttle.ts";

/**
 * report-error — crée une GitHub Issue à partir d'un rapport d'erreur client.
 *
 * Pourquoi une edge function et pas un appel direct depuis le navigateur ?
 * Le jeton GitHub (`GITHUB_TOKEN`) est un SECRET : il ne doit JAMAIS être
 * embarqué dans le bundle web ni dans l'APK. Cette fonction détient le jeton
 * côté serveur et joue le rôle de proxy contrôlé :
 *   1. identifie l'appelant (JWT utilisateur vérifié OU anonyme) ;
 *   2. applique un PLAFOND par appelant (rate-limiting) — un endpoint public
 *      ne doit pas permettre de spammer des Issues ;
 *   3. valide le dépôt cible contre une ALLOWLIST (jamais d'injection de repo) ;
 *   4. déduplique (une Issue ouverte portant la même signature n'est pas
 *      recréée) ;
 *   5. crée l'Issue avec le label déclencheur `openhands`.
 *
 * DEUX VOIES (pré-login)
 *   Le JWT n'est PLUS exigé (`verify_jwt: false`), car les incidents les plus
 *   précieux surviennent AVANT la connexion (crash de l'écran d'auth, échec
 *   d'invitation, perte réseau au boot) — et un utilisateur qui ne parvient
 *   pas à se connecter ne pourrait jamais les remonter.
 *     • appelant AUTHENTIFIÉ (JWT valide) → plafond large (USER_MAX_PER_HOUR) ;
 *     • appelant ANONYME (pas de JWT, ou JWT expiré/invalide) → plafond serré
 *       (ANON_MAX_PER_HOUR), bucket = hachage salé de l'IP (jamais l'IP en clair).
 *   La vérification est faite ICI (et non par la passerelle) : `auth.getUser`
 *   ne valide un jeton qu'auprès de GoTrue, donc un en-tête `Authorization`
 *   forgé ne donne jamais la voie « authentifiée ».
 *
 * Secrets requis (via `supabase secrets set`) :
 *   GITHUB_TOKEN              — PAT avec la portée `issues:write` (repo public)
 *   GITHUB_REPO               — optionnel, défaut `joynagassi-cyber/luminap`
 *   GITHUB_TRIGGER_LABEL      — optionnel, défaut `openhands`
 *   SUPABASE_SERVICE_ROLE_KEY — rate-limiting (RPC register_anonymous_report)
 *   IP_HASH_SALT              — optionnel, sel du hachage des IP anonymes
 */

const SUPABASE_URL =
  Deno.env.get("SUPABASE_URL") ?? "https://hhgovvrnalibhgpakswi.supabase.co";
const AUTH_KEY =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ??
  Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ??
  Deno.env.get("SUPABASE_ANON_KEY") ??
  "sb_publishable_kwbReVxSdHLx_u2IzQvGaA_Eegsf2Sh";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const IP_HASH_SALT = Deno.env.get("IP_HASH_SALT") ?? DEFAULT_IP_SALT;

const GITHUB_TOKEN = Deno.env.get("GITHUB_TOKEN") ?? "";
const GITHUB_API = "https://api.github.com";

/** Dépôts autorisés (allowlist) — un rapport ne peut viser qu'un de ceux-ci. */
const ALLOWED_REPOS = new Set([
  "joynagassi-cyber/luminap",
]);
const DEFAULT_REPO = "joynagassi-cyber/luminap";

/** Label déclencheur lu par l'automatisation OpenHands. */
const TRIGGER_LABEL = Deno.env.get("GITHUB_TRIGGER_LABEL") ?? "openhands";

/** Fenêtre de déduplication serveur : 6 h (alignée sur la RPC claim/release). */
const DEDUPE_WINDOW_HOURS = 6;
const DEDUPE_WINDOW_MS = DEDUPE_WINDOW_HOURS * 60 * 60 * 1000;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function ok(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function fail(status: number, message: string) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/** En-têtes d'appel de l'API GitHub. */
function githubHeaders(): HeadersInit {
  return {
    Authorization: `Bearer ${GITHUB_TOKEN}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "lumina-observability",
    "Content-Type": "application/json",
  };
}

/**
 * Cherche une Issue ouverte identique (même signature) via l'API de recherche
 * GitHub. Une erreur de recherche n'empêche pas la création (fail-open) : mieux
 * vaut un doublon qu'une erreur perdue.
 */
async function findExistingIssue(
  repo: string,
  signature: string | undefined,
): Promise<IssueListItem | null> {
  if (!signature) return null;
  const query = encodeURIComponent(
    `repo:${repo} is:issue is:open label:"${TRIGGER_LABEL}" "${signature}" in:body`,
  );
  try {
    const res = await fetch(
      `${GITHUB_API}/search/issues?q=${query}&per_page=5`,
      { headers: githubHeaders() },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { items?: IssueListItem[] };
    return findDuplicate(data.items ?? [], signature, Date.now(), DEDUPE_WINDOW_MS);
  } catch {
    return null;
  }
}

/**
 * Vérifie le plafond de signalement de l'appelant via la RPC SECURITY DEFINER
 * `register_anonymous_report` (réservée au service_role). Renvoie `true` si le
 * rapport est autorisé. FAIL-OPEN : si la RPC est indisponible, on laisse
 * passer (la déduplication par signature reste le garde-fou anti-spam) et on
 * journalise — une panne de comptage ne doit pas rendre l'observabilité muette.
 */
async function withinRateLimit(bucket: string, maxPerWindow: number): Promise<boolean> {
  if (!SERVICE_ROLE_KEY) return true;
  try {
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await admin.rpc("register_anonymous_report", {
      p_bucket: bucket,
      p_max_per_window: maxPerWindow,
    });
    if (error) {
      console.warn("[report-error] rate-limit RPC indisponible:", error.message);
      return true;
    }
    return data !== false;
  } catch (e) {
    console.warn("[report-error] rate-limit RPC erreur:", e);
    return true;
  }
}

/** Client admin (service_role) réutilisé pour les RPC de déduplication. */
function adminClient() {
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Réserve ATOMIQUEMENT la signature (migration 20261101000003). Renvoie `true`
 * si l'appelant peut créer l'Issue, `false` si un rapport identique a déjà été
 * traité dans la fenêtre.
 *
 * FAIL-OPEN : sans `service_role` ou si la RPC échoue, on autorise la création
 * — mieux vaut un doublon qu'une erreur perdue. La recherche GitHub reste
 * alors le seul filet.
 */
async function claimSignature(key: string): Promise<boolean> {
  if (!SERVICE_ROLE_KEY) return true;
  try {
    const { data, error } = await adminClient().rpc("claim_error_report", {
      p_dedupe_key: key,
      p_window_hours: DEDUPE_WINDOW_HOURS,
    });
    if (error) {
      console.warn("[report-error] claim RPC indisponible:", error.message);
      return true;
    }
    return data !== false;
  } catch (e) {
    console.warn("[report-error] claim RPC erreur:", e);
    return true;
  }
}

/**
 * Libère une réservation prise par `claimSignature` quand la création de
 * l'Issue a échoué : sans cela, la signature resterait « dédupliquée » 6 h
 * alors qu'aucune Issue n'existe (rapport perdu en silence).
 */
async function releaseSignature(key: string): Promise<void> {
  if (!SERVICE_ROLE_KEY) return;
  try {
    await adminClient().rpc("release_error_report", {
      p_dedupe_key: key,
      p_window_hours: DEDUPE_WINDOW_HOURS,
    });
  } catch (e) {
    console.warn("[report-error] release RPC erreur:", e);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return fail(405, "Method not allowed");
  }

  if (!GITHUB_TOKEN) {
    return fail(503, "GITHUB_TOKEN non configuré (secret Supabase manquant).");
  }

  // 1. Corps de la requête.
  let payload: { report?: ErrorReportPayload; repo?: string };
  try {
    payload = await req.json();
  } catch {
    return fail(400, "Corps JSON invalide.");
  }
  const report = payload.report;
  if (!report || typeof report !== "object" || !report.message) {
    return fail(400, "Rapport manquant ou invalide.");
  }

  // 1bis. Filtre d'environnement (AUTORITAIRE). Un client périmé ou un serveur
  // de développement (CI Cypress `pnpm run dev`, APK non mis à jour) peut
  // appeler l'endpoint public alors que le client courant ne le fait plus.
  // Mesuré : ~58 Issues créées depuis `environment: development` (PR #200).
  // Aucune Issue n'est ouverte pour un rapport non-production.
  if (isNonProductionReport(report)) {
    return ok({ ok: true, skipped: "non-production" });
  }

  // 2. Identification de l'appelant : JWT utilisateur vérifié, sinon anonyme.
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  let userId: string | null = null;
  if (token) {
    const supabase = createClient(SUPABASE_URL, AUTH_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await supabase.auth.getUser(token);
    userId = userData?.user?.id ?? null;
  }
  const anonymous = isAnonymousCaller(userId);

  // 3. Rate-limiting : plafond serré pour l'anonyme (bucket = hash d'IP),
  //    plafond large pour l'utilisateur authentifié (bucket = user id).
  const bucket = anonymous
    ? await ipBucket(
        extractClientIp(
          req.headers.get("cf-connecting-ip"),
          req.headers.get("x-forwarded-for"),
          req.headers.get("x-real-ip"),
        ),
        IP_HASH_SALT,
      )
    : userBucket(userId as string);
  const maxPerWindow = anonymous ? ANON_MAX_PER_HOUR : USER_MAX_PER_HOUR;

  if (anonymous && !SERVICE_ROLE_KEY) {
    // Sans service_role, impossible de borner un endpoint public : on refuse
    // plutôt que d'exposer une voie anonyme non plafonnée.
    return fail(503, "Rate-limiting indisponible pour les rapports anonymes.");
  }

  const allowed = await withinRateLimit(bucket, maxPerWindow);
  if (!allowed) {
    return fail(
      429,
      "Trop de signalements pour le moment. Réessayez plus tard.",
    );
  }

  // 4. Dépôt cible : allowlist stricte.
  const repo = payload.repo ?? DEFAULT_REPO;
  if (!ALLOWED_REPOS.has(repo)) {
    return fail(400, "Dépôt non autorisé.");
  }

  // 5. Déduplication — DÉTERMINISTE d'abord (réservation atomique en base), puis
  //    recherche GitHub (filet pour les Issues créées AVANT la table). L'ordre
  //    est critique : l'index de recherche GitHub a un délai d'indexation de
  //    plusieurs secondes, donc deux rapports en rafale passeraient tous deux
  //    le contrôle de recherche (mesuré : #307 ET #308 pour la même signature).
  const key = dedupeKey(repo, report.signature);
  if (key && !(await claimSignature(key))) {
    return ok({ ok: true, deduped: true });
  }
  const duplicate = await findExistingIssue(repo, report.signature);
  if (duplicate) {
    // Issue déjà présente côté GitHub (créée avant la table, ou par un autre
    // chemin) : la réservation qu'on vient de prendre est inutile, on la rend.
    if (key) await releaseSignature(key);
    return ok({ ok: true, deduped: true, issueNumber: duplicate.number });
  }

  // 6. Création de l'Issue (titre + rapport contextuel + label déclencheur).
  const createRes = await fetch(`${GITHUB_API}/repos/${repo}/issues`, {
    method: "POST",
    headers: githubHeaders(),
    body: JSON.stringify({
      title: buildIssueTitle(report),
      body: buildIssueBody(report),
      labels: [TRIGGER_LABEL],
    }),
  });

  if (!createRes.ok) {
    const detail = await createRes.text();
    // Création échouée : libérer la réservation pour ne pas perdre le rapport
    // pendant 6 h (le prochain flush retentera).
    if (key) await releaseSignature(key);
    return fail(502, `Échec de création de l'Issue GitHub : ${createRes.status} ${detail.slice(0, 300)}`);
  }

  const created = (await createRes.json()) as { number?: number; html_url?: string };
  return ok({ ok: true, issueNumber: created.number, issueUrl: created.html_url });
});
