#!/usr/bin/env node
/**
 * Lecteur statique du pitch deck Lumina.
 *
 * Sans dépendance npm. Sert scripts/pitch-deck/viewer/ et les deux livrables
 * originaux (PDF/PPTX) depuis docs/pitch-deck/. Conçu pour un aperçu live :
 * écoute sur 0.0.0.0, pas d'en-tête bloquant les iframes, URLs relatives.
 */
import { createServer } from "node:http";
import { createReadStream, existsSync, statSync, realpathSync } from "node:fs";
import { extname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const VIEWER_ROOT = resolve(__dirname, "viewer");
const DECK_ROOT = resolve(__dirname, "../../docs/pitch-deck");
const PORT = Number(process.env.PORT || 4173);
const HOST = process.env.HOST || "0.0.0.0";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webp": "image/webp",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".pdf": "application/pdf",
  ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
};

const ORIGINAL_FILES = new Map([
  ["/files/lumina-pitch-eglises.pdf", { path: join(DECK_ROOT, "lumina-pitch-eglises.pdf"), disposition: "inline" }],
  ["/files/lumina-pitch-eglises.pptx", { path: join(DECK_ROOT, "lumina-pitch-eglises.pptx"), disposition: "attachment" }],
]);

function sendJson(res, status, payload) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  res.end(JSON.stringify(payload));
}

function safeStaticPath(pathname) {
  try {
    const decoded = decodeURIComponent(pathname);
    if (decoded.includes("\0")) return null;
    const relative = decoded === "/" ? "/index.html" : decoded;
    const candidate = resolve(VIEWER_ROOT, `.${relative}`);
    if (candidate !== VIEWER_ROOT && !candidate.startsWith(VIEWER_ROOT + sep)) return null;
    if (!existsSync(candidate) || !statSync(candidate).isFile()) return null;
    const real = realpathSync(candidate);
    if (real !== VIEWER_ROOT && !real.startsWith(VIEWER_ROOT + sep)) return null;
    return real;
  } catch {
    return null;
  }
}

function cacheControl(filePath) {
  const ext = extname(filePath);
  if (ext === ".html" || ext === ".json") return "no-cache, no-store, must-revalidate";
  if (ext === ".webp" || ext === ".png" || ext === ".svg") return "public, max-age=86400";
  return "public, max-age=3600";
}

function sendFile(req, res, filePath, { disposition, filename } = {}) {
  const stat = statSync(filePath);
  const type = MIME[extname(filePath)] || "application/octet-stream";
  const headers = {
    "Content-Type": type,
    "Cache-Control": cacheControl(filePath),
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    "Accept-Ranges": "bytes",
  };
  if (disposition) {
    const name = filename || filePath.split(sep).pop();
    headers["Content-Disposition"] = `${disposition}; filename="${name}"`;
  }

  const range = req.headers.range;
  if (range) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(range);
    if (!match) {
      res.writeHead(416, { "Content-Range": `bytes */${stat.size}` });
      res.end();
      return;
    }
    let start = match[1] ? Number(match[1]) : NaN;
    let end = match[2] ? Number(match[2]) : NaN;
    if (Number.isNaN(start) && !Number.isNaN(end)) {
      start = Math.max(0, stat.size - end);
      end = stat.size - 1;
    } else if (Number.isNaN(end) || end >= stat.size) {
      end = stat.size - 1;
    }
    if (Number.isNaN(start) || start < 0 || start > end || start >= stat.size) {
      res.writeHead(416, { "Content-Range": `bytes */${stat.size}` });
      res.end();
      return;
    }
    res.writeHead(206, {
      ...headers,
      "Content-Range": `bytes ${start}-${end}/${stat.size}`,
      "Content-Length": end - start + 1,
    });
    if (req.method === "HEAD") return res.end();
    createReadStream(filePath, { start, end }).pipe(res);
    return;
  }

  res.writeHead(200, { ...headers, "Content-Length": stat.size });
  if (req.method === "HEAD") return res.end();
  createReadStream(filePath).pipe(res);
}

const server = createServer((req, res) => {
  if (req.method !== "GET" && req.method !== "HEAD") {
    sendJson(res, 405, { error: "Method not allowed" });
    return;
  }

  let url;
  try {
    url = new URL(req.url, "http://localhost");
  } catch {
    sendJson(res, 400, { error: "Bad request" });
    return;
  }

  if (url.pathname === "/healthz") {
    sendJson(res, 200, { ok: true, service: "lumina-pitch-deck-viewer" });
    return;
  }

  const original = ORIGINAL_FILES.get(url.pathname);
  if (original) {
    if (!existsSync(original.path)) {
      sendJson(res, 404, { error: "Original file not found" });
      return;
    }
    const forceDownload = url.searchParams.get("download") === "1";
    sendFile(req, res, original.path, {
      disposition: forceDownload ? "attachment" : original.disposition,
      filename: original.path.split(sep).pop(),
    });
    return;
  }

  const filePath = safeStaticPath(url.pathname);
  if (!filePath) {
    sendJson(res, 404, { error: "Not found" });
    return;
  }
  sendFile(req, res, filePath);
});

server.listen(PORT, HOST, () => {
  console.log(`Lecteur pitch deck Lumina : http://${HOST}:${PORT}`);
  console.log(`Assets : ${VIEWER_ROOT}`);
  console.log(`Livrables : ${DECK_ROOT}`);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 1500).unref();
  });
}
