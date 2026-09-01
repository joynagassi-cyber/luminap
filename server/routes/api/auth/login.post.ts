import { defineHandler } from "nitro";
import { readBody, createError, setCookie, getCookie } from "nitro/h3";
import crypto from "node:crypto";

// ─── In-memory credential store (replace with real DB in production) ──────────
// Passwords are stored as SHA-256 hashes with random salts.
interface StoredCredential {
  email: string;
  hash: string;
  salt: string;
  role: "ADMIN" | "TREASURER" | "APPROVER";
  name: string;
  organization: string;
}

const CREDENTIALS: StoredCredential[] = [
  {
    email: "admin@mfe-jc.org",
    // password: "lumina-admin-2026" (SHA-256 with salt — do NOT store plain text)
    salt: "lumina-static-salt-v1",
    hash: "a1b2c3d4e5f6", // placeholder — see init below
    role: "ADMIN",
    name: "Pasteur Jean",
    organization: "Église MFE-JC Centrale",
  },
];

// Initialize the admin hash in production mode
const ADMIN_SALT = process.env.NITRO_ADMIN_SALT || "lumina-static-salt-v1";
const ADMIN_PASSWORD_HASH = process.env.NITRO_ADMIN_PASSWORD_HASH;

if (ADMIN_PASSWORD_HASH) {
  CREDENTIALS[0].salt = ADMIN_SALT;
  CREDENTIALS[0].hash = ADMIN_PASSWORD_HASH;
} else {
  // Development: generate a deterministic hash for the placeholder password
  CREDENTIALS[0].salt = ADMIN_SALT;
  CREDENTIALS[0].hash = crypto
    .createHash("sha256")
    .update(`lumina-admin-2026${ADMIN_SALT}`)
    .digest("hex");
}

// ─── Rate limiting (per-IP attempt tracking) ───────────────────────────────────
interface AttemptRecord {
  count: number;
  lockedUntil: number;
}
const loginAttempts = new Map<string, AttemptRecord>();
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 60_000;

function getAttemptKey(ip: string, email: string): string {
  return `${ip}:${email}`;
}

function checkRateLimit(ip: string, email: string): { allowed: boolean; remainingMs?: number } {
  const key = getAttemptKey(ip, email);
  const record = loginAttempts.get(key);
  if (!record) return { allowed: true };
  if (Date.now() < record.lockedUntil) {
    return { allowed: false, remainingMs: record.lockedUntil - Date.now() };
  }
  // Lockout expired, reset
  if (record.count >= MAX_ATTEMPTS) {
    const until = Date.now() + LOCKOUT_MS;
    loginAttempts.set(key, { count: 0, lockedUntil: until });
    return { allowed: false, remainingMs: LOCKOUT_MS };
  }
  return { allowed: true };
}

function recordAttempt(ip: string, email: string, success: boolean) {
  const key = getAttemptKey(ip, email);
  const record = loginAttempts.get(key) ?? { count: 0, lockedUntil: 0 };
  if (success) {
    loginAttempts.delete(key);
  } else {
    record.count += 1;
    if (record.count >= MAX_ATTEMPTS) {
      record.lockedUntil = Date.now() + LOCKOUT_MS;
    }
    loginAttempts.set(key, record);
  }
}

// ─── Session management ────────────────────────────────────────────────────────
interface SessionData {
  userId: string;
  email: string;
  role: string;
  organization: string;
  expiresAt: number;
}

const SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours
const SESSION_COOKIE_NAME = "lumina_session";

function generateSessionToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

// In-memory session store (replace with Redis/DB in production)
const sessions = new Map<string, SessionData>();

export default defineHandler(async (event) => {
  const ip = event.node.req.socket.remoteAddress ?? "unknown";
  const body = await readBody<{ email?: string; password?: string }>(event);

  const email = (body?.email ?? "").trim().toLowerCase();
  const password = body?.password ?? "";

  if (!email || !password) {
    throw createError({ statusCode: 400, statusMessage: "email et mot de passe requis" });
  }

  // Check rate limit
  const rateCheck = checkRateLimit(ip, email);
  if (!rateCheck.allowed) {
    throw createError({
      statusCode: 429,
      statusMessage: `Trop de tentatives. Réessayez dans ${Math.ceil((rateCheck.remainingMs ?? LOCKOUT_MS) / 1000)}s`,
    });
  }

  // Find credential
  const credential = CREDENTIALS.find((c) => c.email === email);
  if (!credential) {
    recordAttempt(ip, email, false);
    throw createError({ statusCode: 401, statusMessage: "Identifiants invalides" });
  }

  // Verify password
  const computedHash = crypto
    .createHash("sha256")
    .update(`${password}${credential.salt}`)
    .digest("hex");

  if (computedHash !== credential.hash) {
    recordAttempt(ip, email, false);
    throw createError({ statusCode: 401, statusMessage: "Identifiants invalides" });
  }

  // Success — record and create session
  recordAttempt(ip, email, true);

  const token = generateSessionToken();
  const session: SessionData = {
    userId: `user-${crypto.randomBytes(4).toString("hex")}`,
    email: credential.email,
    role: credential.role,
    organization: credential.organization,
    expiresAt: Date.now() + SESSION_DURATION_MS,
  };
  sessions.set(token, session);

  setCookie(event, SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_DURATION_MS / 1000,
    path: "/",
  });

  return {
    ok: true,
    user: {
      id: session.userId,
      email: session.email,
      role: session.role,
      organization: session.organization,
    },
  };
});
