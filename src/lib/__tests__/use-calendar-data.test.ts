import { describe, it, expect } from "vitest";
import {
  buildMonthGrid,
  buildWeekDays,
  buildYearGrid,
  getWeekDays,
  groupByDay,
  splitEventsByToday,
} from "../useCalendarData";

describe("buildMonthGrid", () => {
  it("retourne toujours 42 cellules (6 semaines × 7)", () => {
    const grid = buildMonthGrid(2026, 9); // octobre 2026
    expect(grid).toHaveLength(42);
    // Chaque cellule porte un iso lisible
    for (const c of grid) {
      expect(c.iso).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(c.day).toBeGreaterThanOrEqual(1);
      expect(c.day).toBeLessThanOrEqual(31);
    }
  });

  it("commence un lundi (première cellule = lundi de la 1re semaine)", () => {
    const grid = buildMonthGrid(2026, 9);
    const first = new Date(grid[0].iso + "T00:00:00");
    expect(first.getDay()).toBe(1); // lundi
  });

  it("marque correctement les cellules inMonth", () => {
    const grid = buildMonthGrid(2026, 0); // janvier 2026
    const inMonth = grid.filter((c) => c.inMonth);
    expect(inMonth.length).toBe(31); // janvier a 31 jours
    expect(inMonth[0].iso).toBe("2026-01-01");
    expect(inMonth[inMonth.length - 1].iso).toBe("2026-01-31");
  });

  it("comble les fins de mois suivantes hors-mois", () => {
    // 1er juin 2026 = lundi → 0 cellule avant ; 42 cellules à partir du
    // 1er juin → la dernière est le 12 juillet (hors-mois)
    const grid = buildMonthGrid(2026, 5);
    expect(grid[0].inMonth).toBe(true);
    expect(grid[0].iso).toBe("2026-06-01");
    expect(grid[41].inMonth).toBe(false);
    expect(grid[41].iso).toBe("2026-07-12");
  });
});

describe("buildWeekDays", () => {
  it("retourne 7 jours ISO de la semaine", () => {
    const days = buildWeekDays("2026-10-05"); // lundi 5 octobre 2026
    expect(days).toEqual([
      "2026-10-05",
      "2026-10-06",
      "2026-10-07",
      "2026-10-08",
      "2026-10-09",
      "2026-10-10",
      "2026-10-11",
    ]);
  });

  it("traverse le passage de mois", () => {
    const days = buildWeekDays("2026-09-28");
    expect(days).toEqual([
      "2026-09-28",
      "2026-09-29",
      "2026-09-30",
      "2026-10-01",
      "2026-10-02",
      "2026-10-03",
      "2026-10-04",
    ]);
  });
});

describe("buildYearGrid", () => {
  it("retourne 12 mois en YYYY-MM", () => {
    const months = buildYearGrid(2026);
    expect(months).toHaveLength(12);
    expect(months[0]).toBe("2026-01");
    expect(months[11]).toBe("2026-12");
  });
});

describe("getWeekDays", () => {
  it("retourne 7 Date de la semaine (lundi → dimanche)", () => {
    const days = getWeekDays(new Date(2026, 9, 7)); // mercredi 7 octobre
    expect(days).toHaveLength(7);
    expect(days[0].getDate()).toBe(5); // lundi 5 octobre
    expect(days[6].getDate()).toBe(11); // dimanche 11 octobre
  });
});

describe("groupByDay", () => {
  const ev = (date: string, name?: string, camel?: boolean) =>
    camel
      ? { id: name, startDate: date }
      : { id: name, start_date: date };

  it("regroupe par jour ISO (snake_case)", () => {
    const out = groupByDay("2026-10-05", [
      ev("2026-10-05", "a"),
      ev("2026-10-05", "b"),
      ev("2026-10-06", "c"),
    ]);
    expect(out["2026-10-05"]).toHaveLength(2);
    expect(out["2026-10-06"]).toHaveLength(1);
  });

  it("gère la forme camelCase (legacy IndexedDB)", () => {
    const out = groupByDay("2026-10-05", [ev("2026-10-05", "a", true)]);
    expect(out["2026-10-05"]).toHaveLength(1);
  });

  it("normalise les dates complètes (avec heure) sur le jour", () => {
    const out = groupByDay("2026-10-05", [ev("2026-10-05T09:30:00", "a")]);
    expect(out["2026-10-05"]).toHaveLength(1);
  });

  it("ignore les événements sans date", () => {
    const out = groupByDay("2026-10-05", [{ id: "x" }, ev("2026-10-05", "a")]);
    expect(out["2026-10-05"]).toHaveLength(1);
    expect(Object.keys(out)).toHaveLength(1);
  });
});

describe("splitEventsByToday", () => {
  it("sépare passé / aujourd'hui / à venir par rapport au jour courant", () => {
    const out = splitEventsByToday([
      { id: "past", start_date: "2020-01-01" },
      { id: "future", start_date: "2030-01-01" },
      { id: "today", start_date: "2026-10-03" },
    ]);
    expect(out.past.map((e) => e.id)).toEqual(["past"]);
    expect(out.today.map((e) => e.id)).toEqual(["today"]);
    expect(out.upcoming.map((e) => e.id)).toEqual(["future"]);
  });

  it("trie chaque section par date croissante", () => {
    const out = splitEventsByToday([
      { id: "b", start_date: "2026-09-05" },
      { id: "a", start_date: "2020-01-01" },
      { id: "c", start_date: "2026-01-01" },
    ]);
    expect(out.past.map((e) => e.id)).toEqual(["a", "c", "b"]);
  });

  it("ignore les événements sans date", () => {
    const out = splitEventsByToday([{ id: "no-date" }, { id: "a", start_date: "2030-01-01" }]);
    expect(out.upcoming.map((e) => e.id)).toEqual(["a"]);
    expect(out.past).toHaveLength(0);
    expect(out.today).toHaveLength(0);
  });
});
