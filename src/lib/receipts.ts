/**
 * Pièces justificatives (reçus) attachées à une transaction — PR9.
 *
 * Un justificatif = un blob (image ou PDF) dans le bucket Storage PRIVÉ
 * `expense_proofs` + une ligne de métadonnée dans la table synchronisée
 * `transaction_attachments` (org_id, transaction_id, path, mime, size…).
 *
 * INTÉGRATION (pas de second mécanisme d'upload) :
 *   - l'upload/suppression du blob passent par `storageService`
 *     (`uploadLuminaFile` / `deleteLuminaFile`), comme `DocumentPicker` ;
 *   - les lignes passent par le data layer PowerSync (`getPowerSyncDatabase`),
 *     chemin d'écriture applicatif habituel (cf. `orgSettings.ts`).
 *
 * BORNE : taille maximale et types MIME autorisés (images + PDF) — tout autre
 * fichier est REJETÉ avec un message FR (règle produit : « images ou PDF »).
 * La validation regarde le MIME **et** l'extension, car un navigateur peut
 * annoncer un `type` vide (ou mentir) pour un `.exe`.
 *
 * Cloisonnement : toute lecture/écriture est bornée à l'organisation courante
 * (`orgContext`), et le chemin Storage est préfixé par `org_id` (RLS Storage,
 * migration 20261022000013).
 */
import { getPowerSyncDatabase } from "@/lib/powersync";
import { getOrganizationId, subscribeOrganization } from "./orgContext";
import { uploadLuminaFile, deleteLuminaFile } from "./storageService";
import { captureClientError } from "./clientErrors";
import { isPowerSyncReadyNow, subscribePowerSyncReady } from "@/lib/dataLayer";
import { useQuery } from "@powersync/react";
import { useEffect, useState } from "react";

/** Bucket Storage des justificatifs (privé, scopé par organisation). */
export const RECEIPT_BUCKET = "expense_proofs" as const;

/** Taille maximale acceptée (10 Mo). */
export const RECEIPT_MAX_BYTES = 10 * 1024 * 1024;

/** Types MIME autorisés (images + PDF). */
export const RECEIPT_ALLOWED_MIME = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
] as const;

/** Extensions autorisées (garde-fou quand le MIME est vide ou falsifié). */
export const RECEIPT_ALLOWED_EXT = [
  "jpg",
  "jpeg",
  "png",
  "webp",
  "gif",
  "pdf",
] as const;

/** Vue PowerSync d'un justificatif. */
export interface PSReceipt {
  id: string;
  org_id: string;
  transaction_id: string;
  path: string;
  mime: string | null;
  size: number | null;
  uploaded_by: string | null;
  created_at: string;
}

export type ReceiptValidation = { ok: true } | { ok: false; error: string };

/** Message d'erreur d'une validation en échec (sinon chaîne vide). */
export function receiptError(v: ReceiptValidation): string {
  return "error" in v ? v.error : "";
}

/** Extension en minuscules, sans le point (chaîne vide si absente). */
export function receiptExtension(name: string): string {
  const m = /\.([^.\\/]+)$/.exec(name ?? "");
  return m ? m[1].toLowerCase() : "";
}

/**
 * Valide un fichier candidat (PURE, testable sans navigateur ni réseau).
 * Rejette : type/ext non autorisé, taille nulle ou supérieure à la borne.
 */
export function validateReceiptFile(file: {
  name?: string;
  type?: string;
  size?: number;
}): ReceiptValidation {
  const ext = receiptExtension(file?.name ?? "");
  const mime = (file?.type ?? "").toLowerCase();
  const mimeOk = (RECEIPT_ALLOWED_MIME as readonly string[]).includes(mime);
  const extOk = (RECEIPT_ALLOWED_EXT as readonly string[]).includes(ext);
  if (!mimeOk && !extOk) {
    return {
      ok: false,
      error:
        "Format non autorisé. Joignez une image (JPG, PNG, WEBP, GIF) ou un PDF.",
    };
  }
  const size = file?.size ?? 0;
  if (size <= 0) {
    return { ok: false, error: "Le fichier est vide ou illisible." };
  }
  if (size > RECEIPT_MAX_BYTES) {
    return {
      ok: false,
      error: "Fichier trop volumineux : 10 Mo maximum.",
    };
  }
  return { ok: true };
}

const SELECT_COLUMNS =
  "id, org_id, transaction_id, path, mime, size, uploaded_by, created_at";

/**
 * Justificatifs d'UNE transaction (bornés à l'organisation courante).
 */
export async function listReceipts(
  transactionId: string,
  orgId: string = getOrganizationId(),
): Promise<PSReceipt[]> {
  const db = getPowerSyncDatabase();
  const res = await db.execute(
    `SELECT ${SELECT_COLUMNS} FROM transaction_attachments
      WHERE org_id = ? AND transaction_id = ?
      ORDER BY created_at DESC`,
    [orgId, transactionId],
  );
  return ((res?.array ?? []) as unknown) as PSReceipt[];
}

/**
 * Attache un justificatif : valide le fichier, upload le blob, puis enregistre
 * la métadonnée. Renvoie l'`id` de la ligne créée. Lève une erreur FR si le
 * fichier est refusé (type/taille).
 */
export async function addReceipt(
  transactionId: string,
  file: File,
  opts?: { orgId?: string; uploadedBy?: string | null; id?: string },
): Promise<string> {
  const check = validateReceiptFile(file);
  if (!check.ok) throw new Error(receiptError(check));

  const orgId = opts?.orgId ?? getOrganizationId();
  const path = await uploadLuminaFile(RECEIPT_BUCKET, file, `tx/${transactionId}`);
  const id = opts?.id ?? crypto.randomUUID();
  const now = new Date().toISOString();
  const db = getPowerSyncDatabase();
  await db.execute(
    `INSERT INTO transaction_attachments
      (id, org_id, transaction_id, path, mime, size, uploaded_by, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      orgId,
      transactionId,
      path,
      file.type || null,
      file.size,
      opts?.uploadedBy ?? null,
      now,
    ],
  );
  return id;
}

/**
 * Retire un justificatif : supprime la ligne puis, en best-effort, le blob
 * Storage. Un échec de suppression du blob est INSTRUMENTÉ (jamais avalé) mais
 * ne fait pas échouer l'opération (la ligne — source de vérité — est partie).
 */
export async function removeReceipt(id: string): Promise<void> {
  const db = getPowerSyncDatabase();
  const res = await db.execute(
    `SELECT path FROM transaction_attachments WHERE id = ?`,
    [id],
  );
  const row = ((res?.array ?? []) as Array<{ path?: string }>)[0];
  await db.execute(`DELETE FROM transaction_attachments WHERE id = ?`, [id]);
  if (row?.path) {
    try {
      await deleteLuminaFile(RECEIPT_BUCKET, row.path);
    } catch (err) {
      captureClientError(err, {
        message: "Suppression du blob justificatif échouée (blob orphelin possible)",
        route: "receipts.removeReceipt",
      });
    }
  }
}

/**
 * Supprime TOUS les justificatifs d'une transaction (lignes + blobs) —
 * appelé avant la suppression de la transaction pour ne pas laisser de blob
 * orphelin. Best-effort : une erreur est instrumentée, jamais propagée.
 */
export async function purgeReceiptsForTransaction(
  transactionId: string,
  orgId: string = getOrganizationId(),
): Promise<void> {
  let receipts: PSReceipt[] = [];
  try {
    receipts = await listReceipts(transactionId, orgId);
    const db = getPowerSyncDatabase();
    await db.execute(
      `DELETE FROM transaction_attachments WHERE org_id = ? AND transaction_id = ?`,
      [orgId, transactionId],
    );
  } catch (err) {
    captureClientError(err, {
      message: "Purge des justificatifs d'une transaction échouée",
      route: "receipts.purgeReceiptsForTransaction",
    });
    return;
  }
  for (const r of receipts) {
    try {
      await deleteLuminaFile(RECEIPT_BUCKET, r.path);
    } catch (err) {
      captureClientError(err, {
        message: "Suppression du blob justificatif échouée (blob orphelin possible)",
        route: "receipts.purgeReceiptsForTransaction",
      });
    }
  }
}

/**
 * Hook réactif : justificatifs d'une transaction.
 *
 * R52 — `isLoading` reste VRAI tant que la réplique n'a pas répondu : on ne
 * rend JAMAIS « aucun justificatif » avant la première lecture (un utilisateur
 * croirait avoir perdu ses reçus).
 */
export function useReceipts(transactionId?: string) {
  // Re-rendu forcé quand la réplique devient prête ou quand l'organisation
  // change : `isPowerSyncReadyNow()` n'est pas réactif par lui-même.
  const [ready, setReady] = useState(() => isPowerSyncReadyNow());
  useEffect(() => {
    const sync = () => setReady(isPowerSyncReadyNow());
    const unsubOrg = subscribeOrganization(sync);
    const unsubReady = subscribePowerSyncReady(sync);
    sync();
    return () => {
      unsubOrg();
      unsubReady();
    };
  }, []);

  const { data } = useQuery<PSReceipt>(
    `SELECT ${SELECT_COLUMNS} FROM transaction_attachments
      WHERE org_id = ? AND transaction_id = ?
      ORDER BY created_at DESC`,
    [getOrganizationId(), transactionId ?? ""],
    { reportFetching: true },
  );

  return {
    data: data ?? [],
    isLoading: data === undefined || !ready,
  };
}
