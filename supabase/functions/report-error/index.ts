import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

import {
  buildIssueBody,
  buildIssueTitle,
  findDuplicate,
  type ErrorReportPayload,
  type IssueListItem,
} from "./issue.ts";

/**
 * report-error — crée une GitHub Issue à partir d'un rapport d'erreur client.
 *
 * Pourquoi une edge function et pas un appel direct depuis le navigateur ?
 * Le jeton GitHub (`GITHUB_TOKEN`) est un SECRET : il ne doit JAMAIS être
 * embarqué dans le bundle web ni dans l'APK. Cette fonction détient le jeton
 * côté serveur et joue le rôle de proxy contrôlé :
 *   1. exige un appelant authentifié (JWT valide) — un endpoint ouvert
 *      permettrait à n'importe qui de spammer des Issues sur le dépôt ;
 *   2. valide le dépôt cible contre une ALLOWLIST (jamais d'injection de repo) ;
 *   3. déduplique (une Issue ouverte portant la même signature n'est pas
 *      recréée) ;
 *   4. crée l'Issue avec le label déclencheur `openhands`.
 *
 * Secrets requis (via `supabase secrets set`) :
 *   GITHUB_TOKEN              — PAT avec la portée `issues:write` (repo public)
 *   GITHUB_REPO               — optionnel, défaut `joynagassi-cyber/luminap`
 *   GITHUB_TRIGGER_LABEL      — optionnel, défaut `openhands`
 *   SUPABASE_SERVICE_ROLE_KEY — vérification du JWT appelant
 */

const SUPABASE_URL =
  Deno.env.get("SUPABASE_URL") ?? "https://hhgovvrnalibhgpakswi.supabase.co";
const AUTH_KEY =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ??
  Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ??
  Deno.env.get("SUPABASE_ANON_KEY") ??
  "sb_publishable_kwbReVxSdHLx_u2IzQvGaA_Eegsf2Sh";

const GITHUB_TOKEN = Deno.env.get("GITHUB_TOKEN") ?? "";
const GITHUB_API = "https://api.github.com";

/** Dépôts autorisés (allowlist) — un rapport ne peut viser qu'un de ceux-ci. */
const ALLOWED_REPOS = new Set([
  "joynagassi-cyber/luminap",
]);
const DEFAULT_REPO = "joynagassi-cyber/luminap";

/** Label déclencheur lu par l'automatisation OpenHands. */
const TRIGGER_LABEL = Deno.env.get("GITHUB_TRIGGER_LABEL") ?? "openhands";

/** Fenêtre de déduplication serveur (ms) : 6 h. */
const DEDUPE_WINDOW_MS = 6 * 60 * 60 * 1000;

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

  // 1. Authentification de l'appelant : le JWT doit être valide.
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) {
    return fail(401, "Jeton manquant.");
  }
  const supabase = createClient(SUPABASE_URL, AUTH_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData?.user) {
    return fail(401, "Jeton invalide.");
  }

  // 2. Corps de la requête.
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

  // 3. Dépôt cible : allowlist stricte.
  const repo = payload.repo ?? DEFAULT_REPO;
  if (!ALLOWED_REPOS.has(repo)) {
    return fail(400, "Dépôt non autorisé.");
  }

  // 4. Déduplication (une Issue ouverte avec la même signature ne suffit pas).
  const duplicate = await findExistingIssue(repo, report.signature);
  if (duplicate) {
    return ok({ ok: true, deduped: true, issueNumber: duplicate.number });
  }

  // 5. Création de l'Issue (titre + rapport contextuel + label déclencheur).
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
    return fail(502, `Échec de création de l'Issue GitHub : ${createRes.status} ${detail.slice(0, 300)}`);
  }

  const created = (await createRes.json()) as { number?: number; html_url?: string };
  return ok({ ok: true, issueNumber: created.number, issueUrl: created.html_url });
});
