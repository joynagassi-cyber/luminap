import { useNavigate } from "react-router-dom";
import { useRef, useState } from "react";
import {
  Building2,
  ClipboardList,
  Tag,
  Archive,
  BarChart3,
  CreditCard,
  BookOpen,
  Clock,
  RefreshCw,
  KeyRound,
  Database,
  FileJson,
  FileSpreadsheet,
  Upload,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  Loader2,
  type LucideIcon,
} from "lucide-react";
import SettingsShell from "@/components/SettingsShell";
import PeriodLockCard from "@/components/PeriodLockCard";
import CsvImportPanel from "@/components/CsvImportPanel";
import { useCurrentUser } from "@/lib/dataLayer";
import { useLocalStore } from "@/store/useLocalStore";
import { useBackupData } from "@/hooks/useBackupData";
import { useMakerChecker } from "@/hooks/useMakerChecker";
import { useCanAccessMulti } from "@/hooks/useCanAccessMulti";
import { Switch } from "@/components/ui/switch";
import { setOrgSetting, ORG_SETTING_KEYS } from "@/lib/orgSettings";
import { downloadBlob } from "@/lib/download";
import { backupFilename, serializeBackup, backupToCsv } from "@/lib/backup";
import {
  parseBackupBundle,
  planRestore,
  restorePlanSummary,
  BackupImportError,
  type RestorePlan,
} from "@/lib/backupImport";
import { restoreBackupRows } from "@/lib/backupRestore";
import { writeAudit } from "@/lib/audit";
import { captureClientError } from "@/lib/clientErrors";
import { recordUsage } from "@/lib/usageStats";
import { toast } from "@/components/ui/use-toast";

interface ActionItem {
  label: string;
  hint: string;
  icon: LucideIcon;
  color: string;
  to: string;
}

const SHORTCUTS: ActionItem[] = [
  {
    label: "Formulaires",
    hint: "Créer & gérer",
    icon: ClipboardList,
    color: "var(--accent-primary)",
    to: "/forms",
  },
  {
    label: "Mes comptes",
    hint: "Session & reconnexion",
    icon: KeyRound,
    color: "var(--shortcut-forms)",
    to: "/sessions",
  },
  {
    label: "Champs pers.",
    hint: "Customiser",
    icon: Tag,
    color: "var(--data-advance)",
    to: "/custom-fields",
  },
  {
    label: "Archives",
    hint: "Gérer les archives",
    icon: Archive,
    color: "var(--data-planified)",
    to: "/archives",
  },
  {
    label: "Rapports",
    hint: "Bilans & stats",
    icon: BarChart3,
    color: "var(--in)",
    to: "/reports",
  },
];

const ACTIONS: ActionItem[] = [
  {
    label: "Bilan financier",
    hint: "Voir le rapport par période",
    icon: CreditCard,
    color: "var(--in)",
    to: "/balance",
  },
  {
    label: "Historique financier",
    hint: "Graphiques et statistiques",
    icon: BarChart3,
    color: "var(--warn)",
    to: "/history",
  },
  {
    label: "Trace d'activité",
    hint: "Journal de toutes les opérations",
    icon: Clock,
    color: "var(--data-planified)",
    to: "/trace",
  },
  {
    label: "Versement",
    hint: "Transférer vers la caisse principale",
    icon: CreditCard,
    color: "var(--warn)",
    to: "/versement",
  },
  {
    label: "Tutoriel & Aide",
    hint: "Guide complet d'utilisation",
    icon: BookOpen,
    color: "var(--data-advance)",
    to: "/tutoriel",
  },
];

export default function SettingsGestion() {
  const navigate = useNavigate();
  const user = useCurrentUser();
  const loadInitialData = useLocalStore((s) => s.loadInitialData);
  const isCentralAdmin = user?.role === "CENTRAL_ADMIN";
  const backup = useBackupData();
  const [busy, setBusy] = useState<null | "json" | "csv">(null);

  // PR8 maker-checker : bascule réservée aux administrateurs (`admin:settings`).
  const canManageSettings = useCanAccessMulti(
    user?.id,
    user?.org?.id,
    "admin",
    "settings",
    undefined,
    user?.role as any,
  );
  const makerChecker = useMakerChecker();
  const [savingMakerChecker, setSavingMakerChecker] = useState(false);

  // PR2 — import / restauration d'une sauvegarde JSON. L'import est une
  // ÉCRITURE : il est gardé par `admin:settings` (même permission que le
  // contrôle financier), contrairement à l'export qui est ouvert.
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const [importPlan, setImportPlan] = useState<RestorePlan | null>(null);
  const [importFileName, setImportFileName] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  const resetImport = () => {
    setImportPlan(null);
    setImportFileName(null);
    setImportError(null);
  };

  const handleImportFile = async (file: File) => {
    resetImport();
    setImportFileName(file.name);
    try {
      const text = await file.text();
      const bundle = parseBackupBundle(text);
      // État courant = enveloppe de l'organisation active (mêmes clés d'entité).
      const current = backup.buildBundle();
      const plan = planRestore(bundle, {
        orgId: current.orgId,
        collections: current.data,
      });
      setImportPlan(plan);
    } catch (err) {
      const message =
        err instanceof BackupImportError
          ? err.message
          : "Le fichier n'a pas pu être lu.";
      setImportError(message);
    }
  };

  const handleApplyImport = async () => {
    if (!importPlan || importing) return;
    setImporting(true);
    try {
      const result = await restoreBackupRows(importPlan);
      // Journal d'audit — trace de la restauration (jamais silencieuse).
      await writeAudit({
        orgId: importPlan.orgId,
        transactionId: null,
        userId: user?.id ?? "local-user",
        actorRoleAtTime: (user?.role as string) ?? null,
        action: "RESTORE",
        entityType: "Backup",
        entityId: importFileName ?? "backup.json",
        beforeState: null,
        afterState: {
          creates: importPlan.counts.creates,
          updates: importPlan.counts.updates,
          conflicts: importPlan.counts.conflicts,
          skipped: importPlan.counts.skipped,
        },
        comment: restorePlanSummary(importPlan),
      });
      recordUsage("action:import-backup");
      toast({
        title: "Sauvegarde restaurée",
        description: `${result.created} création(s), ${result.updated} mise(s) à jour.`,
      });
      resetImport();
    } catch (err) {
      captureClientError(err, {
        message: "Restauration de la sauvegarde échouée",
        route: "/settings/gestion",
      });
      toast({
        title: "Échec de la restauration",
        description: "Aucune donnée n'a pu être restaurée. Réessayez.",
        variant: "destructive",
      });
    } finally {
      setImporting(false);
    }
  };

  const handleToggleMakerChecker = async (next: boolean) => {
    if (savingMakerChecker) return;
    setSavingMakerChecker(true);
    const ok = await setOrgSetting(ORG_SETTING_KEYS.makerCheckerEnabled, next);
    setSavingMakerChecker(false);
    if (!ok) {
      toast({
        title: "Réglage non enregistré",
        description:
          "L'approbation en deux étapes n'a pas pu être modifiée. Réessayez.",
        variant: "destructive",
      });
      return;
    }
    toast({
      title: next ? "Approbation en deux étapes activée" : "Approbation en deux étapes désactivée",
      description: next
        ? "L'auteur d'une transaction ne pourra plus l'approuver lui-même."
        : "Le créateur d'une transaction peut de nouveau l'approuver.",
    });
  };

  const handleExport = async (kind: "json" | "csv") => {
    if (busy) return;
    setBusy(kind);
    try {
      const bundle = backup.buildBundle();
      const exportedAt = bundle.exportedAt;
      // PR15 — statistique d'usage anonymisée de l'action d'export (compteur
      // local uniquement ; aucun identifiant, aucun contenu exporté).
      recordUsage(kind === "json" ? "action:export-json" : "action:export-csv");
      if (kind === "json") {
        const blob = new Blob([serializeBackup(bundle)], {
          type: "application/json",
        });
        downloadBlob(blob, backupFilename("json", exportedAt));
      } else {
        // BOM UTF-8 : Excel affiche correctement les accents français.
        const csv = "\uFEFF" + backupToCsv(bundle);
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        downloadBlob(blob, backupFilename("csv", exportedAt));
      }
      toast({
        title: "Sauvegarde téléchargée",
        description: `${backup.total} élément(s) exporté(s) au format ${kind.toUpperCase()}.`,
      });
    } catch (err) {
      captureClientError(err, {
        message: "Sauvegarde des données échouée",
        route: "/settings/gestion",
      });
      toast({
        title: "Échec de la sauvegarde",
        description: "L'export n'a pas pu être généré. Réessayez.",
        variant: "destructive",
      });
    } finally {
      setBusy(null);
    }
  };

  return (
    <SettingsShell
      title="Gérer"
      subtitle="Raccourcis pratiques et actions sur vos données"
    >
      {isCentralAdmin && (
        <button
          type="button"
          onClick={() => navigate("/admin")}
          className="w-full p-4 rounded-xl text-left active:scale-[0.99] transition-transform mb-4"
          style={{
            backgroundColor: "var(--band-central)",
            border: "1px solid var(--surface-active)",
          }}
          aria-label="Administration centrale multi-organisation"
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
              style={{
                backgroundColor:
                  "color-mix(in srgb, var(--accent-primary) 15%, transparent)",
              }}
            >
              <Building2
                className="w-5 h-5"
                style={{ color: "var(--accent-primary)" }}
              />
            </div>
            <div>
              <p className="text-text-primary text-sm font-semibold">
                Administration centrale
              </p>
              <p className="text-text-tertiary text-xs mt-0.5">
                Gérer plusieurs organisations · cycle de vie · grants d'admin
              </p>
            </div>
          </div>
        </button>
      )}

      <p className="text-text-secondary text-xs font-medium mb-2">Raccourcis</p>
      <div className="grid grid-cols-2 gap-3 mb-5">
        {SHORTCUTS.map((a) => {
          const Icon = a.icon;
          return (
            <button
              key={a.to}
              type="button"
              onClick={() => navigate(a.to)}
              className="p-4 rounded-xl text-left active:scale-95 transition-transform w-full"
              style={{
                backgroundColor: "var(--surface)",
                border: "1px solid var(--border)",
              }}
              aria-label={a.label}
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center mb-2"
                style={{
                  backgroundColor: `color-mix(in srgb, ${a.color} 15%, transparent)`,
                }}
              >
                <Icon className="w-5 h-5" style={{ color: a.color }} />
              </div>
              <p className="text-text-primary text-sm font-semibold">{a.label}</p>
              <p className="text-text-tertiary text-xs mt-0.5">{a.hint}</p>
            </button>
          );
        })}
      </div>

      <p className="text-text-secondary text-xs font-medium mb-2">Actions & données</p>
      <div className="space-y-2">
        {ACTIONS.map((a) => {
          const Icon = a.icon;
          return (
            <button
              key={a.to}
              type="button"
              onClick={() => navigate(a.to)}
              className="w-full flex items-center gap-3 p-4 rounded-xl active:scale-95 transition-transform text-left"
              style={{
                backgroundColor: "var(--surface)",
                border: "1px solid var(--border)",
              }}
              aria-label={a.label}
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{
                  backgroundColor: `color-mix(in srgb, ${a.color} 15%, transparent)`,
                }}
              >
                <Icon className="w-5 h-5" style={{ color: a.color }} />
              </div>
              <div>
                <p className="text-text-primary text-sm font-semibold">{a.label}</p>
                <p className="text-text-tertiary text-xs mt-0.5">{a.hint}</p>
              </div>
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => void loadInitialData()}
          className="w-full flex items-center gap-3 p-4 rounded-xl active:scale-95 transition-transform text-left"
          style={{
            backgroundColor: "var(--surface)",
            border: "1px solid var(--border)",
          }}
          aria-label="Actualiser les données"
        >
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{
              backgroundColor:
                "color-mix(in srgb, var(--accent-primary) 15%, transparent)",
            }}
          >
            <RefreshCw
              className="w-5 h-5"
              style={{ color: "var(--accent-primary)" }}
            />
          </div>
          <div>
            <p className="text-text-primary text-sm font-semibold">
              Actualiser les données
            </p>
            <p className="text-text-tertiary text-xs mt-0.5">
              Recharger depuis la base locale
            </p>
          </div>
        </button>
      </div>

      <p className="text-text-secondary text-xs font-medium mb-2 mt-5">
        Sauvegarde des données
      </p>
      <div
        className="rounded-xl p-4"
        style={{
          backgroundColor: "var(--surface)",
          border: "1px solid var(--border)",
        }}
      >
        <div className="flex items-center gap-2 mb-2">
          <Database
            className="w-5 h-5"
            style={{ color: "var(--accent-primary)" }}
          />
          <span className="text-text-primary text-sm font-semibold">
            Exporter une copie complète
          </span>
        </div>

        {!backup.ready ? (
          // R52 — la réplique locale n'a pas encore été lue : afficher un
          // squelette plutôt qu'un compte « 0 élément » (fait faux).
          <div
            data-testid="backup-pending"
            aria-busy="true"
            className="flex items-center gap-2 text-text-tertiary text-xs py-2"
          >
            <Loader2 className="w-4 h-4 animate-spin" />
            Chargement des données…
          </div>
        ) : (
          <p className="text-text-tertiary text-xs mb-3">
            {backup.total} élément(s) dans l'organisation active. La sauvegarde
            contient toutes les entités (transactions, groupes, membres,
            événements, caisses, comptes, trace, notifications, documents,
            formulaires, champs personnalisés).
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void handleExport("json")}
            disabled={busy !== null || !backup.ready}
            data-testid="backup-export-json"
            className="flex-1 min-w-[140px] flex items-center justify-center gap-2 p-3 rounded-xl active:scale-95 transition-transform text-sm font-semibold disabled:opacity-50"
            style={{
              backgroundColor:
                "color-mix(in srgb, var(--accent-primary) 15%, transparent)",
              color: "var(--accent-primary)",
              border: "1px solid var(--border)",
            }}
            aria-label="Exporter mes données (JSON)"
          >
            {busy === "json" ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FileJson className="w-4 h-4" />
            )}
            Exporter mes données (JSON)
          </button>
          <button
            type="button"
            onClick={() => void handleExport("csv")}
            disabled={busy !== null || !backup.ready}
            data-testid="backup-export-csv"
            className="flex-1 min-w-[140px] flex items-center justify-center gap-2 p-3 rounded-xl active:scale-95 transition-transform text-sm font-semibold disabled:opacity-50"
            style={{
              backgroundColor: "var(--card)",
              color: "var(--text-primary)",
              border: "1px solid var(--border)",
            }}
            aria-label="Exporter (CSV)"
          >
            {busy === "csv" ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FileSpreadsheet className="w-4 h-4" />
            )}
            Exporter (CSV)
          </button>
        </div>
      </div>

      {/* PR2 — import / restauration d'une sauvegarde JSON (admin uniquement :
          c'est une écriture). Un plan est TOUJOURS affiché avant application :
          jamais de restauration aveugle. R52 : rien n'est proposé tant que la
          réplique locale n'a pas été lue (comparaison impossible ⇒ pas de plan
          fiable). */}
      {canManageSettings.allowed && (
        <div
          className="rounded-xl p-4 mt-3"
          data-testid="backup-import"
          style={{
            backgroundColor: "var(--surface)",
            border: "1px solid var(--border)",
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <Upload
              className="w-5 h-5"
              style={{ color: "var(--accent-primary)" }}
            />
            <span className="text-text-primary text-sm font-semibold">
              Importer une sauvegarde
            </span>
          </div>
          <p className="text-text-tertiary text-xs mb-3">
            Restaurez un fichier JSON exporté depuis cette organisation. Un
            résumé (créations / mises à jour / conflits) est affiché AVANT toute
            écriture ; vous confirmez ensuite.
          </p>

          {!backup.ready ? (
            <div
              data-testid="backup-import-pending"
              aria-busy="true"
              className="flex items-center gap-2 text-text-tertiary text-xs py-2"
            >
              <Loader2 className="w-4 h-4 animate-spin" />
              Chargement des données…
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => importInputRef.current?.click()}
                disabled={importing}
                data-testid="backup-import-choose"
                className="flex-1 min-w-[140px] flex items-center justify-center gap-2 p-3 rounded-xl active:scale-95 transition-transform text-sm font-semibold disabled:opacity-50"
                style={{
                  backgroundColor:
                    "color-mix(in srgb, var(--accent-primary) 15%, transparent)",
                  color: "var(--accent-primary)",
                  border: "1px solid var(--border)",
                }}
                aria-label="Choisir un fichier de sauvegarde JSON"
              >
                <FileJson className="w-4 h-4" />
                Choisir un fichier JSON
              </button>
            </div>
          )}

          <input
            ref={importInputRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            data-testid="backup-import-input"
            aria-label="Fichier de sauvegarde JSON"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleImportFile(f);
              e.target.value = "";
            }}
          />

          {importError && (
            <div
              className="mt-3 p-3 rounded-xl text-sm"
              data-testid="backup-import-rejected"
              style={{
                backgroundColor: "color-mix(in srgb, var(--out) 12%, transparent)",
                color: "var(--out)",
              }}
            >
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Fichier refusé</p>
                  <p className="text-xs mt-0.5">{importError}</p>
                </div>
              </div>
            </div>
          )}

          {importPlan && (
            <div className="mt-3" data-testid="backup-import-plan">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-4 h-4" style={{ color: "var(--in)" }} />
                <span className="text-text-secondary text-xs">
                  {restorePlanSummary(importPlan)} — fichier « {importFileName} »
                </span>
              </div>

              {importPlan.conflicts.length > 0 && (
                <div
                  className="mb-2 p-2 rounded-lg text-xs"
                  data-testid="backup-import-conflicts"
                  style={{
                    backgroundColor:
                      "color-mix(in srgb, var(--warn) 12%, transparent)",
                    color: "var(--text-secondary)",
                  }}
                >
                  {importPlan.conflicts.slice(0, 3).map((c, i) => (
                    <p key={i}>
                      Conflit — {c.entity} · {c.reason}
                    </p>
                  ))}
                </div>
              )}

              <div className="flex flex-wrap gap-2 mt-3">
                <button
                  type="button"
                  onClick={() => void handleApplyImport()}
                  disabled={
                    importing ||
                    (importPlan.counts.creates === 0 &&
                      importPlan.counts.updates === 0)
                  }
                  data-testid="backup-import-confirm"
                  className="flex-1 min-w-[150px] flex items-center justify-center gap-2 p-3 rounded-xl active:scale-95 transition-transform text-sm font-semibold disabled:opacity-50"
                  style={{
                    backgroundColor:
                      "color-mix(in srgb, var(--in) 18%, transparent)",
                    color: "var(--in)",
                    border: "1px solid var(--border)",
                  }}
                  aria-label="Appliquer la restauration"
                >
                  {importing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4" />
                  )}
                  Restaurer
                </button>
                <button
                  type="button"
                  onClick={resetImport}
                  disabled={importing}
                  data-testid="backup-import-cancel"
                  className="flex-1 min-w-[150px] p-3 rounded-xl active:scale-95 transition-transform text-sm font-semibold disabled:opacity-50"
                  style={{
                    backgroundColor: "var(--card)",
                    color: "var(--text-secondary)",
                    border: "1px solid var(--border)",
                  }}
                  aria-label="Annuler la restauration"
                >
                  Annuler
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* PR13 — gel de période comptable (admin uniquement, permission
          `finance:manage`). Le composant se masque de lui-même sans le droit. */}
      <PeriodLockCard />
      <CsvImportPanel />
      {canManageSettings.allowed && (
        <>
          <p className="text-text-secondary text-xs font-medium mb-2 mt-5">
            Contrôle financier
          </p>
          <div
            className="rounded-xl p-4"
            style={{
              backgroundColor: "var(--surface)",
              border: "1px solid var(--border)",
            }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2">
                <ShieldCheck
                  className="w-5 h-5 flex-shrink-0 mt-0.5"
                  style={{ color: "var(--accent-primary)" }}
                />
                <div>
                  <p className="text-text-primary text-sm font-semibold">
                    Approbation en deux étapes
                  </p>
                  <p className="text-text-tertiary text-xs mt-0.5">
                    L'auteur d'une transaction ne peut pas l'approuver lui-même
                    (maker-checker). Désactivé par défaut.
                  </p>
                </div>
              </div>
              <Switch
                checked={makerChecker.enabled}
                disabled={savingMakerChecker || !makerChecker.loaded}
                onCheckedChange={(next) => void handleToggleMakerChecker(next)}
                data-testid="maker-checker-toggle"
                aria-label="Activer l'approbation en deux étapes"
              />
            </div>
            {!makerChecker.loaded && (
              <p className="text-text-tertiary text-xs mt-3">
                Chargement du réglage…
              </p>
            )}
          </div>
        </>
      )}
    </SettingsShell>
  );
}
