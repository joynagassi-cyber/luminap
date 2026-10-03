/**
 * PdfPreview — prévisualisation intégrée d'un rapport PDF inter-organisations
 * (Phase 4 Feature 2 — rapports organisations).
 *
 * Rendu canvas via `react-pdf` (pdfjs-dist v6) :
 *  - chargement ON-DEMAND (le composant est lazy depuis la page de détail —
 *    le moteur n'est pas téléchargé si l'utilisateur n'ouvre jamais de PDF) ;
 *  - zoom contrôlé : boutons `-` / `+` (pas de 0.1) + slider 0.5–2.0 +
 *    affichage en % ;
 *  - pagination : « Page N / total » + flèches, bornées aux premières /
 *    dernières pages ;
 *  - erreur : « PDF non disponible — vérifiez la connexion » (URL signée
 *    expirée, hors-ligne, bucket inatteignable) + bouton de re-essai ;
 *  - squelette (animate-pulse) pendant le load.
 *
 * Sécurité du worker : `react-pdf` pose par défaut `workerSrc =
 * 'pdf.worker.mjs'` (chemin relatif cassé sous Vite/Capacitor) — l'import
 * ci-dessous avec `?url` résout l'asset dans le bundle et on le pousse dans
 * `GlobalWorkerOptions` avant tout premier `<Document>` (idempotent).
 *
 * Tokens Lumina uniquement (zéro couleur brute) : le composant n'utilise
 * que les variables CSS du design system (`--surface`, `--canvas`,
 * `--border`, `--text-*`, `--accent-primary`).
 */

import { useCallback, useEffect, useState } from "react";
import {
  Document,
  Page,
  useDocumentContext,
  pdfjs,
} from "react-pdf";
// Import d'asset Vite : génère l'URL du worker dans le bundle (résolu au
// même domaine que l'index.html) — remplace le chemin relatif par défaut.
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import {
  Minus,
  Plus,
  ChevronLeft,
  ChevronRight,
  FileText,
  Download,
  WifiOff,
  RefreshCw,
} from "lucide-react";

// Propage l'URL d'asset du worker à pdfjs (avant tout montage de <Document>).
pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl as string;

interface PdfPreviewProps {
  /** URL signée (30 min) du rapport dans le bucket privé `org_reports`. */
  src: string;
  /** Hauteur du viewport de prévisualisation en pixels (défaut 480). */
  height?: number;
  /** Nom de fichier d'origine (bouton download, label d'erreur). */
  fileName?: string;
  /** Callback après ouverture du téléchargement (tracabilité). */
  onDownload?: () => void;
}

/**
 * Rendu d'UNE page du document. Doit vivre DANS le `<Document>` (contexte
 * pdfjs : proxy du document, registre des pages). `scale` est contrôlé par
 * le parent (zoom 0.5–2.0) ; `width` est calculé en % du viewport.
 */
function PageRender({
  pageNumber,
  scale,
  viewportWidth,
}: {
  pageNumber: number;
  scale: number;
  viewportWidth: number;
}) {
  const ctx = useDocumentContext();
  const pdf = ctx?.pdf as { numPages: number } | false | undefined;

  return (
    <div style={{ width: viewportWidth, margin: "0 auto" }}>
      <Page
        pageNumber={pageNumber}
        width={undefined}
        renderMode="canvas"
        canvasBackground="transparent"
        onRenderSuccess={() => {
          /* canvas peint — rien à faire */
        }}
      />
    </div>
  );
}

/**
 * PdfPreview — lecteur PDF complet (zoom + pagination + download +
 * skeleton + error state). À monter dans un lazy boundary (la page de
 * détail le fait pour différer le téléchargement du moteur de rendu).
 */
export default function PdfPreview({
  src,
  height = 480,
  fileName,
  onDownload,
}: PdfPreviewProps) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [numPages, setNumPages] = useState(0);
  const [page, setPage] = useState(1);
  const [zoom, setZoom] = useState(1.0);
  const [url, setUrl] = useState<string | null>(null);

  // Chargement ON-DEMAND : on requiert l'URL signée seulement au montage
  // (le composant est déjà lazy depuis la page de détail — pas de
  // preflight inutile si l'utilisateur n'ouvre jamais un PDF).
  useEffect(() => {
    let cancelled = false;
    setUrl(null);
    setError(null);
    setLoading(true);
    import("@/lib/storageService")
      .then(({ getReportUrl }) => getReportUrl(src))
      .then((signed) => {
        if (!cancelled) setUrl(signed);
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setLoading(false);
          setError(
            e instanceof Error
              ? e.message
              : "URL signée impossible (hors-ligne ?).",
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [src]);

  const handleLoadSuccess = useCallback((pdf: { numPages: number }) => {
    setNumPages(pdf.numPages);
    setPage(1);
    setLoading(false);
  }, []);

  const handleLoadError = useCallback(() => {
    setLoading(false);
    setError("PDF non disponible — vérifiez la connexion.");
  }, []);

  const retry = useCallback(() => {
    setUrl(null);
    setError(null);
    setLoading(true);
    // Force le re-run du useEffect (dépend de `src`) : on re-trigger via
    // un bump d'état dédié (pas d'option `refresh` sur useQuery).
    setUrl(undefined as unknown as string);
  }, []);

  const zoomBy = useCallback((delta: number) => {
    setZoom((z) => Math.min(2.0, Math.max(0.5, Math.round((z + delta) * 10) / 10)));
  }, []);

  const zoomPercent = Math.round(zoom * 100);

  const handleDownload = async () => {
    if (!url || !fileName) return;
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(objectUrl);
      onDownload?.();
    } catch {
      /* hors-ligne ou CORS — le lien signé reste dispo */
    }
  };

  const zoomBtn = {
    border: "1px solid var(--border)",
    color: "var(--text-primary)",
    backgroundColor: "transparent",
  } as const;

  return (
    <div
      className="space-y-3 rounded-xl p-3"
      style={{
        backgroundColor: "var(--surface)",
        border: "1px solid var(--border)",
      }}
      aria-label="Prévisualisation du rapport PDF"
    >
      {/* Barre de contrôle : zoom + pagination + download */}
      <div
        className="flex items-center gap-2 flex-wrap rounded-lg px-3 py-2"
        style={{ backgroundColor: "var(--canvas)" }}
      >
        <button
          type="button"
          onClick={() => zoomBy(-0.1)}
          disabled={zoom <= 0.5}
          className="w-7 h-7 flex items-center justify-center rounded-full transition-all active:scale-95 disabled:opacity-40"
          style={zoomBtn}
          aria-label="Zoom arrière"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>

        <input
          type="range"
          min={0.5}
          max={2.0}
          step={0.1}
          value={zoom}
          onChange={(e) => setZoom(parseFloat(e.target.value))}
          className="w-28 sm:w-32 cursor-pointer"
          style={{ accentColor: "var(--accent-primary)" }}
          aria-label="Slider de zoom (0,5 à 2,0)"
        />

        <button
          type="button"
          onClick={() => zoomBy(0.1)}
          disabled={zoom >= 2.0}
          className="w-7 h-7 flex items-center justify-center rounded-full transition-all active:scale-95 disabled:opacity-40"
          style={zoomBtn}
          aria-label="Zoom avant"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>

        <span
          className="text-xs font-medium tabular-nums"
          style={{ color: "var(--text-secondary)" }}
        >
          {zoomPercent}%
        </span>

        {/* Pagination */}
        <div className="flex items-center gap-1 ml-auto">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="w-7 h-7 flex items-center justify-center rounded-full transition-all active:scale-95 disabled:opacity-40"
            style={zoomBtn}
            aria-label="Page précédente"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs tabular-nums px-2" style={{ color: "var(--text-secondary)" }}>
            {numPages > 0 ? `Page ${page} / ${numPages}` : "…"}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(Math.max(numPages, 1), p + 1))}
            disabled={numPages === 0 || page >= numPages}
            className="w-7 h-7 flex items-center justify-center rounded-full transition-all active:scale-95 disabled:opacity-40"
            style={zoomBtn}
            aria-label="Page suivante"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {url && fileName && (
          <button
            type="button"
            onClick={handleDownload}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full transition-all active:scale-95"
            style={{
              backgroundColor:
                "color-mix(in srgb, var(--accent-primary) 10%, transparent)",
              color: "var(--accent-primary)",
              border: "1px solid color-mix(in srgb, var(--accent-primary) 25%, transparent)",
            }}
            aria-label={`Télécharger ${fileName}`}
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Télécharger</span>
          </button>
        )}
      </div>

      {/* Squelette (load) */}
      {loading && !error && (
        <div
          className="rounded-lg animate-pulse flex items-center justify-center"
          style={{
            height,
            backgroundColor: "var(--canvas)",
            border: "1px solid var(--border)",
          }}
          aria-busy="true"
          aria-label="Chargement du PDF"
        >
          <FileText className="w-8 h-8" style={{ color: "var(--text-tertiary)" }} />
        </div>
      )}

      {/* Erreur (URL signée expirée, hors-ligne, bucket inatteignable) */}
      {error && (
        <div
          className="rounded-lg p-6 flex flex-col items-center gap-3 text-center"
          style={{
            height,
            backgroundColor: "var(--canvas)",
            border: "1px solid var(--border)",
          }}
          role="alert"
        >
          <WifiOff className="w-8 h-8" style={{ color: "var(--text-tertiary)" }} />
          <p className="text-sm" style={{ color: "var(--text-primary)" }}>
            {error}
          </p>
          {fileName && (
            <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
              Le fichier <strong>{fileName}</strong> n'a pas pu être
              prévisualisé.
            </p>
          )}
          <button
            type="button"
            onClick={retry}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full transition-all active:scale-95"
            style={{
              border: "1px solid var(--border)",
              color: "var(--text-secondary)",
              backgroundColor: "transparent",
            }}
            aria-label="Réessayer le chargement du PDF"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Réessayer
          </button>
        </div>
      )}

      {/* Rendu canvas (dans <Document> pour le contexte pdfjs) */}
      {!loading && !error && url && (
        <Document
          file={url}
          onLoadSuccess={handleLoadSuccess}
          onLoadError={handleLoadError}
          error={<div style={{ height: 0 }} />}
        >
          <div className="overflow-auto" style={{ height }}>
            <PageRender
              pageNumber={page}
              scale={zoom}
              viewportWidth={Math.round(zoom * 794)}
            />
          </div>
        </Document>
      )}

      {/* Notice download secondaire (si le bouton principal est absent) */}
      {!fileName && url && !error && (
        <p className="text-xs text-center" style={{ color: "var(--text-tertiary)" }}>
          Aperçu natif — le fichier est servi via une URL signée (30 min).
        </p>
      )}
    </div>
  );
}
