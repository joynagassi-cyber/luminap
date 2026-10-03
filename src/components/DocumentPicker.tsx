/**
 * DocumentPicker — sélection de documents uploadés à joindre à un rapport
 * de gestion inter-organisations (Phase 3 Feature 2).
 *
 * Lit `useDocuments()` (PowerSync — 100 % offline-first) et affiche une
 * checklist (case à cocher + titre + objet + icône par `mime_type`).
 * Le parent alimente `document_refs` du rapport via `onChange(selectedIds)`.
 *
 * Optionnel : bouton « + Ajouter des documents » (IonInput type="file") qui
 * upload le fichier dans le bucket `archives` (Storage Supabase) puis en
 *registre la métadonnée via `addDocumentPS` — le document apparaît alors
 * dans la checklist (PowerSync outbox ; le rafraîchissement passe par
 * l'option `refreshKey` du parent qui re-monte la requête).
 */

import { useState } from "react";
import {
  IonItem,
  IonLabel,
  IonCheckbox,
  IonInput,
  IonChangeCustomEvent,
} from "@ionic/react";
import {
  FileText,
  FileImage,
  File,
  Plus,
  Paperclip,
  UploadCloud,
} from "lucide-react";
import { useDocuments, addDocumentPS, type PSDocument } from "@/lib/dataLayer";
import { uploadLuminaFile } from "@/lib/storageService";

/** Icône par `mime_type` (fallback : document générique). */
function DocIcon({ mime }: { mime?: string | null }) {
  const cls = "w-4 h-4 flex-shrink-0";
  const color = "var(--text-secondary)";
  if (!mime) return <File className={cls} style={{ color }} />;
  if (mime.startsWith("image/")) return <FileImage className={cls} style={{ color }} />;
  if (mime === "application/pdf")
    return <FileText className={cls} style={{ color }} />;
  return <File className={cls} style={{ color }} />;
}

export default function DocumentPicker({
  selectedIds,
  onChange,
  /** Rafraîchit la liste des documents (ex. après upload d'un fichier). */
  refreshKey,
  /** Callback appelé après upload réussi (le parent peut bump `refreshKey`). */
  onUploaded,
}: {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  refreshKey?: number;
  onUploaded?: () => void;
}) {
  const { data: documents } = useDocuments();
  void refreshKey; // la liste suit `useDocuments` ; le parent contrôle le refresh
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const toggle = (id: string) => {
    onChange(
      selectedIds.includes(id)
        ? selectedIds.filter((x) => x !== id)
        : [...selectedIds, id],
    );
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    try {
      const path = await uploadLuminaFile("archives", file);
      await addDocumentPS({
        title: file.name.replace(/\.[^.]+$/, ""),
        purpose: "Pièce jointe au rapport",
        bucket: "archives",
        file_path: path,
        file_size: file.size,
        mime_type: file.type || null,
        entity_type: "ARCHIVE_DOC",
        status: "ACTIVE",
      });
      setFile(null);
      onUploaded?.();
    } catch {
      setUploadError(
        "Upload impossible (hors ligne ou accès refusé). Le document n'a pas été ajouté.",
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Paperclip className="w-4 h-4" style={{ color: "var(--accent-primary)" }} />
        <span className="text-text-primary font-semibold text-sm">
          Documents joints
        </span>
        {selectedIds.length > 0 && (
          <span
            className="text-xs px-1.5 py-0.5 rounded-full font-medium"
            style={{
              backgroundColor: "var(--surface-hover)",
              color: "var(--text-secondary)",
            }}
          >
            {selectedIds.length}
          </span>
        )}
      </div>

      {/* Checklist des documents uploadés (bucket `archives`) */}
      {documents && documents.length === 0 ? (
        <div
          className="rounded-xl p-4 text-center"
          style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <File className="w-5 h-5 mx-auto mb-2" style={{ color: "var(--text-tertiary)" }} />
          <p className="text-text-tertiary text-sm">Aucun document uploadé pour le moment.</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {documents?.map((doc: PSDocument) => {
            const checked = selectedIds.includes(doc.id);
            return (
              <div
                key={doc.id}
                className="rounded-xl p-3"
                style={{
                  backgroundColor: checked
                    ? "color-mix(in srgb, var(--accent-primary) 8%, var(--surface))"
                    : "var(--surface)",
                  border: "1px solid " + (checked ? "var(--accent-primary)" : "var(--border)"),
                }}
              >
                <div className="flex items-start gap-2">
                  <IonCheckbox
                    data-testid={`doc-pick-${doc.id}`}
                    checked={checked}
                    onIonChange={(e: IonChangeCustomEvent<boolean>) =>
                      toggle(doc.id)
                    }
                    aria-label={`Sélectionner ${doc.title}`}
                    style={{ marginTop: 2 }}
                  />
                  <DocIcon mime={doc.mime_type} />
                  <div className="flex-1 min-w-0">
                    <p className="text-text-primary text-sm font-medium truncate">
                      {doc.title}
                    </p>
                    {doc.purpose && (
                      <p className="text-text-tertiary text-xs truncate">{doc.purpose}</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* + Ajouter des documents (upload bucket `archives`) */}
      <div className="space-y-2">
        <IonItem lines="none" className="bg-card rounded-xl">
          <IonLabel position="floating" className="text-sm text-text-secondary">
            Ajouter un document
          </IonLabel>
          <IonInput
            type="file"
            data-testid="doc-picker-file"
            onIonChange={(e: IonChangeCustomEvent<unknown>) => {
              const v = e.detail.value;
              // Ionic IonInput renvoie un array-like de File : on prend le 1er.
              const f = Array.isArray(v) ? (v[0] as File | undefined) : (v as File | undefined);
              setFile(f ?? null);
            }}
            slot="input"
            style={{
              backgroundColor: "var(--card)",
              border: "1px solid var(--border)",
            }}
          />
        </IonItem>
        <button
          type="button"
          onClick={handleUpload}
          disabled={uploading || !file}
          className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-full text-sm font-semibold transition-all active:scale-95 disabled:opacity-50"
          style={{
            backgroundColor: "transparent",
            color: "var(--accent-primary)",
            border: "1px solid var(--accent-primary)",
          }}
          aria-label="Uploader le document"
        >
          {uploading ? (
            <>
              <UploadCloud className="w-4 h-4" /> Envoi...
            </>
          ) : (
            <>
              <Plus className="w-4 h-4" /> Uploader et joindre
            </>
          )}
        </button>
        {uploadError && (
          <p className="text-xs" style={{ color: "var(--data-expense)" }}>
            {uploadError}
          </p>
        )}
      </div>
    </div>
  );
}
