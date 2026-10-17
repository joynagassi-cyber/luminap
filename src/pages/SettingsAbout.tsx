import { Info, Database, ShieldCheck, Sparkles, RefreshCw, Check } from "lucide-react";
import SettingsShell from "@/components/SettingsShell";
import { useAppConfig, useCurrentUser } from "@/lib/dataLayer";
import { toast } from "@/components/ui/use-toast";
import { useUpdater } from "@/updater/useUpdater";
import { UpdateDialog } from "@/updater/UpdateDialog";

/**
 * Page « À propos » — inclut le bloc « Mise à jour » du self-updater.
 * Le dialogue UpdateDialog est monté ici (bouton « Rechercher une mise à
 * jour » appelle check(true)) ; la vérification au démarrage se fait
 * séparément dans App.tsx (UpdaterBridge).
 */
export default function SettingsAbout() {
  const { config } = useAppConfig();
  const user = useCurrentUser();
  const updater = useUpdater();
  const { status, progress, updateInfo, check, startUpdate } = updater;

  const handleCheckNow = async () => {
    const info = await check(true);
    if (!info) {
      // « Vous êtes à jour » (ou aucune mise à jour trouvée)
      toast({ title: "Vous êtes à jour" });
    }
  };

  return (
    <SettingsShell
      title="À propos"
      subtitle="Lumina — plateforme universelle d'organisation"
    >
      {/* Bloc self-updater : bouton + progression + dialogue */}
      <div
        className="rounded-xl p-4 mb-4"
        style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
      >
        <div className="flex items-center gap-2 mb-3">
          <RefreshCw className="w-5 h-5" style={{ color: "var(--accent-primary)" }} />
          <span className="text-text-primary font-semibold text-sm">
            Mise à jour
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs">
          {status === "idle" && (
            <>
              <span className="text-text-tertiary">Aucune vérification en cours</span>
              <button
                onClick={handleCheckNow}
                style={{ color: "var(--accent-primary)", fontWeight: 600 }}
              >
                Rechercher une mise à jour
              </button>
            </>
          )}
          {status === "checking" && (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" style={{ color: "var(--accent-primary)" }} />
              <span className="text-text-tertiary">Vérification…</span>
            </>
          )}
          {status === "available" && (
            <>
              <span className="text-text-secondary">
                v{updateInfo?.versionName} disponible
              </span>
              <button
                onClick={startUpdate}
                style={{ color: "var(--data-income, #22c55e)", fontWeight: 700 }}
              >
                Mettre à jour
              </button>
            </>
          )}
          {status === "downloading" && (
            <>
              <span className="text-text-tertiary">
                Téléchargement {progress}%…
              </span>
            </>
          )}
          {status === "readyToInstall" && (
            <>
              <Check className="w-4 h-4" style={{ color: "var(--data-income, #22c55e)" }} />
              <span className="text-text-secondary">Prêt à installer</span>
            </>
          )}
          {status === "waitingPermission" && (
            <span className="text-text-tertiary">
              Autorisez « Installer des applications inconnues »
            </span>
          )}
          {status === "error" && (
            <span style={{ color: "var(--data-danger, #ff5c5c)" }}>
              {updater.error}
            </span>
          )}
        </div>
        {/* Le dialogue s'affiche quand le statut passe à "available" */}
        {status === "available" && <UpdateDialog />}
      </div>

      <div
        className="rounded-xl p-5 mb-4 text-center"
        style={{
          backgroundColor: "var(--surface)",
          border: "1px solid var(--border)",
        }}
      >
        <img
          src="/lumina-logo.png"
          alt="Lumina"
          className="w-14 h-14 rounded-xl mx-auto mb-3"
          style={{ border: "1px solid var(--border)" }}
        />
        <p className="text-text-primary font-bold text-lg">Lumina</p>
        <p className="text-text-tertiary text-xs mt-1">
          Plateforme universelle d'organisation
        </p>
      </div>

      <div
        className="rounded-xl p-4 mb-4"
        style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
      >
        <div className="flex items-center gap-2 mb-3">
          <Info className="w-5 h-5" style={{ color: "var(--accent-primary)" }} />
          <span className="text-text-primary font-semibold text-sm">
            Description
          </span>
        </div>
        <p className="text-text-tertiary text-xs leading-relaxed">
          Lumina organise les finances, les caisses, les groupes, les budgets
          et les dons de votre organisation (église, ONG, école ou entreprise).
          Fonctionne hors-ligne d'abord, synchronisation en arrière-plan.
        </p>
      </div>

      <div
        className="rounded-xl p-4 mb-4"
        style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
      >
        <div className="flex items-center gap-2 mb-3">
          <Database className="w-5 h-5" style={{ color: "var(--accent-primary)" }} />
          <span className="text-text-primary font-semibold text-sm">
            Architecture & données
          </span>
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-text-tertiary">Source de vérité</span>
            <span className="text-text-secondary">IndexedDB (local)</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-text-tertiary">Synchronisation</span>
            <span className="text-text-secondary">PowerSync + Supabase</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-text-tertiary">Organisation</span>
            <span className="text-text-secondary">
              {config.churchName || user?.org?.name || "Lumina"}
            </span>
          </div>
        </div>
      </div>

      <div
        className="rounded-xl p-4 mb-4"
        style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
      >
        <div className="flex items-center gap-2 mb-3">
          <ShieldCheck className="w-5 h-5" style={{ color: "var(--data-income)" }} />
          <span className="text-text-primary font-semibold text-sm">
            Confidentialité & sécurité
          </span>
        </div>
        <p className="text-text-tertiary text-xs leading-relaxed">
          Vos données restent sur l'appareil et sont chiffrées en transit.
          L'accès multi-organisation est arbitré côté serveur (Row Level
          Security).
        </p>
      </div>

      <div
        className="flex items-center justify-center gap-2 py-2"
        data-testid="about-footer"
      >
        <Sparkles className="w-4 h-4" style={{ color: "var(--accent-primary)" }} />
        <p className="text-text-tertiary text-xs">
          Conçu pour les leaders
        </p>
      </div>
    </SettingsShell>
  );
}
