// M13 — downloadBlob() : encapsule la création d'un lien de téléchargement
// (Blob -> URL.createObjectURL -> <a>.click()) pour les exports CSV/JSON des
// pages (FormSubmissions, InvitationEmit, ReportBuilder). Sur le web
// (navigateur ou Capacitor WebView Android) ce pattern est le plus fiable :
// pas de dépendance native requise. Sur une future couche Capacitor 100 %
// native (hors WebView), remplacer par @capacitor/filesystem + Share —
// en gardant cette signature identique (les pages ne changent pas).
export function downloadBlob(
  blob: Blob,
  filename: string,
): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
