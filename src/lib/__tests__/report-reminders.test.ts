// @vitest-environment jsdom
/**
 * PR10 — Notifications : rappels de rapport à envoyer.
 *
 * Verrouille le cœur PUR `computeReportReminder` (décision « dû / pas dû ») et la
 * livraison idempotente `deliverReportReminder` (marqueur journalier + capacité
 * de notification existante).
 *
 * NON-VACUITÉ (preuve documentée, vérifiée) :
 *   - Passer la borne de cadence de `elapsed >= cadenceDays * DAY_MS` à
 *     `elapsed > cadenceDays * DAY_MS` → le test « exactement à la cadence »
 *     échoue (le rappel n'est plus dû au jour pile).
 *   - Retirer la garde de marqueur dans `deliverReportReminder`
 *     (`if (readReminderMarker(storage) === dayKey(now)) return …`) → le test
 *     « deux évaluations le même jour n'émettent qu'une fois » échoue (2 appels).
 *   - Retirer l'appel `writeReminderMarker(now, storage)` → le second appel
 *     ré-émet → l'idempotence casse (le compteur `send` passe à 2).
 *   - Retirer la garde `isFeatureEnabled(REPORT_REMINDER_FLAG)` → le test
 *     « drapeau coupé » échoue (l'envoi est appelé alors qu'il ne devrait pas).
 *   Chaque mutation a été appliquée puis la source restaurée (voir receipt).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/clientErrors", () => ({
  captureClientError: vi.fn(),
}));

import {
  computeReportReminder,
  deliverReportReminder,
  dayKey,
  readReminderMarker,
  writeReminderMarker,
  clearReminderMarker,
  REPORT_REMINDER_FLAG,
  REMINDER_MARKER_KEY,
  DEFAULT_CADENCE_DAYS,
  type ReminderStorage,
  type ReminderNotificationData,
} from "@/lib/reportReminders";
import { captureClientError } from "@/lib/clientErrors";

/** Stockage en mémoire (injecté) — pas de localStorage en environnement node. */
function memoryStorage(initial: Record<string, string> = {}): ReminderStorage & {
  data: Record<string, string>;
} {
  const data: Record<string, string> = { ...initial };
  return {
    data,
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => {
      data[k] = v;
    },
    removeItem: (k) => {
      delete data[k];
    },
  };
}

beforeEach(() => {
  vi.mocked(captureClientError).mockClear();
});

// ─── Cœur pur : décision ─────────────────────────────────────────────────────

describe("computeReportReminder — décision (pure)", () => {
  const now = "2026-10-31T09:00:00.000Z";

  it("jamais envoyé (lastSentAt null) → dû, raison « never-sent »", () => {
    const r = computeReportReminder({ lastSentAt: null, now, cadenceDays: 30 });
    expect(r.due).toBe(true);
    expect(r.reason).toBe("never-sent");
    expect(r.daysSinceLastSent).toBeNull();
  });

  it("jamais envoyé (lastSentAt absent) → dû", () => {
    expect(computeReportReminder({ lastSentAt: undefined, now }).due).toBe(true);
  });

  it("date illisible → dû (jamais de blocage silencieux)", () => {
    const r = computeReportReminder({ lastSentAt: "pas-une-date", now });
    expect(r.due).toBe(true);
    expect(r.reason).toBe("never-sent");
  });

  it("borne INCLUSIVE : exactement à la cadence → dû", () => {
    // 30 jours pile avant `now`.
    const lastSentAt = "2026-10-01T09:00:00.000Z";
    const r = computeReportReminder({ lastSentAt, now, cadenceDays: 30 });
    expect(r.daysSinceLastSent).toBe(30);
    expect(r.due).toBe(true);
    expect(r.reason).toBe("cadence-elapsed");
  });

  it("un jour AVANT la cadence → non dû", () => {
    const lastSentAt = "2026-10-02T09:00:00.000Z"; // 29 jours
    const r = computeReportReminder({ lastSentAt, now, cadenceDays: 30 });
    expect(r.daysSinceLastSent).toBe(29);
    expect(r.due).toBe(false);
    expect(r.reason).toBe("not-due");
  });

  it("au-delà de la cadence → dû", () => {
    const lastSentAt = "2026-09-01T09:00:00.000Z"; // 60 jours
    const r = computeReportReminder({ lastSentAt, now, cadenceDays: 30 });
    expect(r.due).toBe(true);
  });

  it("cadence par défaut utilisée si absente", () => {
    const r = computeReportReminder({ lastSentAt: null, now });
    expect(r.cadenceDays).toBe(DEFAULT_CADENCE_DAYS);
  });

  it("cadence invalide (0, négative, NaN) → défaut (jamais 0 → rappel permanent)", () => {
    expect(computeReportReminder({ lastSentAt: null, now, cadenceDays: 0 }).cadenceDays).toBe(
      DEFAULT_CADENCE_DAYS,
    );
    expect(
      computeReportReminder({ lastSentAt: null, now, cadenceDays: -5 }).cadenceDays,
    ).toBe(DEFAULT_CADENCE_DAYS);
    expect(
      computeReportReminder({ lastSentAt: null, now, cadenceDays: NaN }).cadenceDays,
    ).toBe(DEFAULT_CADENCE_DAYS);
  });

  it("le message FR est non vide et borné (titre + texte)", () => {
    const r = computeReportReminder({ lastSentAt: null, now, cadenceDays: 30 });
    expect(r.title).toBe("Rapport à envoyer");
    expect(r.message.length).toBeGreaterThan(0);
    expect(r.message.length).toBeLessThanOrEqual(240);
  });

  it("est déterministe : deux appels avec les mêmes entrées → résultat identique", () => {
    const args = { lastSentAt: "2026-09-01T00:00:00.000Z", now, cadenceDays: 30 };
    expect(computeReportReminder(args)).toEqual(computeReportReminder(args));
  });
});

// ─── Marqueur d'idempotence ─────────────────────────────────────────────────

describe("marqueur d'idempotence (jour)", () => {
  it("dayKey extrait le jour ISO", () => {
    expect(dayKey("2026-10-31T23:59:00.000Z")).toBe("2026-10-31");
  });

  it("écriture puis lecture du marqueur", () => {
    const s = memoryStorage();
    expect(readReminderMarker(s)).toBeNull();
    writeReminderMarker("2026-10-31T09:00:00.000Z", s);
    expect(readReminderMarker(s)).toBe("2026-10-31");
    expect(s.data[REMINDER_MARKER_KEY]).toBe("2026-10-31");
  });

  it("effacement du marqueur", () => {
    const s = memoryStorage({ [REMINDER_MARKER_KEY]: "2026-10-31" });
    clearReminderMarker(s);
    expect(readReminderMarker(s)).toBeNull();
  });

  it("stockage indisponible → aucune exception (best-effort)", () => {
    expect(() => writeReminderMarker("2026-10-31T09:00:00.000Z", null)).not.toThrow();
    expect(readReminderMarker(null)).toBeNull();
  });
});

// ─── Livraison ──────────────────────────────────────────────────────────────

describe("deliverReportReminder — livraison idempotente", () => {
  const now = "2026-10-31T09:00:00.000Z";

  it("dû → la notification est émise ET le marqueur posé", async () => {
    const sent: ReminderNotificationData[] = [];
    const send = vi.fn(async (data: ReminderNotificationData) => {
      sent.push(data);
    });
    const storage = memoryStorage();
    const res = await deliverReportReminder({
      lastSentAt: null,
      now,
      send,
      storage,
    });
    expect(res.fired).toBe(true);
    expect(res.reason).toBe("never-sent");
    expect(send).toHaveBeenCalledTimes(1);
    expect(sent[0].title).toBe("Rapport à envoyer");
    expect(sent[0].extraData?.kind).toBe("REPORT_REMINDER");
    expect(readReminderMarker(storage)).toBe("2026-10-31");
  });

  it("PAS dû → la notification n'est PAS émise (aucun envoi)", async () => {
    const send = vi.fn(async () => {});
    const res = await deliverReportReminder({
      lastSentAt: "2026-10-30T09:00:00.000Z", // 1 jour
      now,
      cadenceDays: 30,
      send,
      storage: memoryStorage(),
    });
    expect(res.fired).toBe(false);
    expect(res.reason).toBe("not-due");
    expect(send).not.toHaveBeenCalled();
  });

  it("IDEMPOTENT : deux évaluations le même jour n'émettent qu'UNE fois", async () => {
    const send = vi.fn(async () => {});
    const storage = memoryStorage();

    const first = await deliverReportReminder({ lastSentAt: null, now, send, storage });
    const second = await deliverReportReminder({ lastSentAt: null, now, send, storage });

    expect(first.fired).toBe(true);
    expect(second.fired).toBe(false);
    expect(second.reason).toBe("already-fired-today");
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("un jour différent → peut ré-émettre", async () => {
    const send = vi.fn(async () => {});
    const storage = memoryStorage();
    await deliverReportReminder({ lastSentAt: null, now, send, storage });
    await deliverReportReminder({
      lastSentAt: null,
      now: "2026-11-01T09:00:00.000Z",
      send,
      storage,
    });
    expect(send).toHaveBeenCalledTimes(2);
  });

  it("un échec d'envoi est instrumenté et N'est PAS marqué comme émis", async () => {
    const send = vi.fn(async () => {
      throw new Error("push indisponible");
    });
    const storage = memoryStorage();
    const res = await deliverReportReminder({ lastSentAt: null, now, send, storage });

    expect(res.fired).toBe(false);
    expect(captureClientError).toHaveBeenCalledTimes(1);
    // Pas de marqueur → une nouvelle tentative reste possible (jamais avalé).
    expect(readReminderMarker(storage)).toBeNull();
  });

  it("kill switch : drapeau coupé → aucun envoi, raison « disabled »", async () => {
    const send = vi.fn(async () => {});
    const original = localStorage.getItem("lumina-flags");
    localStorage.setItem("lumina-flags", JSON.stringify({ [REPORT_REMINDER_FLAG]: false }));
    try {
      const res = await deliverReportReminder({
        lastSentAt: null,
        now,
        send,
        storage: memoryStorage(),
      });
      expect(res.fired).toBe(false);
      expect(res.reason).toBe("disabled");
      expect(send).not.toHaveBeenCalled();
    } finally {
      if (original === null) localStorage.removeItem("lumina-flags");
      else localStorage.setItem("lumina-flags", original);
    }
  });
});
