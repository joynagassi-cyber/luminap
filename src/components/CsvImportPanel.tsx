/**
 * Import CSV sécurisé (PR12) — panneau de prévisualisation + import.
 *
 * Flux en deux temps, jamais d'écriture aveugle :
 *   1. l'utilisateur choisit un fichier → il est ANALYSÉ (`parseTransactionCsv`,
 *      module pur, immunisé contre l'injection de formules) et un PLAN
 *      d'import est construit (`buildTransactionImportPlan`) : chaque ligne est
 *      validée par `validateAddTransaction` (source de vérité partagée) ;
 *   2. un APERÇU (premières lignes) + un RAPPORT d'erreurs par ligne sont
 *      affichés AVANT toute écriture ; l'utilisateur confirme, puis seules les
 *      lignes valides sont écrites (en statut BROUILLON), via la couche de
 *      données (donc synchronisées et auditées).
 *
 * Un fichier mal formé, un en-tête non conforme ou un dépassement de bornes est
 * refusé avec un message FR — jamais par une exception.
 */
import { useRef, useState } from "react";
import {
  FileSpreadsheet,
  FileDown,
  Upload,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { ListSkeleton } from "@/components/Skeleton";
import { useCurrentUser } from "@/lib/dataLayer";
import { useLocalStore } from "@/store/useLocalStore";
import { getOrganizationId } from "@/lib/orgContext";
import { downloadBlob } from "@/lib/download";
import { captureClientError } from "@/lib/clientErrors";
import { toast } from "@/components/ui/use-toast";
import { isFeatureEnabled } from "@/lib/featureFlags";
import { security } from "@/capabilities/security";
import {
  parseTransactionCsv,
  buildTransactionImportPlan,
  runTransactionImport,
  transactionImportTemplate,
  TRANSACTION_IMPORT_COLUMNS,
  type CsvParseResult,
  type ImportPlan,
} from "@/lib/csvImport";
import type { Role } from "@/types";

/** Nombre de lignes montrées dans l'aperçu avant confirmation. */
const PREVIEW_ROWS = 5;

export default function CsvImportPanel() {
  const user = useCurrentUser();
  const addTransaction = useLocalStore((s) => s.addTransaction);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsed, setParsed] = useState<CsvParseResult | null>(null);
  const [plan, setPlan] = useState<ImportPlan | null>(null);

  const enabled = isFeatureEnabled("csv-import");
  const canCreate = security.hasPermission(
    user?.role as Role,
    "transaction:create",
  );

  if (!enabled || !canCreate) return null;

  const reset = () => {
    setFileName(null);
    setParsed(null);
    setPlan(null);
  };

  const handleFile = async (file: File) => {
    setLoading(true);
    reset();
    setFileName(file.name);
    try {
      const text = await file.text();
      const result = parseTransactionCsv(text);
      const builtPlan = result.ok
        ? buildTransactionImportPlan(result, {
            orgId: getOrganizationId(),
            createdById: user?.id ?? "local-user",
          })
        : null;
      setParsed(result);
      setPlan(builtPlan);
    } catch (err) {
      captureClientError(err, {
        message: "Import CSV : lecture du fichier échouée",
        route: "/settings/gestion",
      });
      toast({
        title: "Lecture impossible",
        description: "Le fichier n'a pas pu être lu. Réessayez.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!plan || importing) return;
    setImporting(true);
    try {
      const summary = await runTransactionImport(plan, async (input) => {
        await addTransaction(input);
      });
      if (summary.errors.length > 0) {
        captureClientError(new Error(summary.errors[0].message), {
          message: "Import CSV : écritures partielles",
          route: "/settings/gestion",
        });
        toast({
          title: "Import partiel",
          description: `${summary.imported} brouillon(s) importé(s), ${summary.errors.length} ligne(s) en erreur d'écriture.`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Import terminé",
          description: `${summary.imported} brouillon(s) importé(s), ${summary.skipped} ligne(s) ignorée(s).`,
        });
      }
      reset();
    } catch (err) {
      captureClientError(err, {
        message: "Import CSV : écriture échouée",
        route: "/settings/gestion",
      });
      toast({
        title: "Import interrompu",
        description: "Une erreur est survenue pendant l'écriture. Réessayez.",
        variant: "destructive",
      });
    } finally {
      setImporting(false);
    }
  };

  const handleTemplate = () => {
    const csv = "\uFEFF" + transactionImportTemplate();
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    downloadBlob(blob, "lumina-modele-import-transactions.csv");
  };

  const previewRows = plan ? plan.rows.slice(0, PREVIEW_ROWS) : [];
  const remainingPreview = plan ? Math.max(0, plan.rows.length - PREVIEW_ROWS) : 0;

  return (
    <div
      className="rounded-xl p-4 mt-3"
      style={{
        backgroundColor: "var(--surface)",
        border: "1px solid var(--border)",
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        <Upload className="w-5 h-5" style={{ color: "var(--accent-primary)" }} />
        <span className="text-text-primary text-sm font-semibold">
          Importer des transactions (CSV)
        </span>
      </div>
      <p className="text-text-tertiary text-xs mb-3">
        Ajoutez des transactions en lot depuis un tableur. Chaque ligne est
        vérifiée puis créée en <strong>brouillon</strong> (jamais approuvée
        automatiquement). Les cellules commençant par « = », « + », « - » ou
        « @ » sont traitées comme du texte : aucune formule n'est exécutée.
      </p>
      <p className="text-text-tertiary text-xs mb-3">
        Colonnes attendues : {TRANSACTION_IMPORT_COLUMNS.join(", ")}.
      </p>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={loading || importing}
          data-testid="csv-import-choose"
          className="flex-1 min-w-[150px] flex items-center justify-center gap-2 p-3 rounded-xl active:scale-95 transition-transform text-sm font-semibold disabled:opacity-50"
          style={{
            backgroundColor:
              "color-mix(in srgb, var(--accent-primary) 15%, transparent)",
            color: "var(--accent-primary)",
            border: "1px solid var(--border)",
          }}
          aria-label="Choisir un fichier CSV à importer"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <FileSpreadsheet className="w-4 h-4" />
          )}
          Choisir un fichier CSV
        </button>
        <button
          type="button"
          onClick={handleTemplate}
          data-testid="csv-import-template"
          className="flex-1 min-w-[150px] flex items-center justify-center gap-2 p-3 rounded-xl active:scale-95 transition-transform text-sm font-semibold"
          style={{
            backgroundColor: "var(--card)",
            color: "var(--text-primary)",
            border: "1px solid var(--border)",
          }}
          aria-label="Télécharger le modèle CSV"
        >
          <FileDown className="w-4 h-4" />
          Télécharger le modèle
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        data-testid="csv-import-input"
        aria-label="Fichier CSV"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleFile(f);
          e.target.value = "";
        }}
      />

      {loading && (
        <div className="mt-3" data-testid="csv-import-loading">
          <ListSkeleton count={2} />
        </div>
      )}

      {!loading && parsed && !parsed.ok && (
        <div
          className="mt-3 p-3 rounded-xl text-sm"
          data-testid="csv-import-rejected"
          style={{
            backgroundColor:
              "color-mix(in srgb, var(--data-expense) 12%, transparent)",
            color: "var(--data-expense)",
          }}
        >
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Fichier refusé</p>
              {parsed.errors.map((err, i) => (
                <p key={i} className="text-xs mt-0.5">
                  {err.row > 0 ? `Ligne ${err.row} : ` : ""}
                  {err.message}
                </p>
              ))}
            </div>
          </div>
        </div>
      )}

      {!loading && plan && parsed?.ok && (
        <div className="mt-3" data-testid="csv-import-preview">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2
              className="w-4 h-4"
              style={{ color: "var(--data-income)" }}
            />
            <span className="text-text-secondary text-xs">
              {plan.valid} ligne(s) prête(s) · {plan.invalid} rejetée(s) —
              fichier « {fileName} »
            </span>
          </div>

          <div
            className="rounded-lg overflow-hidden"
            style={{ border: "1px solid var(--border)" }}
          >
            <table className="w-full text-xs">
              <thead>
                <tr style={{ backgroundColor: "var(--card)" }}>
                  <th className="text-left px-2 py-1.5 text-text-tertiary">
                    Ligne
                  </th>
                  <th className="text-left px-2 py-1.5 text-text-tertiary">
                    Résumé
                  </th>
                </tr>
              </thead>
              <tbody>
                {previewRows.map((r) => (
                  <tr key={r.row}>
                    <td className="px-2 py-1.5 text-text-tertiary align-top">
                      {r.row}
                    </td>
                    <td className="px-2 py-1.5 align-top">
                      {r.status === "valid" ? (
                        <span className="text-text-primary">
                          {r.input?.type} ·{" "}
                          {r.input ? (r.input.amount / 100).toLocaleString("fr-FR") : 0}{" "}
                          FCFA · {r.input?.description}
                          {r.sanitized ? " (cellule neutralisée)" : ""}
                        </span>
                      ) : (
                        <span style={{ color: "var(--data-expense)" }}>
                          {r.error}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {remainingPreview > 0 && (
            <p className="text-text-tertiary text-xs mt-1">
              … et {remainingPreview} autre(s) ligne(s).
            </p>
          )}

          {parsed.warnings.length > 0 && (
            <div
              className="mt-2 p-2 rounded-lg text-xs"
              style={{
                backgroundColor:
                  "color-mix(in srgb, var(--data-pending) 12%, transparent)",
                color: "var(--text-secondary)",
              }}
              data-testid="csv-import-warnings"
            >
              {parsed.warnings.slice(0, 3).map((w, i) => (
                <p key={i}>{w}</p>
              ))}
            </div>
          )}

          <div className="flex flex-wrap gap-2 mt-3">
            <button
              type="button"
              onClick={() => void handleConfirm()}
              disabled={importing || plan.valid === 0}
              data-testid="csv-import-confirm"
              className="flex-1 min-w-[150px] flex items-center justify-center gap-2 p-3 rounded-xl active:scale-95 transition-transform text-sm font-semibold disabled:opacity-50"
              style={{
                backgroundColor:
                  "color-mix(in srgb, var(--data-income) 18%, transparent)",
                color: "var(--data-income)",
                border: "1px solid var(--border)",
              }}
              aria-label="Confirmer l'import des lignes valides"
            >
              {importing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              Importer {plan.valid} ligne(s) valide(s)
            </button>
            <button
              type="button"
              onClick={reset}
              disabled={importing}
              data-testid="csv-import-cancel"
              className="flex-1 min-w-[150px] p-3 rounded-xl active:scale-95 transition-transform text-sm font-semibold disabled:opacity-50"
              style={{
                backgroundColor: "var(--card)",
                color: "var(--text-secondary)",
                border: "1px solid var(--border)",
              }}
              aria-label="Annuler l'import"
            >
              Annuler
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
