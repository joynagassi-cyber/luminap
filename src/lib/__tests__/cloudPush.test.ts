/**
 * cloudPush — the send path for OneSignal cloud push.
 *
 * NON-VACUITÉ (preuve documentée) :
 *   - Retirer la garde `if (!supabaseUrl || !anonKey) return { sent:false,
 *     reason:"no-config" }` → le test « sans config » échoue (fetch appelé).
 *   - Retirer la garde `if (!accessToken) return { sent:false,
 *     reason:"no-session" }` → le test « sans session » échoue (fetch appelé).
 *   - Ne pas tester `res.ok` (toujours `sent:true`) → le test « refus » échoue.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { sendCloudPush } from "../cloudPush";

const { getSessionMock } = vi.hoisted(() => ({
  getSessionMock: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  authService: { getSession: getSessionMock },
}));

const fetchMock = vi.fn();

describe("sendCloudPush", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("VITE_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("VITE_SUPABASE_ANON_KEY", "anon-key");
    vi.stubGlobal("fetch", fetchMock);
    getSessionMock.mockResolvedValue({ access_token: "jwt-token" });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("envoie le push via l'edge function avec le JWT et les tags", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, oneSignalId: "os-1" }),
    });

    const result = await sendCloudPush({
      title: "T",
      message: "M",
      targetRole: "TREASURIER",
      orgId: "org-1",
      extraData: { kind: "X" },
    });

    expect(result).toEqual({ sent: true, oneSignalId: "os-1" });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain("/functions/v1/onesignal-notify");
    expect(init.method).toBe("POST");
    expect(init.headers.Authorization).toBe("Bearer jwt-token");
    const body = JSON.parse(init.body);
    expect(body).toMatchObject({
      title: "T",
      message: "M",
      targetRole: "TREASURIER",
      orgId: "org-1",
      data: { kind: "X" },
    });
  });

  it("ne fait AUCUN appel réseau sans configuration Supabase", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "");
    vi.stubEnv("VITE_SUPABASE_ANON_KEY", "");
    const result = await sendCloudPush({ title: "T", message: "M" });
    expect(result).toEqual({ sent: false, reason: "no-config" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("ne fait AUCUN appel réseau sans session authentifiée", async () => {
    getSessionMock.mockResolvedValue(null);
    const result = await sendCloudPush({ title: "T", message: "M" });
    expect(result).toEqual({ sent: false, reason: "no-session" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("signale un refus de l'edge function sans lever", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({ error: "Ciblage requis" }),
    });
    const result = await sendCloudPush({ title: "T", message: "M" });
    expect(result).toEqual({ sent: false, reason: "rejected" });
  });

  it("capture une erreur réseau sans lever", async () => {
    fetchMock.mockRejectedValue(new Error("network down"));
    const result = await sendCloudPush({ title: "T", message: "M" });
    expect(result).toEqual({ sent: false, reason: "error" });
  });
});
