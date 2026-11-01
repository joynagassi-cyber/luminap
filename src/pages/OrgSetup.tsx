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
  IonContent,
} from "@ionic/react";
import ThemePicker from "@/components/ThemePicker";
import { LUMINA_THEMES, applyTheme } from "@/ionic/themes";
import {
  useAppConfig,
  selectRole,
  mirrorNewOrganizationLocally,
} from "@/lib/dataLayer";
import { bootstrapOrganization } from "@/lib/orgBootstrap";
import { authService } from "@/lib/auth";
import { setOrganizationId } from "@/lib/orgContext";
import { parseRole } from "@/lib/rbac";
import {
  completeOnboarding,
  loadOnboardingState,
  type OrgTypeChoice,
} from "@/lib/onboardingState";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { MotionCard } from "@/design/motion/MotionCard";

const SERVER_ORG_TYPE: Readonly<Record<OrgTypeChoice, string>> = {
  Eglise: "CHURCH",
  Ecole: "SCHOOL",
  ONG: "NGO",
  Entreprise: "ENTERPRISE",
  Institution: "CHURCH",
  Custom: "CHURCH",
};

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
    desc: "Scolarité, événements et inscriptions",
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
  const [createError, setCreateError] = useState<string | null>(null);

  const chosen = TEMPLATE_CHOICES.find((t) => t.type === type) ?? null;

  const toggleFeature = (key: string) => {
    setFeatures((f) => (f.includes(key) ? f.filter((k) => k !== key) : [...f, key]));
  };

  const pickType = (t: (typeof TEMPLATE_CHOICES)[number]) => {
    setType(t.type);
    setFeatures(t.defaultFeatures);
    setRole(null);
  };

  const canCreate = name.trim().length >= 2 && type !== null && role !== null;

  const handleCreate = async () => {
    if (!canCreate || !chosen) return;
    setCreating(true);
    setCreateError(null);
    try {
      const nextTheme = LUMINA_THEMES.find((t) => t.id === themeId) ?? LUMINA_THEMES[0];
      applyTheme(nextTheme);

      const created = await bootstrapOrganization({
        name: name.trim(),
        type: SERVER_ORG_TYPE[type as OrgTypeChoice] ?? "CHURCH",
      });
      const orgId = created.orgId;

      const effectiveRole = parseRole(created.role ?? "") ?? "ADMIN";

      const userId =
        authService.getState().profile?.id ??
        authService.getState().user?.id ??
        "";
      if (userId) {
        await mirrorNewOrganizationLocally({
          orgId,
          name: name.trim(),
          type: SERVER_ORG_TYPE[type as OrgTypeChoice] ?? "CHURCH",
          userId,
          role: effectiveRole,
          grantId: created.grantId ?? null,
        });
      }

      setOrganizationId(orgId);
      try {
        localStorage.setItem("lumina-active-org", orgId);
      } catch {}

      await authService.refreshProfile();

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
      state.role = effectiveRole;
      completeOnboarding(state);

      await selectRole(effectiveRole);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setCreateError(
        err instanceof Error && err.message
          ? err.message
          : "La création de l’organisation a échoué. Réessayez.",
      );
    } finally {
      setCreating(false);
    }
  };

  const CARD_VARIANTS = {
    hidden: { opacity: 0, y: 12 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: [0.4, 0, 0.2, 1] },
    },
  };

  return (
    <IonPage>
      <IonContent className="bg-canvas">
        <div data-screen-state="ready" className="min-h-dvh">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5">
            <img
              src="/lumina-logo-version-monochrome.png"
              alt="Lumina"
              className="w-10 h-10 object-contain"
            />
            <button
              onClick={() => navigate(-1)}
              className="text-text-tertiary text-sm font-medium"
            >
              Annuler
            </button>
          </div>

          <div className="px-6 pb-safe pt-safe">
            <div className="max-w-md mx-auto">
              <motion.h1
                initial="hidden"
                animate="visible"
                variants={CARD_VARIANTS}
                className="text-text-primary font-bold text-3xl leading-tight mb-2"
              >
                Votre organisation
              </motion.h1>
              <motion.p
                initial="hidden"
                animate="visible"
                variants={CARD_VARIANTS}
                transition={{ delay: 0.1 }}
                className="text-text-secondary text-sm leading-relaxed mb-8"
              >
                Configurez son identité avant de lancer votre tableau de bord.
              </motion.p>

              {/* ── 1. Identité ─────────────────────────────────────────── */}
              <motion.div
                initial="hidden"
                animate="visible"
                variants={CARD_VARIANTS}
                transition={{ delay: 0.2 }}
                className="mb-8"
              >
                <p className="text-xs font-semibold uppercase tracking-wider mb-3">
                  Identité
                </p>
                <MotionCard variant="flat" className="p-5 mb-4">
                  <p className="text-sm text-text-secondary mb-2 block">
                    Nom complet de l’organisation
                  </p>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Église MFE-JC Centrale"
                    className="w-full text-sm text-text-primary bg-transparent border-b border-b border-border focus:border-accent-primary focus:ring-0 outline-none placeholder:text-text-placeholder"
                  />
                </MotionCard>
                <MotionCard variant="flat" className="p-5">
                  <p className="text-sm text-text-secondary mb-2 block">
                    Sigle
                  </p>
                  <p className="text-xs text-text-placeholder mb-1">
                    Affiché dans les menus, le nom complet reste dans les rapports.
                  </p>
                  <input
                    type="text"
                    value={sigle}
                    onChange={(e) =>
                      setSigle(((e.target.value as string) ?? "").toUpperCase().slice(0, 12))
                    }
                    placeholder="MFE"
                    className="w-full text-sm text-text-primary bg-transparent border-b border-b border-border focus:border-accent-primary focus:ring-0 outline-none placeholder:text-text-placeholder"
                  />
                </MotionCard>
              </motion.div>

              {/* ── 2. Type ─────────────────────────────────────────────── */}
              <motion.div
                initial="hidden"
                animate="visible"
                variants={CARD_VARIANTS}
                transition={{ delay: 0.3 }}
                className="mb-8"
              >
                <p className="text-xs font-semibold uppercase tracking-wider mb-3">
                  Type d’organisation
                </p>
                <div className="space-y-3 mb-6">
                  {TEMPLATE_CHOICES.map((t) => {
                    const Icon = t.icon;
                    const active = type === t.type;
                    return (
                      <MotionCard
                        key={t.type}
                        variant="flat"
                        onPress={() => pickType(t)}
                        className="p-5 flex items-start gap-4 cursor-pointer group"
                        style={{
                          border:
                            active
                              ? "2px solid var(--accent-primary)"
                              : "1px solid var(--surface-hover)",
                        }}
                      >
                        <div
                          className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                          style={{
                            background: active
                              ? "color-mix(in srgb, var(--accent-primary) 20%, transparent)"
                              : "var(--surface-hover)",
                          }}
                        >
                          <Icon
                            className="w-6 h-6"
                            style={{
                              color: active
                                ? "var(--accent-primary)"
                                : "var(--text-tertiary)",
                            }}
                          />
                        </div>
                        <div className="flex-1">
                          <p className="text-text-primary font-semibold text-sm">
                            {t.label}
                            {active && (
                              <Check
                                className="w-4 h-4 inline ml-2"
                                style={{ color: "var(--accent-primary)" }}
                              />
                            )}
                          </p>
                          <p className="text-text-tertiary text-xs mt-1">
                            {t.desc}
                          </p>
                        </div>
                      </MotionCard>
                    );
                  })}
                </div>
              </motion.div>

              {/* ── 3. Thème ────────────────────────────────────────────── */}
              <motion.div
                initial="hidden"
                animate="visible"
                variants={CARD_VARIANTS}
                transition={{ delay: 0.4 }}
                className="mb-8"
              >
                <p className="text-xs font-semibold uppercase tracking-wider mb-3">
                  Thème de votre organisation
                </p>
                <MotionCard variant="flat" className="p-5">
                  <ThemePicker value={themeId} onChange={setThemeId} />
                </MotionCard>
              </motion.div>

              {/* ── 4. Modules ──────────────────────────────────────────── */}
              <motion.div
                initial="hidden"
                animate="visible"
                variants={CARD_VARIANTS}
                transition={{ delay: 0.5 }}
                className="mb-8"
              >
                <p className="text-xs font-semibold uppercase tracking-wider mb-3">
                  Modules à activer
                </p>
                <div className="grid grid-cols-2 gap-3 mb-6">
                  {FEATURES.map(({ key, label, icon: Icon }) => {
                    const on = features.includes(key);
                    return (
                      <MotionCard
                        key={key}
                        variant="flat"
                        onPress={() => toggleFeature(key)}
                        className="p-4 flex items-center gap-3 cursor-pointer group"
                        style={{
                          border: on
                            ? "1.5px solid var(--accent-primary)"
                            : "1px solid var(--surface-hover)",
                          opacity: on ? 1 : 0.5,
                        }}
                      >
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{
                            background: on
                              ? "color-mix(in srgb, var(--accent-primary) 20%, transparent)"
                              : "var(--surface-hover)",
                          }}
                        >
                          <Icon
                            className="w-4 h-4"
                            style={{
                              color: on
                                ? "var(--accent-primary)"
                                : "var(--text-tertiary)",
                            }}
                          />
                        </div>
                        <p className="text-xs font-medium text-text-primary leading-tight">
                          {label}
                        </p>
                      </MotionCard>
                    );
                  })}
                </div>
              </motion.div>

              {/* ── 5. Rôle ─────────────────────────────────────────────── */}
              <motion.div
                initial="hidden"
                animate="visible"
                variants={CARD_VARIANTS}
                transition={{ delay: 0.6 }}
                className="mb-8"
              >
                <p className="text-xs font-semibold uppercase tracking-wider mb-3">
                  Votre rôle
                </p>
                {chosen && (
                  <div className="grid grid-cols-2 gap-3 mb-6">
                    {chosen.roles.map((r) => {
                      const on = role === r.id;
                      return (
                        <MotionCard
                          key={r.id}
                          variant="flat"
                          onPress={() => setRole(r.id)}
                          className="p-4 text-center cursor-pointer group"
                          style={{
                            border: on
                              ? "1.5px solid var(--accent-primary)"
                              : "1px solid var(--surface-hover)",
                            opacity: on ? 1 : 0.5,
                          }}
                        >
                          <p
                            className="text-xs font-semibold"
                            style={{ color: on ? "var(--accent-primary)" : "var(--text-primary)" }}
                          >
                            {r.label}
                          </p>
                        </MotionCard>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            </div>
          </div>

          {/* CTA */}
          <div className="px-6 pb-10">
            {createError && (
              <MotionCard variant="flat" className="p-4 mb-6 text-center" style={{ backgroundColor: "color-mix(in srgb, var(--data-alert) 10%, transparent)" }}>
                <p className="text-sm text-text-primary" style={{ color: "var(--data-alert)" }}>
                  {createError}
                </p>
              </MotionCard>
            )}
            <button
              onClick={handleCreate}
              disabled={!canCreate || creating}
              className="w-full py-4 rounded-full font-semibold text-sm text-on-accent transition-all active:scale-95 disabled:opacity-40 flex items-center justify-center gap-2"
              style={{ backgroundColor: "var(--accent-primary)" }}
            >
              {creating ? (
                <>
                  <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  Création en cours…
                </>
              ) : (
                <>
                  Créer l’organisation
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
            <button
              onClick={() => navigate(-1)}
              className="w-full mt-3 py-3 rounded-full text-sm font-medium text-text-tertiary flex items-center justify-center gap-2"
            >
              <ChevronLeft className="w-4 h-4" /> Retour
            </button>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
}
