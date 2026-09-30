#!/usr/bin/env node
/**
 * Lumina — Webpack serveur SPA statique (Render).
 *
 * L'app est désormais 100 % front-first (PowerSync + Supabase côté
 * navigateur) : il n'existe plus de routes Nitro serveur. Le build
 * produit un simple dossier `dist/` (index.html + assets).
 *
 * Ce script sert le dossier dist/ sur le port Render ($PORT) avec :
 *   - SPA fallback : tout chemin inconnu renvoie index.html
 *   - headers de cache statiques pour les assets hachés
 *   - compression bruyante (gzip) activée
 *
 * Pas de dépendance externe — uniquement `node:fs`, `node:path`,
 * `node:http` et `node:zlib` standard.
 */

import { createServer } from "node:http";
import { createReadStream, existsSync, statSync, readFileSync } from "node:fs";
import { join, normalize, extname } from "node:path";
import { gzipSync } from "node:zlib";

const PORT = Number(process.env.PORT || 3000);
const DIST_DIR = join(process.cwd(), "dist");
const INDEX_FILE = join(DIST_DIR, "index.html");

if (!existsSync(DIST_DIR)) {
  console.error(
    `[start] dist/ introuvable (${DIST_DIR}) — le build a échoué.`,
  );
  process.exit(1);
}

// MIME types — uniquement ceux que le bundle Vite émet.
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".wasm": "application/wasm",
  ".txt": "text/plain; charset=utf-8",
};

function resolveAsset(pathname) {
  // Normalise pour éviter les traversals ../ et renvoie null si le
  // chemin résout hors de dist/.
  const cleaned = normalize(decodeURIComponent(pathname)).replace(/^\/+/, "");
  if (cleaned.startsWith("..")) return null;
  return join(DIST_DIR, cleaned);
}

function sendFile(res, filePath, req) {
  const stat = statSync(filePath);
  const ext = extname(filePath);
  const type = MIME[ext] || "application/octet-stream";
  const isHashed = ext === ".js" || ext === ".css" || ext === ".wasm";

  res.setHeader("Content-Type", type);
  res.setHeader("Content-Length", stat.size);
  if (isHashed) {
    // Assets hachés (nom stable, contenu déterministe) : cache long.
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  } else {
    // index.html : jamais en cache (le bundle référence de nouveaux hashes).
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  }

  if (req.headers["accept-encoding"]?.includes("gzip") && stat.size > 1024) {
    // Gzip on-the-fly pour les assets (>1 ko) — économise ~60 % du réseau.
    res.setHeader("Content-Encoding", "gzip");
    res.setHeader("Vary", "Accept-Encoding");
    res.removeHeader("Content-Length");
    const data = readFileSync(filePath);
    const zipped = gzipSync(data, { level: 9 });
    res.write(zipped);
    res.end();
  } else {
    const stream = createReadStream(filePath);
    stream.pipe(res);
  }
}

const server = createServer((req, res) => {
  const url = new URL(req.url, "http://localhost");
  const pathname = url.pathname;

  // Health check Render (optionnelle).
  if (pathname === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  const asset = resolveAsset(pathname);
  if (asset && existsSync(asset) && statSync(asset).isFile()) {
    sendFile(res, asset, req);
    return;
  }

  // SPA fallback : renvoie index.html pour tout le reste.
  sendFile(res, INDEX_FILE, req);
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`[start] Lumina SPA statique — ${DIST_DIR} sur http://0.0.0.0:${PORT}`);
});
