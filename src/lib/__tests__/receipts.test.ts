/**
 * PR9 — pièces justificatives (reçus) sur transactions : tests de comportement
 * du module `src/lib/receipts.ts`.
 *
 * NON-VACUITÉ (vérifiée manuellement) — retirer la logique du correctif fait
 * échouer un test précis, puis la source est restaurée :
 *   - `validateReceiptFile` : supprimer le contrôle de taille → le test
 *     « rejette un fichier trop volumineux » échoue ;
 *   - supprimer le contrôle MIME/extension → le test « rejette un .exe » échoue ;
 *   - retirer le filtre `transaction_id = ?` de `listReceipts` → le test
 *     « ne liste que les justificatifs de la transaction » échoue ;
 *   - ne pas appeler `deleteLuminaFile` dans `removeReceipt` → le test
 *     « supprime aussi le blob » échoue ;
 *   - avaler l'échec de suppression de blob sans `captureClientError` → le test
 *     d'instrumentation échoue.
 *
 * Le mock PowerSync est STATEFUL (il stocke réellement les lignes) : les
 * requêtes SQL réelles de `receipts.ts` sont exercées, pas une copie.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock PowerSync stateful ────────────────────────────────────────────────
const psState = vi.hoisted(() => ({
  rows: [] as Array<Record<string, unknown>>,
}));

vi.mock("@/lib/powersync", () => ({
  getPowerSyncDatabase: vi.fn(() => ({
    execute: vi.fn(async (sql: string, params: any[] = []) => {
      if (/INSERT INTO transaction_attachments/i.test(sql)) {
        const [
          id,
          org_id,
          transaction_id,
          path,
          mime,
          size,
          uploaded_by,
          created_at,
        ] = params;
        psState.rows.push({
          id,
          org_id,
          transaction_id,
          path,
          mime,
          size,
          uploaded_by,
          created_at,
        });
        return { array: [] };
      }
      if (/DELETE FROM transaction_attachments WHERE org_id = \?/i.test(sql)) {
        const [org_id, transaction_id] = params;
        psState.rows = psState.rows.filter(
          (r) => !(r.org_id === org_id && r.transaction_id === transaction_id),
        );
        return { array: [] };
      }
      if (/DELETE FROM transaction_attachments WHERE id = \?/i.test(sql)) {
        const [id] = params;
        psState.rows = psState.rows.filter((r) => r.id !== id);
        return { array: [] };
      }
      if (/SELECT path FROM transaction_attachments WHERE id = \?/i.test(sql)) {
        const [id] = params;
        return { array: psState.rows.filter((r) => r.id === id).map((r) => ({ path: r.path })) };
      }
      if (/SELECT .* FROM transaction_attachments/i.test(sql)) {
        const [org_id, transaction_id] = params;
        return {
          array: psState.rows.filter(
            (r) => r.org_id === org_id && r.transaction_id === transaction_id,
          ),
        };
      }
      return { array: [] };
    }),
  })),
}));

vi.mock("@/lib/storageService", () => ({
  uploadLuminaFile: vi.fn(async (_bucket: string, file: File, subpath?: string) =>
    `org-1/${subpath ?? ""}/${file.name}`,
  ),
  deleteLuminaFile: vi.fn(async () => undefined),
}));

vi.mock("@/lib/clientErrors", () => ({ captureClientError: vi.fn() }));

vi.mock("@/lib/dataLayer", () => ({
  isPowerSyncReadyNow: vi.fn(() => true),
  subscribePowerSyncReady: vi.fn(() => () => {}),
}));

vi.mock("@/lib/orgContext", () => ({
  getOrganizationId: vi.fn(() => "org-1"),
  subscribeOrganization: vi.fn(() => () => {}),
}));

vi.mock("@powersync/react", () => ({
  useQuery: vi.fn(() => ({ data: [] })),
}));

import {
  validateReceiptFile,
  receiptError,
  receiptExtension,
  listReceipts,
  addReceipt,
  removeReceipt,
  purgeReceiptsForTransaction,
  RECEIPT_MAX_BYTES,
} from "@/lib/receipts";
import { uploadLuminaFile, deleteLuminaFile } from "@/lib/storageService";
import { captureClientError } from "@/lib/clientErrors";

const ORG = "org-1";
const TX = "tx-1";

function makeFile(name: string, type: string, size: number): File {
  const file = new File([new Uint8Array(1)], name, { type });
  Object.defineProperty(file, "size", { value: size });
  return file;
}

beforeEach(() => {
  psState.rows = [];
  vi.clearAllMocks();
});

describe("receipts — validation du fichier (taille + type)", () => {
  it("accepte une image et un PDF", () => {
    expect(validateReceiptFile({ name: "recu.jpg", type: "image/jpeg", size: 1024 })).toEqual({
      ok: true,
    });
    expect(
      validateReceiptFile({ name: "facture.pdf", type: "application/pdf", size: 2048 }),
    ).toEqual({ ok: true });
  });

  it("rejette un exécutable (.exe) avec un message FR", () => {
    const res = validateReceiptFile({
      name: "malware.exe",
      type: "application/x-msdownload",
      size: 1024,
    });
    expect(res.ok).toBe(false);
    expect(receiptError(res)).toMatch(/Format non autorisé/i);
  });

  it("rejette un fichier trop volumineux", () => {
    const res = validateReceiptFile({
      name: "gros.pdf",
      type: "application/pdf",
      size: RECEIPT_MAX_BYTES + 1,
    });
    expect(res.ok).toBe(false);
    expect(receiptError(res)).toMatch(/volumineux/i);
  });

  it("rejette un fichier vide", () => {
    const res = validateReceiptFile({ name: "vide.png", type: "image/png", size: 0 });
    expect(res.ok).toBe(false);
  });

  it("receiptExtension extrait l'extension en minuscules", () => {
    expect(receiptExtension("Photo.JPG")).toBe("jpg");
    expect(receiptExtension("sans-extension")).toBe("");
  });
});

describe("receipts — addReceipt", () => {
  it("upload le blob puis insère la ligne (mime + taille conservés)", async () => {
    const file = makeFile("recu.jpg", "image/jpeg", 4096);
    const id = await addReceipt(TX, file, { orgId: ORG, uploadedBy: null, id: "r-1" });

    expect(id).toBe("r-1");
    expect(uploadLuminaFile).toHaveBeenCalledTimes(1);
    expect(psState.rows).toHaveLength(1);
    expect(psState.rows[0]).toMatchObject({
      id: "r-1",
      org_id: ORG,
      transaction_id: TX,
      mime: "image/jpeg",
      size: 4096,
    });
  });

  it("rejette un .exe SANS upload ni ligne", async () => {
    await expect(
      addReceipt(TX, makeFile("x.exe", "application/x-msdownload", 10), { orgId: ORG }),
    ).rejects.toThrow(/Format non autorisé/i);
    expect(uploadLuminaFile).not.toHaveBeenCalled();
    expect(psState.rows).toHaveLength(0);
  });

  it("rejette un fichier trop volumineux SANS upload ni ligne", async () => {
    await expect(
      addReceipt(TX, makeFile("g.pdf", "application/pdf", RECEIPT_MAX_BYTES + 1), {
        orgId: ORG,
      }),
    ).rejects.toThrow(/volumineux/i);
    expect(uploadLuminaFile).not.toHaveBeenCalled();
    expect(psState.rows).toHaveLength(0);
  });
});

describe("receipts — listReceipts (cloisonnement)", () => {
  it("ne renvoie QUE les justificatifs de la transaction demandée", async () => {
    await addReceipt(TX, makeFile("a.jpg", "image/jpeg", 10), { orgId: ORG, id: "r-a" });
    await addReceipt("tx-2", makeFile("b.jpg", "image/jpeg", 10), { orgId: ORG, id: "r-b" });
    await addReceipt(TX, makeFile("c.jpg", "image/jpeg", 10), { orgId: "org-2", id: "r-c" });

    const got = await listReceipts(TX, ORG);
    expect(got.map((r) => r.id)).toEqual(["r-a"]);
  });
});

describe("receipts — removeReceipt", () => {
  it("supprime la ligne ET le blob", async () => {
    await addReceipt(TX, makeFile("a.jpg", "image/jpeg", 10), { orgId: ORG, id: "r-a" });
    await removeReceipt("r-a");

    expect(psState.rows).toHaveLength(0);
    expect(deleteLuminaFile).toHaveBeenCalledWith(
      "expense_proofs",
      expect.stringContaining("a.jpg"),
    );
  });

  it("instrumente un échec de suppression de blob (jamais avalé)", async () => {
    await addReceipt(TX, makeFile("a.jpg", "image/jpeg", 10), { orgId: ORG, id: "r-a" });
    vi.mocked(deleteLuminaFile).mockRejectedValueOnce(new Error("storage down"));

    await removeReceipt("r-a"); // ne lève pas : la ligne est partie

    expect(psState.rows).toHaveLength(0);
    expect(captureClientError).toHaveBeenCalled();
  });
});

describe("receipts — purgeReceiptsForTransaction (pas de blob orphelin)", () => {
  it("supprime les lignes de la transaction et best-effort les blobs", async () => {
    await addReceipt(TX, makeFile("a.jpg", "image/jpeg", 10), { orgId: ORG, id: "r-a" });
    await addReceipt(TX, makeFile("b.pdf", "application/pdf", 10), { orgId: ORG, id: "r-b" });
    await addReceipt("tx-2", makeFile("c.jpg", "image/jpeg", 10), { orgId: ORG, id: "r-c" });

    await purgeReceiptsForTransaction(TX, ORG);

    expect(psState.rows.map((r) => r.id)).toEqual(["r-c"]);
    expect(deleteLuminaFile).toHaveBeenCalledTimes(2);
  });
});
