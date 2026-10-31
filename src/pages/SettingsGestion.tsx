import { useNavigate } from "react-router-dom";
import { useState } from "react";
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
  ShieldCheck,
  Loader2,
  type LucideIcon,
} from "lucide-react";
import SettingsShell from "@/components/SettingsShell";
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
    color: "var(--data-income)",
    to: "/reports",
  },
];

const ACTIONS: ActionItem[] = [
  {
    label: "Bilan financier",
    hint: "Voir le rapport par période",
    icon: CreditCard,
    color: "var(--data-income)",
    to: "/balance",
  },
  {
    label: "Historique financier",
    hint: "Graphiques et statistiques",
    icon: BarChart3,
    color: "var(--data-pending)",
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
    color: "var(--data-pending)",
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
