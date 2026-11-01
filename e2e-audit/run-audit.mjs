// Audit runner — visits every route offline with seeded data and records:
//   - DOM text + a screenshot
//   - structural findings (tech leaks, raw enums, English labels, formats)
//   - F-30: vertical gap between the header/banner bottom and first content
// Output: audit/baseline/<slug>.{txt,png,json} + audit/phase0-admin.json
import { chromium } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { seedLocalSession, interceptCloud } from "./seed.mjs";
import { seedDemoOrg } from "./demoSeed.mjs";
import { ROUTES } from "./routes.mjs";

const OUT = resolve(process.cwd(), process.env.OUT_DIR ?? "audit/baseline");
mkdirSync(OUT, { recursive: true });

const BASE = "http://localhost:8080";
const VIEWPORT = { width: 390, height: 844 };

// ── Structural detectors ────────────────────────────────────────────────────
const TECH_LEAKS = [
  ["default-org", /\bdefault-org\b/],
  ["demo-", /\bdemo-[a-z0-9-]+/i],
  ["E2E", /\bE2E\b/],
  ["PENDING", /\bPENDING\b/],
  ["PUBLISHED", /\bPUBLISHED\b/],
  ["MONTHLY", /\bMONTHLY\b/],
  ["undefined", /\bundefined\b/],
  ["NaN", /\bNaN\b/],
  ["[object Object]", /\[object Object\]/],
  ["bucket", /bucket «/i],
  ["PowerSync", /\bPowerSync\b/],
];
const RAW_ENUM = /\b[A-Z]{3,}_[A-Z_]+\b/;
const ENGLISH = [
  ["Back", /(^|\s)Back(\s|$)/],
  ["Offline", /(^|\s)Offline(\s|$)/],
  ["Features & navigation", /Features & navigation/],
];
const BAD_DATE = [["mm/dd/yyyy", /\b\d{2}\/\d{2}\/\d{4}\b/], ["ISO", /\b\d{4}-\d{2}-\d{2}T/]];
const AMPM = /\b\d{1,2}:\d{2}(:\d{2})?\s?(AM|PM)\b/;

function slug(route) {
  return route.replace(/[^a-z0-9]+/gi, "_").replace(/^_|_$/g, "") || "root";
}

async function measure(page) {
  return page.evaluate(() => {
    const q = (sel) => document.querySelector(sel);
    const header = q("ion-header") || q("header");
    const headerBottom = header?.getBoundingClientRect().bottom ?? null;
    const ic = q("ion-content");
    let firstTop = null;
    let firstTag = null;
    let firstText = null;
    if (ic) {
      // First rendered element whose top sits below the header — the actual
      // "first content" the user sees (F-30 intent).
      const candidates = Array.from(ic.querySelectorAll("*"))
        .filter((el) => {
          if (el.tagName === "ION-HEADER") return false;
          const r = el.getBoundingClientRect();
          const t = (el.textContent || "").trim();
          // Top-of-screen content only: exclude the bottom tab bar / off-screen.
          return r.height > 6 && r.width > 20 && t.length > 0 && r.top >= 0 && r.top < 500;
        })
        .sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top);
      const first = candidates[0];
      if (first) {
        const r = first.getBoundingClientRect();
        firstTop = r.top;
        firstTag = first.tagName;
        firstText = (first.textContent || "").trim().slice(0, 60);
      }
    }
    return {
      headerBottom,
      firstTop,
      firstTag,
      firstText,
      gap: headerBottom != null && firstTop != null ? Math.round(firstTop - headerBottom) : null,
      headers: document.querySelectorAll("ion-header, header").length,
    };
  });
}

const results = [];

const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  args: ["--no-sandbox", "--disable-gpu"],
});
const ctx = await browser.newContext({ viewport: VIEWPORT, colorScheme: "dark" });
const page = await ctx.newPage();
await interceptCloud(page);
await seedLocalSession(page, { role: process.env.SEED_ROLE });

// Boot + seed the replica once.
await page.goto(`${BASE}/dashboard`, { waitUntil: "domcontentloaded", timeout: 30000 });
await seedDemoOrg(page);

for (const route of ROUTES) {
  const s = slug(route);
  const rec = { route, slug: s, findings: [], error: null };
  try {
    await page.goto(`${BASE}${route}`, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(2500);
    rec.finalUrl = page.url();
    const text = await page.evaluate(() => document.body.innerText || "");
    writeFileSync(resolve(OUT, `${s}.txt`), text, "utf8");

    for (const [name, re] of TECH_LEAKS) if (re.test(text)) rec.findings.push(`TECH_LEAK:${name}`);
    const em = text.match(RAW_ENUM); if (em) rec.findings.push(`RAW_ENUM:${em[0]}`);
    for (const [name, re] of ENGLISH) if (re.test(text)) rec.findings.push(`ENGLISH:${name}`);
    for (const [name, re] of BAD_DATE) if (re.test(text)) rec.findings.push(`BAD_DATE:${name}`);
    if (AMPM.test(text)) rec.findings.push("AMPM");

    const m = await measure(page);
    rec.measure = m;
    if (m.headers > 1) rec.findings.push(`DOUBLE_HEADER:${m.headers}`);
    await page.screenshot({ path: resolve(OUT, `${s}.png`), fullPage: false });
  } catch (e) {
    rec.error = String(e).slice(0, 300);
  }
  results.push(rec);
  console.log(`${route} → ${rec.error ? "ERROR " + rec.error.slice(0,80) : rec.findings.join(",") || "clean"} | gap=${rec.measure?.gap ?? "?"}`);
}

await browser.close();
writeFileSync(resolve(process.cwd(), "audit/phase0-admin.json"), JSON.stringify(results, null, 2), "utf8");
console.log(`\nWrote ${results.length} records to audit/phase0-admin.json`);
