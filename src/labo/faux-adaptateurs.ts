/**
 * Labo Design — Faux adaptateurs.
 *
 * Derrière les ports DDD (architecture en couches hexagonale), l'UI ne
 * parle jamais à Supabase ni à PowerSync directement : elle passe par des
 * adaptateurs. Ce module fournit des implémentations factices pour le
 * développement local-only :
 *
 *  - Session factice (remplace authService) : utilisateur connecté en dur,
 *    rôle modifiable depuis le panneau Labo.
 *  - Stockage des logos factice (localStorage / mémoire).
 *  - Connexion Google factice (simule un succès/échec).
 *  - Notifications push factices (OneSignal).
 *
 * Aucune de ces fonctions n'émet de requête HTTP. MSW n'est utilisé que pour
 * les appels REST restants qui n'ont pas encore été abstraits.
 */

import type { CurrentUser } from "@/lib/dataLayer";

/** ─── Session factice ───────────────────────────────────────────────────── */

export interface FauxSession {
  user: CurrentUser;
  isAuthenticated: boolean;
}

let _fauxSession: FauxSession | null = null;

/** Initialise (ou réinitialise) la session factice. */
export function initFauxSession(overrides?: Partial<CurrentUser>): FauxSession {
  const user: CurrentUser = {
    id: "labo-user-1",
    email: "pasteur@exemple.fr",
    firstName: "Jean",
    lastName: "Pasteur",
    role: "PASTEUR_PRINCIPAL",
    org: {
      id: "labo-org-normale",
      name: "Église MFE-JC Centrale",
      type: "Eglise",
      accentColor: "#FF6B00",
    },
    ...overrides,
  };
  _fauxSession = { user, isAuthenticated: true };
  return _fauxSession;
}

export function getFauxSession(): FauxSession | null {
  return _fauxSession;
}

export function setFauxRole(role: CurrentUser["role"]): void {
  if (_fauxSession) {
    _fauxSession.user.role = role;
  }
}

export function setFauxOrg(org: CurrentUser["org"]): void {
  if (_fauxSession) {
    _fauxSession.user.org = org;
  }
}

export function signOutFaux(): void {
  _fauxSession = null;
}

/** ─── Stockage des logos factice ────────────────────────────────────────── */

const _logoStore = new Map<string, string>(); // key → data URL ou chemin

export function saveFauxLogo(key: string, dataUrl: string): void {
  _logoStore.set(key, dataUrl);
  try {
    localStorage.setItem(`labo-logo-${key}`, dataUrl);
  } catch {
    /* stockage indisponible — mémoire seulement */
  }
}

export function getFauxLogo(key: string): string | null {
  if (_logoStore.has(key)) return _logoStore.get(key) ?? null;
  try {
    return localStorage.getItem(`labo-logo-${key}`);
  } catch {
    return null;
  }
}

export function removeFauxLogo(key: string): void {
  _logoStore.delete(key);
  try {
    localStorage.removeItem(`labo-logo-${key}`);
  } catch {
    /* ignore */
  }
}

/** ─── Connexion Google factice ─────────────────────────────────────────── */

export type FauxGoogleResult =
  | { ok: true; user: { email: string; firstName: string; lastName: string } }
  | { ok: false; error: string };

let _fauxGoogleShouldFail = false;

/** Force l'échec de la prochaine connexion Google (pour tester l'état erreur). */
export function setFauxGoogleFailure(shouldFail: boolean): void {
  _fauxGoogleShouldFail = shouldFail;
}

/** Simule une connexion Google (retour après ~1s pour montrer un squelette). */
export async function fauxSignInWithGoogle(): Promise<FauxGoogleResult> {
  await new Promise((r) => setTimeout(r, 800));
  if (_fauxGoogleShouldFail) {
    return { ok: false, error: "Connexion Google refusée (simulée)" };
  }
  return {
    ok: true,
    user: {
      email: "utilisateur.google@example.fr",
      firstName: "Utilisateur",
      lastName: "Google",
    },
  };
}

/** ─── Notifications push factices (OneSignal) ───────────────────────────── */

const _notifications: Array<{
  id: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
}> = [];

export function getFauxNotifications() {
  return [..._notifications].reverse();
}

export function markFauxNotificationRead(id: string): void {
  const n = _notifications.find((n) => n.id === id);
  if (n) n.read = true;
}

export function addFauxNotification(title: string, body: string): void {
  _notifications.push({
    id: `faux-notif-${Date.now()}`,
    title,
    body,
    read: false,
    createdAt: new Date().toISOString(),
  });
}

export function requestFauxPushPermission(): Promise<boolean> {
  return Promise.resolve(true); // toujours accordé en Labo
}

/** ─── Initialisation par défaut au chargement du module ─────────────────── */

initFauxSession();
