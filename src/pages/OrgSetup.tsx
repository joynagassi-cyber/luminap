import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  Check,
  Church,
  School,
  Building2,
  Users,
  CalendarDays,
  Wallet,
  FileText,
  Landmark,
  KeyRound,
  Archive,
} from "lucide-react";
import {
  IonPage,
  IonHeader,
  IonContent,
  IonTitle,
  IonToolbar,
} from "@ionic/react";
import ThemePicker from "@/components/ThemePicker";
import { LUMINA_THEMES, applyTheme } from "@/ionic/themes";
import { useAppConfig, selectRole } from "@/lib/dataLayer";
import {
  completeOnboarding,
  loadOnboardingState,
  type OrgTypeChoice,
} from "@/lib/onboardingState";

/**
 * Templates currently available (per spec: only templates that exist are
 * shown). Each carries its default roles + pre-configured features.
 */
const TEMPLATE_CHOICES: Array<{
  type: OrgTypeChoice;
  label: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  desc: string;
  roles: Array<{ id: string; label: string }>;
  defaultFeatures: string[];
}> = [
  {
    type: "Eglise",
    label: "Église",
    icon: Church,
    desc: "Culte, cotisations, groupes et caisses paroissiales",
    roles: [
      { id: "PASTEUR_PRINCIPAL", label: "Pasteur principal" },
      { id: "TREASURIER", label: "Trésorier" },
      { id: "COMPTABLE", label: "Comptable" },
      { id: "SECRETAIRE", label: "Secrétaire" },
      { id: "RESPONSABLE_DEPARTEMENT", label: "Resp. département" },
    ],
    defaultFeatures: [
      "cotisations",
      "groupes",
      "evenements",
      "caisses",
      "rapports",
      "formulaires",
      "invitations",
      "archives",
    ],
  },
  {
    type: "Ecole",
    label: "École",
    icon: School,
    desc: "Scolarité, scolarités, événements et inscriptions",
    roles: [
      { id: "DIRECTEUR", label: "Directeur" },
      { id: "ADMINISTRATION", label: "Administration" },
      { id: "PROFESSEUR", label: "Professeur" },
      { id: "SURVEILLANT", label: "Surveillant" },
    ],
    defaultFeatures: [
      "cotisations",
      "evenements",
      "caisses",
      "formulaires",
      "invitations",
    ],
  },
  {
    type: "Entreprise",
    label: "Entreprise",
    icon: Building2,
    desc: "Magasins, caisses de vente, stock et bilans",
    roles: [
      { id: "DIRECTEUR_REGIONAL", label: "Directeur régional" },
      { id: "GESTIONNAIRE_MAGASIN", label: "Gestionnaire magasin" },
      { id: "CAISSIER", label: "Caissier" },
      { id: "EMPLOYE", label: "Employé" },
    ],
    defaultFeatures: [
      "caisses",
      "groupes",
      "rapports",
      "formulaires",
      "invitations",
      "archives",
    ],
  },
];

/** Feature catalog (toggleable per org). */
const FEATURES: Array<{
  key: string;
  label: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
}> = [
  { key: "cotisations", label: "Cotisations", icon: Landmark },
  { key: "groupes", label: "Groupes", icon: Users },
  { key: "evenements", label: "Événements", icon: CalendarDays },
  { key: "caisses", label: "Caisses", icon: Wallet },
  { key: "rapports", label: "Rapports & bilans", icon: FileText },
  { key: "formulaires", label: "Formulaires", icon: FileText },
  { key: "invitations", label: "Invitations", icon: KeyRound },
  { key: "archives", label: "Archives & historique", icon: Archive },
];

export default function OrgSetup() {
  const navigate = useNavigate();
  const { config, updateConfig } = useAppConfig();
  const saved = useMemo(() => loadOnboardingState(), []);

  const [name, setName] = useState(saved.org.name || config.churchName || "");
  const [sigle, setSigle] = useState(saved.org.sigle || "");
  const [type, setType] = useState<OrgTypeChoice | null>(saved.org.type ?? null);
  const [themeId, setThemeId] = useState(saved.org.theme ?? LUMINA_THEMES[0].id);
  const [features, setFeatures] = useState<string[]>(
    saved.org.features.length
      ? saved.org.features
      : (TEMPLATE_CHOICES.find((t) => t.type === saved.org.type)?.defaultFeatures ??
          TEMPLATE_CHOICES[0].defaultFeatures),
  );
  const [role, setRole] = useState<string | null>(saved.role ?? null);
  const [creating, setCreating] = useState(false);

  const chosen = TEMPLATE_CHOICES.find((t) => t.type === type) ?? null;

  const toggleFeature = (key: string) => {
    setFeatures((f) => (f.includes(key) ? f.filter((k) => k !== key) : [...f, key]));
  };

  const pickType = (t: (typeof TEMPLATE_CHOICES)[number]) => {
    setType(t.type);
    // Seed the feature list from the template preset when moving between types.
    setFeatures(t.defaultFeatures);
    setRole(null);
  };

  const canCreate = name.trim().length >= 2 && type !== null && role !== null;

  const handleCreate = async () => {
    if (!canCreate || !chosen) return;
    setCreating(true);
    try {
      const nextTheme = LUMINA_THEMES.find((t) => t.id === themeId) ?? LUMINA_THEMES[0];
      applyTheme(nextTheme);

      // Persist the org identity (full name drives dashboard / pages / reports;
      // the sigle is kept in onboarding state for compact surfaces).
      await updateConfig({ churchName: name.trim() });

      const state = loadOnboardingState();
      state.branch = "creator";
      state.org = {
        name: name.trim(),
        sigle: sigle.trim().toUpperCase(),
        type: type,
        theme: themeId,
        features,
      };
      state.role = role;
      completeOnboarding(state);

      await selectRole(role);
      navigate("/dashboard", { replace: true });
    } finally {
      setCreating(false);
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Configuration</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="bg-canvas">
        <div className="min-h-screen bg-[#121212] flex flex-col">
          {/* Top bar */}
          <div className="flex items-center justify-between px-6 py-4">
            <img src="/lumina-logo.png" alt="Lumina" className="w-10 h-10 object-contain" />
            <button
              onClick={() => navigate(-1)}
              className="text-[#808080] text-sm font-medium"
            >
              Annuler
            </button>
          </div>

          <div className="flex-1 px-6 pb-24 pt-2 overflow-y-auto">
            <div className="max-w-sm mx-auto">
              <h1 className="text-white font-bold text-xl mb-1">
                Votre organisation
              </h1>
              <p className="text-[#808080] text-sm mb-6">
                Configurez son identité avant de lancer votre tableau de bord.
              </p>

              {/* ── 1. Identity ─────────────────────────────────────────── */}
              <p className="text-xs font-semibold text-[#808080] uppercase tracking-wide mb-3">
                Identité
              </p>
              <label className="block mb-4">
                <span className="text-sm text-[#B3B3B3] mb-1.5 block">
                  Nom complet de l'organisation
                </span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Église MFE-JC Centrale"
                  className="w-full bg-[#1E1E1E] border border-[#282828] rounded-xl px-4 py-3.5 text-white text-lg font-semibold placeholder-[#535353] focus:outline-none transition-colors"
                  style={{ borderColor: canCreate ? "var(--accent-primary)" : "#282828" }}
                />
              </label>
              <label className="block mb-6">
                <span className="text-sm text-[#B3B3B3] mb-1.5 block">
                  Sigle{" "}
                  <span className="text-[#535353] text-xs">
                    (affiché dans les menus, le nom complet reste dans les rapports)
                  </span>
                </span>
                <input
                  value={sigle}
                  onChange={(e) => setSigle(e.target.value.toUpperCase().slice(0, 12))}
                  placeholder="MFE"
                  className="w-full bg-[#1E1E1E] border border-[#282828] rounded-xl px-4 py-3 font-mono text-lg tracking-[0.3em] text-white placeholder-[#535353] focus:outline-none"
                />
              </label>

              {/* ── 2. Type (available templates) ──────────────────────── */}
              <p className="text-xs font-semibold text-[#808080] uppercase tracking-wide mb-3">
                Type d'organisation
              </p>
              <div className="space-y-2 mb-6">
                {TEMPLATE_CHOICES.map((t) => {
                  const Icon = t.icon;
                  const active = type === t.type;
                  return (
                    <button
                      key={t.type}
                      type="button"
                      onClick={() => pickType(t)}
                      className="w-full text-left rounded-xl p-4 transition-all active:scale-[0.98]"
                      style={{
                        background: "#1E1E1E",
                        border: active
                          ? "2px solid var(--accent-primary)"
                          : "1px solid #282828",
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-9 h-9 rounded-lg flex items-center justify-center"
                          style={{
                            background: active
                              ? "color-mix(in srgb, var(--accent-primary) 20%, transparent)"
                              : "#282828",
                          }}
                        >
                          <Icon
                            className="w-5 h-5"
                            style={{ color: active ? "var(--accent-primary)" : "#808080" }}
                          />
                        </div>
                        <div className="flex-1">
                          <p className="text-white font-semibold text-sm">
                            {t.label}{" "}
                            {active && (
                              <Check
                                className="w-4 h-4 inline ml-1"
                                style={{ color: "var(--accent-primary)" }}
                              />
                            )}
                          </p>
                          <p className="text-[#808080] text-xs mt-0.5">{t.desc}</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* ── 3. Branding — 10 themes, applied live ─────────────── */}
              <p className="text-xs font-semibold text-[#808080] uppercase tracking-wide mb-3">
                Thème de votre organisation
              </p>
              <div className="mb-6">
                <ThemePicker value={themeId} onChange={setThemeId} />
              </div>

              {/* ── 4. Modules ─────────────────────────────────────────── */}
              <p className="text-xs font-semibold text-[#808080] uppercase tracking-wide mb-3">
                Modules à activer
              </p>
              <div className="grid grid-cols-2 gap-2 mb-6">
                {FEATURES.map(({ key, label, icon: Icon }) => {
                  const on = features.includes(key);
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => toggleFeature(key)}
                      className="rounded-xl p-3 text-left transition-all active:scale-[0.97]"
                      style={{
                        background: "#1E1E1E",
                        border: on
                          ? "1.5px solid var(--accent-primary)"
                          : "1px solid #282828",
                        opacity: on ? 1 : 0.6,
                      }}
                    >
                      <Icon
                        className="w-4 h-4 mb-1.5"
                        style={{ color: on ? "var(--accent-primary)" : "#808080" }}
                      />
                      <p className="text-xs font-medium text-white leading-tight">
                        {label}
                      </p>
                    </button>
                  );
                })}
              </div>

              {/* ── 5. Creator role ────────────────────────────────────── */}
              <p className="text-xs font-semibold text-[#808080] uppercase tracking-wide mb-3">
                Votre rôle
              </p>
              {chosen && (
                <div className="grid grid-cols-2 gap-2 mb-2">
                  {chosen.roles.map((r) => {
                    const on = role === r.id;
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => setRole(r.id)}
                        className="rounded-xl p-3 text-left transition-all active:scale-[0.97]"
                        style={{
                          background: "#1E1E1E",
                          border: on
                            ? "1.5px solid var(--accent-primary)"
                            : "1px solid #282828",
                          opacity: on ? 1 : 0.6,
                        }}
                      >
                        <p
                          className="text-xs font-semibold"
                          style={{ color: on ? "var(--accent-primary)" : "#fff" }}
                        >
                          {r.label}
                        </p>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* CTA */}
          <div className="px-6 pb-10">
            <button
              onClick={handleCreate}
              disabled={!canCreate || creating}
              className="w-full py-4 rounded-full font-semibold text-sm text-white transition-all active:scale-95 disabled:opacity-40 flex items-center justify-center gap-2"
              style={{ backgroundColor: "var(--accent-primary)" }}
            >
              {creating ? (
                <>
                  <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  Création en cours…
                </>
              ) : (
                <>
                  Créer l'organisation
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
            <button
              onClick={() => navigate(-1)}
              className="w-full mt-3 py-3 rounded-full text-sm font-medium text-[#808080]"
            >
              <ChevronLeft className="w-4 h-4 inline mr-1" />
              Retour
            </button>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
}
