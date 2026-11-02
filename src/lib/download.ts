// downloadBlob() : point de sortie UNIQUE de tous les exports (CSV, PDF,
// XLSX, JSON, DOCX…) de l'application.
//
// Bug P0-2 : l'ancienne implémentation (Blob -> URL.createObjectURL ->
// <a download>) ne télécharge RIEN dans la WebView Android de Capacitor
// (aucun DownloadListener) — chaque bouton « Exporter » restait muet.
//
// Stratégie selon la plateforme :
//  - Web (navigateur) : le pattern <a download> classique, inchangé.
//  - Natif (Capacitor Android/iOS) : écriture du fichier dans le cache de
//    l'app via @capacitor/filesystem, puis ouverture de la feuille de
//    partage système via @capacitor/share (l'utilisateur enregistre le
//    fichier où il veut : Fichiers, Drive, WhatsApp…).
//
// Un échec n'est JAMAIS silencieux : toast d'erreur explicite. L'annulation
// de la feuille de partage par l'utilisateur n'est pas une erreur.
import { Capacitor } from "@capacitor/core";
import { showError } from "@/utils/toast";

async function blobToBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

function sanitizeFilename(filename: string): string {
  return filename.replace(/[\\/:*?"<>|]/g, "-");
}

async function downloadBlobNative(blob: Blob, filename: string): Promise<void> {
  const [{ Filesystem, Directory }, { Share }] = await Promise.all([
    import("@capacitor/filesystem"),
    import("@capacitor/share"),
  ]);
  const safeName = sanitizeFilename(filename);
  const data = await blobToBase64(blob);
  const written = await Filesystem.writeFile({
    path: safeName,
    data,
    directory: Directory.Cache,
  });
  await Share.share({
    title: safeName,
    url: written.uri,
    dialogTitle: "Enregistrer / partager le fichier",
  });
}

function downloadBlobWeb(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = sanitizeFilename(filename);
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function downloadBlob(
  blob: Blob,
  filename: string,
): Promise<void> {
  try {
    if (Capacitor.isNativePlatform()) {
      await downloadBlobNative(blob, filename);
    } else {
      downloadBlobWeb(blob, filename);
    }
  } catch (e: any) {
    // Feuille de partage refermée par l'utilisateur : pas une erreur.
    if (/cancel/i.test(String(e?.message ?? ""))) return;
    // Import statique volontaire : un `import()` dynamique de
    // "@/utils/toast" ici fait fusionner le chunk @ionic/core (1,1 Mo)
    // dans le chunk d'entrée (heuristique rolldown, vérifié par build)
    // et fait exploser le budget entry_raw_kb (perf-budget.test.ts).
    showError("L'export a échoué. Vérifiez l'espace disponible puis réessayez.");
    if (typeof console !== "undefined") {
      console.error("[download] export failed", filename, e);
    }
  }
}
