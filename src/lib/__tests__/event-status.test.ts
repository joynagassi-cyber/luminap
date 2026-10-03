import { describe, it, expect } from "vitest";
import { getEventStart, getEventEnd } from "../event-status";

describe("getEventStart", () => {
  it("gère la forme snake_case (PowerSync)", () => {
    expect(getEventStart({ start_date: "2026-10-01" })).toBe("2026-10-01");
  });
  it("gère la forme camelCase (legacy IndexedDB)", () => {
    expect(getEventStart({ startDate: "2026-11-05" })).toBe("2026-11-05");
  });
  it("priorise snake_case si les deux sont présentes", () => {
    expect(getEventStart({ start_date: "2026-01-01", startDate: "2026-02-02" })).toBe(
      "2026-01-01",
    );
  });
  it("retourne null si absent", () => {
    expect(getEventStart({})).toBeNull();
    expect(getEventStart(null)).toBeNull();
  });
});

describe("getEventEnd", () => {
  it("gère la forme snake_case", () => {
    expect(getEventEnd({ end_date: "2026-10-31" })).toBe("2026-10-31");
  });
  it("gère la forme camelCase", () => {
    expect(getEventEnd({ endDate: "2026-12-31" })).toBe("2026-12-31");
  });
  it("retourne null si absent", () => {
    expect(getEventEnd({})).toBeNull();
  });
});
