/**
 * Cross-platform runner for `cypress:run` — replaces `bash cypress/run.sh`
 * on Windows cmd/PowerShell (the old script used `--env` with a positional
 * flag and bash-only `VAR=cmd` prefixes that `cypress run` rejects).
 *
 * Reads the same defaults as run.sh and forwards every CYPRESS_* env var
 * to the Cypress process. Override anything with real env vars:
 *   $env:CYPRESS_BASE_URL='http://localhost:8080'; node cypress/run.mjs
 */
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const require2 = createRequire(import.meta.url);

// Charge `.env.local` (gitignoré) : les identifiants du compte E2E n'ont plus
// de valeur par défaut COMMITÉE (R-B — le littéral en clair dans le dépôt
// public servait de mot de passe réel). Priorité : vraie variable
// d'environnement > `.env.local` > chaîne vide (le spec échoue clairement).
function loadEnvLocal() {
  const file = path.join(projectRoot, '.env.local');
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/.exec(line);
    if (!m) continue;
    const [, key, rawVal] = m;
    if (process.env[key] !== undefined) continue;
    process.env[key] = rawVal.replace(/^["']|["']$/g, '');
  }
}
loadEnvLocal();

// Same defaults as cypress/run.sh — env vars win when set.
const DEFAULTS = {
  CYPRESS_BASE_URL: process.env.CYPRESS_BASE_URL || 'https://lumina-76un.onrender.com',
  CYPRESS_TEST_EMAIL: process.env.CYPRESS_TEST_EMAIL || '',
  CYPRESS_TEST_PASSWORD: process.env.CYPRESS_TEST_PASSWORD || '',
  CYPRESS_SUPABASE_URL: process.env.CYPRESS_SUPABASE_URL || 'https://hhgovvrnalibhgpakswi.supabase.co',
  CYPRESS_SUPABASE_ANON_KEY:
    process.env.CYPRESS_SUPABASE_ANON_KEY || 'sb_publishable_kwbReVxSdHLx_u2IzQvGaA_Eegsf2Sh',
  CYPRESS_POWERSYNC_URL:
    process.env.CYPRESS_POWERSYNC_URL ||
    'https://6a9dd96302481fb31b945823.powersync.journeyapps.com',
  CYPRESS_ORG_EMAIL: process.env.CYPRESS_ORG_EMAIL || 'lumina-org-e2e@lumina.dev',
  // R-B : plus de mot de passe en clair — fournir CYPRESS_ORG_PASSWORD
  // (env ou .env.local). Vide = le spec d'auth échoue explicitement.
  CYPRESS_ORG_PASSWORD: process.env.CYPRESS_ORG_PASSWORD || '',
  CYPRESS_ORG_UNCONFIGURED_EMAIL:
    process.env.CYPRESS_ORG_UNCONFIGURED_EMAIL || 'lumina-org-unconfigured@lumina.dev',
  CYPRESS_ORG_UNCONFIGURED_PASSWORD:
    process.env.CYPRESS_ORG_UNCONFIGURED_PASSWORD || '',
};

// --- Resolve cypress CLI (pnpm shims swallow argv — run the real bin
// script through node, passing our `-r hook` as a `--node-args` option so
// it reaches the spawned Electron process).
function findCypressBin() {
  try {
    // require.resolve('cypress') → dist/index.js; the real CLI bin lives
    // next to it: <pkg>/bin/cypress
    const entry = require2.resolve('cypress');
    return path.resolve(path.dirname(entry), '..', 'bin', 'cypress');
  } catch {
    return null;
  }
}

// --- Build arg list --------------------------------------------------------
const cypressBin = findCypressBin();
// Register tsconfig-paths so `@/` imports in specs resolve. The hook is
// injected via NODE_OPTIONS: the Electron subprocess Cypress spawns inherits
// it (Node's loader hook runs inside that process, which is where spec
// transpilation happens).
const registerHook = path.join(__dirname, 'tsconfig-paths-register.cjs');

const args = ['run'];

// Forward CYPRESS_* env vars to the runner (Cypress itself reads
// process.env in cypress.config.ts; env here is belt-and-suspenders).
const env = { ...process.env };
for (const [k, v] of Object.entries(DEFAULTS)) env[k] = v;
if (fs.existsSync(registerHook)) {
  env.NODE_OPTIONS = `-r ${JSON.stringify(registerHook)} ${process.env.NODE_OPTIONS ?? ''}`.trim();
}

// Optional --spec / --browser passthrough
const extra = process.argv.slice(2);

let cmd;
let cmdArgs;
if (cypressBin) {
  cmd = process.execPath;
  cmdArgs = [cypressBin, ...args, ...extra];
} else {
  // Fallback: bare cypress CLI without the hook (specs that need @/ will
  // fail; none currently do — see grep of cypress/e2e for "@/").
  cmd = process.execPath;
  cmdArgs = [require2.resolve('cypress'), 'run', ...extra];
}

// --- Run (spawnSync keeps the exit code; execFileSync throws on non-zero
// and the pnpm shim swallowed argv, so we use spawnSync + status read) ----
console.log(`[cypress:run] ${cmd} ${cmdArgs.join(' ')} (baseUrl=${env.CYPRESS_BASE_URL})`);
const r = spawnSync(cmd, cmdArgs, {
  stdio: 'inherit',
  env,
  cwd: projectRoot,
});
process.exit(r.status === null ? 1 : r.status);
