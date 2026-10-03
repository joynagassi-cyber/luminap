/**
 * Supabase Storage — couche d'accès aux buckets Lumina.
 *
 * Buckets :
 *  - `logos`          : PUBLIC — logos de l'église / organisation uploadés.
 *  - `archives`       : PRIVÉ — documents archivés (nom + objet).
 *  - `expense_proofs` : PRIVÉ — photos/preuves de dépenses.
 *  - `org_reports`    : PRIVÉ — rapports de gestion inter-organisations
 *                       (pdf/docx/xlsx/png), clés `org_reports/<from_org>/<period_start>-<format>`.
 *
 * Le métadonnée (titre, objet, chemin, statut) vit dans la table
 * `documents` (synchronisée PowerSync) ; les fichiers ici.
 */
import { supabase } from "@/integrations/supabase/client";
import { getOrganizationId } from "./orgContext";

export type LuminaBucket = "logos" | "archives" | "expense_proofs" | "org_reports";

const PUBLIC_BUCKETS: Record<string, boolean> = {
  logos: true,
  archives: false,
  expense_proofs: false,
  org_reports: false,
};

function assertKnownBucket(bucket: LuminaBucket): void {
  if (!(bucket in PUBLIC_BUCKETS)) {
    throw new Error(`Bucket inconnu : ${bucket}`);
  }
}

/**
 * Upload un fichier (image/document) dans un bucket. Renvoie le chemin
 * final dans le bucket. Échoue (throw) si hors-ligne ou refusé.
 */
export async function uploadLuminaFile(
  bucket: LuminaBucket,
  file: File,
  subpath?: string,
): Promise<string> {
  assertKnownBucket(bucket);
  const orgId = getOrganizationId();
  const safeName = (file.name || "fichier").replace(/[^\w.]/g, "_");
  const ts = Date.now();
  const ext = (safeName.split(".").pop() || "").slice(0, 10);
  const path = subpath
    ? `${orgId}/${subpath}/${ts}-${safeName}`
    : `${orgId}/${ts}-${safeName}${ext ? `.${ext}` : ""}`;

  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });
  if (error) {
    throw new Error(`Upload ${bucket} échoué : ${error.message}`);
  }
  return path;
}

/**
 * URL de téléchargement d'un fichier :
 *  - bucket public  → URL publique stable (fonctionne sans session) ;
 *  - bucket privé   → URL signée (30 min). Nécessite le réseau.
 */
export async function getDocumentUrl(
  bucket: LuminaBucket,
  filePath: string,
): Promise<string> {
  assertKnownBucket(bucket);
  if (PUBLIC_BUCKETS[bucket]) {
    const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
    return data.publicUrl;
  }
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(filePath, 30 * 60);
  if (error || !data) {
    throw new Error(`URL signée impossible : ${error?.message ?? "inconnue"}`);
  }
  return data.signedUrl;
}

/** Supprime un fichier du bucket (nettoyage uniquement ; non bloquant). */
export async function deleteLuminaFile(
  bucket: LuminaBucket,
  filePath: string,
): Promise<void> {
  assertKnownBucket(bucket);
  await supabase.storage.from(bucket).remove([filePath]);
}

// ============================================================
// Rapports inter-organisations (Phase 1 Feature 2)
//   Bucket privé `org_reports` — clés `org_reports/<from_org>/<period_start>-<format>`.
// ============================================================

/** Upload d'un rapport (pdf/docx/xlsx/png) dans le bucket privé `org_reports`. */
export async function uploadReportFile(
  file: File,
  orgReports: { from_org_id: string; period_start: string; format: string },
): Promise<string> {
  assertKnownBucket("org_reports");
  const safeFormat = orgReports.format.replace(/[^a-z0-9]/gi, "").toLowerCase();
  const path = `org_reports/${orgReports.from_org_id}/${orgReports.period_start}-${safeFormat}`;

  const { error } = await supabase.storage
    .from("org_reports")
    .upload(path, file, {
      contentType: file.type || "application/octet-stream",
      upsert: true,
    });
  if (error) {
    throw new Error(`Upload org_reports échoué : ${error.message}`);
  }
  return path;
}

/** URL signée (30 min) pour lire un rapport dans le bucket privé `org_reports`. */
export async function getReportUrl(pdfPath: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from("org_reports")
    .createSignedUrl(pdfPath, 30 * 60);
  if (error || !data) {
    throw new Error(`URL signée rapport impossible : ${error?.message ?? "inconnue"}`);
  }
  return data.signedUrl;
}
