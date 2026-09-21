import { Info, Database, ShieldCheck, Sparkles } from "lucide-react";
import SettingsShell from "@/components/SettingsShell";
import { useAppConfig, useCurrentUser } from "@/lib/dataLayer";

export default function SettingsAbout() {
  const { config } = useAppConfig();
  const user = useCurrentUser();

  return (
    <SettingsShell
      title="À propos"
      subtitle="Lumina — plateforme universelle d'organisation"
    >
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
          Plateforme universelle d'organisation · v2.0
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
          Conçu pour les leaders · Lumina v2.0
        </p>
      </div>
    </SettingsShell>
  );
}
