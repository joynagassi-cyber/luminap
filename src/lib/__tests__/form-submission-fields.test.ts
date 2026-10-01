// @vitest-environment node
import { describe, it, expect } from "vitest";
import type { FormSubmission } from "@/types";

describe("FormSubmission — champs de rejet", () => {
  it("accepte rejectedBy / rejectionReason optionnels", () => {
    const s: FormSubmission = {
      id: "s1",
      orgId: "org1",
      formDefinitionId: "f1",
      formVersion: 1,
      submittedBy: "local-user",
      submittedAt: "2026-10-01T00:00:00Z",
      data: {},
      status: "REJECTED",
      createdAt: "2026-10-01T00:00:00Z",
      rejectedBy: "admin-1",
      rejectionReason: "pièce jointe manquante",
    };
    expect(s.rejectedBy).toBe("admin-1");
    expect(s.rejectionReason).toBe("pièce jointe manquante");
  });
});
