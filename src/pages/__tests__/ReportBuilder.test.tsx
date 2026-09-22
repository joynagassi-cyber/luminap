import { describe, expect, it } from "vitest";
import { emptyDraft } from "../ReportBuilder";

describe("ReportBuilder.emptyDraft", () => {
  it("emptyDraft adapte dataSource à kind", () => {
    const d = (kind: any) => emptyDraft(kind);
    expect(d("FEATURE").dataSource).toBe("features");
    expect(d("AUDIT").dataSource).toBe("audit");
    expect(d("FINANCE").dataSource).toBe("transactions");
  });

  it("propose les groupBy par défaut adaptés à kind", () => {
    expect(emptyDraft("FEATURE").groupBy).toEqual(["feature", "lastActivity"]);
    expect(emptyDraft("AUDIT").groupBy).toEqual(["action", "entityType", "actor"]);
    expect(emptyDraft("FINANCE").groupBy).toEqual([]);
    expect(emptyDraft().dataSource).toBe("transactions");
  });
});
