/**
 * JustificatifsSection — pièces justificatives (reçus) d'une transaction (PR9).
 *
 * Affiche les justificatifs déjà attachés (aperçu/lien), permet d'en AJOUTER
 * (image ou PDF) et d'en SUPPRIMER. Le blob passe par `storageService`
 * (`uploadLuminaFile` / `getDocumentUrl` / `deleteLuminaFile`) et la ligne par
 * `receipts.ts` — aucune seconde mécanique d'upload.
 *
 * R52 : tant que la réplique PowerSync n'a pas répondu, on affiche un
 * SQUElette et JAMAIS « Aucun justificatif » (l'utilisateur croirait avoir
 * perdu ses reçus).
 */
import { useEffect, useState } from "react";
import { FileText, FileImage, Plus, Trash2, Paperclip } from "lucide-react";
import { ListSkeleton } from "@/components/Skeleton";
import {
  useReceipts,
  addReceipt,
  removeReceipt,
  RECEIPT_ALLOWED_MIME,
  validateReceiptFile,
  receiptError,
  type PSReceipt,
} from "@/lib/receipts";
import { getDocumentUrl } from "@/lib/storageService";
import { captureClientError } from "@/lib/clientErrors";

function ReceiptIcon({ mime }: { mime?: string | null }) {
  const cls = "w-4 h-4 flex-shrink-0";
  const color = "var(--text-secondary)";
  if (mime === "application/pdf")
    return <FileText className={cls} style={{ color }} />;
  return <FileImage className={cls} style={{ color }} />;
}

export default function JustificatifsSection({
  transactionId,
}: {
  transactionId: string;
}) {
  const { data: receipts, isLoading } = useReceipts(transactionId);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    for (const r of receipts) {
      if (urls[r.id]) continue;
      getDocumentUrl("expense_proofs", r.path)
        .then((u) => setUrls((p) => ({ ...p, [r.id]: u })))
        .catch(() => {
          /* hors ligne — l'aperçu reste indisponible, le lien aussi */
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [receipts]);

  const handleAdd = async (file: File | undefined) => {
    if (!file) return;
    const check = validateReceiptFile(file);
    if (!check.ok) {
      setError(receiptError(check));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await addReceipt(transactionId, file);
    } catch (err) {
      captureClientError(err, {
        message: "Ajout d'un justificatif échoué",
        route: "JustificatifsSection.add",
      });
      setError(
        err instanceof Error && err.message
          ? err.message
          : "Ajout impossible (hors ligne ou accès refusé).",
      );
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async (r: PSReceipt) => {
    setBusy(true);
    setError(null);
    try {
      await removeReceipt(r.id);
    } catch (err) {
      captureClientError(err, {
        message: "Suppression d'un justificatif échouée",
        route: "JustificatifsSection.remove",
      });
      setError("Suppression impossible.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="rounded-xl p-4 mb-6"
      style={{
        backgroundColor: "var(--surface)",
        border: "1px solid var(--border)",
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <p className="text-text-tertiary text-xs font-medium flex items-center gap-1.5">
          <Paperclip className="w-3.5 h-3.5" />
          Justificatifs
          {receipts.length > 0 && (
            <span
              className="text-xs px-1.5 py-0.5 rounded-full font-medium"
              style={{
                backgroundColor: "var(--surface-hover)",
                color: "var(--text-secondary)",
              }}
            >
              {receipts.length}
            </span>
          )}
        </p>
        {busy && (
          <span className="text-xs text-text-tertiary">Envoi...</span>
        )}
      </div>

      {/* R52 — squelette tant que la réplique n'a pas répondu : jamais un faux
          « aucun justificatif ». */}
      {isLoading ? (
        <div aria-busy="true">
          <ListSkeleton count={2} />
        </div>
      ) : receipts.length === 0 ? (
        <p className="text-text-tertiary text-xs">
          Aucun justificatif joint pour le moment.
        </p>
      ) : (
        <ul className="space-y-2">
          {receipts.map((r) => (
            <li
              key={r.id}
              className="flex items-center gap-2 rounded-lg p-2"
              style={{ border: "1px solid var(--border)" }}
            >
              {urls[r.id] && r.mime?.startsWith("image/") ? (
                <img
                  src={urls[r.id]}
                  alt="Justificatif"
                  className="w-10 h-10 rounded object-cover"
                />
              ) : (
                <span
                  className="w-10 h-10 rounded flex items-center justify-center"
                  style={{ backgroundColor: "var(--surface-hover)" }}
                >
                  <ReceiptIcon mime={r.mime} />
                </span>
              )}
              <div className="flex-1 min-w-0">
                {urls[r.id] ? (
                  <a
                    href={urls[r.id]}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm text-accent-primary truncate block"
                  >
                    {r.mime === "application/pdf" ? "Voir le PDF" : "Voir l'image"}
                  </a>
                ) : (
                  <span className="text-sm text-text-tertiary">
                    Indisponible hors ligne
                  </span>
                )}
                <span className="text-xs text-text-tertiary">
                  {r.size ? `${Math.round(r.size / 1024)} Ko` : ""}
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleRemove(r)}
                disabled={busy}
                className="p-2 rounded-full"
                style={{ color: "var(--danger, var(--text-secondary))" }}
                aria-label="Supprimer le justificatif"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {error && (
        <p className="text-xs mt-2" style={{ color: "var(--danger)" }}>
          {error}
        </p>
      )}

      <label
        className="mt-3 py-2.5 rounded-full text-sm font-medium text-center cursor-pointer flex items-center justify-center gap-1.5"
        style={{
          backgroundColor: "var(--surface-hover)",
          color: "var(--text-primary)",
        }}
      >
        <Plus className="w-4 h-4" />
        Ajouter un justificatif
        <input
          type="file"
          accept={RECEIPT_ALLOWED_MIME.join(",")}
          className="hidden"
          disabled={busy}
          onChange={(e) => {
            const f = e.target.files?.[0];
            void handleAdd(f);
            e.target.value = "";
          }}
        />
      </label>
      <p className="text-xs text-text-tertiary mt-2">
        Image (JPG, PNG, WEBP, GIF) ou PDF — 10 Mo maximum.
      </p>
    </div>
  );
}
