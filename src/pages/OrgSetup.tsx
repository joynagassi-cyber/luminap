/**
 * OrgSetup — création d'organisation en 5 étapes (Apple/Google polish).
 *
 * 1. Logo de l'organisation (upload ou ignorer)
 * 2. Identité — nom complet + sigle
 * 3. Type d'organisation (Église, École, Entreprise, ONG, Institution)
 * 4. Modules à activer (Cotisations, Groupes, Événements, Caisses, etc.)
 * 5. Détails (adresse, téléphone, site web, description) + Thème de marque
 *
 * Design Apple/Google : tokens CSS `var(--*)` uniquement, coins arrondis,
 * ombres subtiles, animations framer-motion, interface en français.
 */

import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  SkipForward,
  Building2,
  MapPin,
  Phone,
  Globe,
  FileText,
  CheckCircle,
  ArrowRight,
  Church,
  School,
  Users,
  CalendarDays,
  Wallet,
  Landmark,
  KeyRound,
  Archive,
} from "lucide-react";
import { IonPage, IonContent } from "@ionic/react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { MotionCard } from "@/design/motion/MotionCard";
import { LUMINA_THEMES, applyTheme, getThemeById, type ThemeId } from "@/ionic/themes";
import ThemePicker from "@/components/ThemePicker";
import {
  useAppConfig,
  mirrorNewOrganizationLocally,
  selectRole,
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

type Step = 1 | 2 | 3 | 4 | 5;

const STEP_LABELS: Record<Step, string> = {
  1: "Logo",
  2: "Identité",
  3: "Type",
  4: "Modules",
  5: "Détails",
};

const SERVER_ORG_TYPE: Readonly<Record<OrgTypeChoice, string>> = {
  Eglise: "CHURCH",
  Ecole: "SCHOOL",
  ONG: "NGO",
  Entreprise: "ENTERPRISE",
  Institution: "CHURCH",
  Custom: "CHURCH",
};

const DEFAULT_ORG_TYPE: OrgTypeChoice = "Eglise";
const DEFAULT_ROLE = "PASTEUR_PRINCIPAL";

const STEP_VARIANTS = {
  hidden: { opacity: 0, x: 20 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.4 } },
  exit: { opacity: 0, x: -20, transition: { duration: 0.3 } },
};

const TEMPLATE_CHOICES: Array<{
  type: OrgTypeChoice;
  label: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  desc: string;
  defaultFeatures: string[];
  roles: Array<{ id: string; label: string }>;
}> = [
  {
    type: "Eglise",
    label: "Église",
    icon: Church,
    desc: "Culte, cotisations, groupes et caisses paroissiales",
    defaultFeatures: ["cotisations", "groupes", "evenements", "caisses", "rapports", "formulaires", "invitations", "archives"],
    roles: [
      { id: "PASTEUR_PRINCIPAL", label: "Pasteur principal" },
      { id: "TREASURIER", label: "Trésorier" },
      { id: "COMPTABLE", label: "Comptable" },
      { id: "SECRETAIRE", label: "Secrétaire" },
      { id: "RESPONSABLE_DEPARTEMENT", label: "Resp. département" },
    ],
  },
  {
    type: "Ecole",
    label: "École",
    icon: School,
    desc: "Scolarité, événements et inscriptions",
    defaultFeatures: ["cotisations", "evenements", "caisses", "formulaires", "invitations"],
    roles: [
      { id: "DIRECTEUR", label: "Directeur" },
      { id: "ADMINISTRATION", label: "Administration" },
      { id: "PROFESSEUR", label: "Professeur" },
      { id: "SURVEILLANT", label: "Surveillant" },
    ],
  },
  {
    type: "Entreprise",
    label: "Entreprise",
    icon: Building2,
    desc: "Magasins, caisses de vente, stock et bilans",
    defaultFeatures: ["caisses", "groupes", "rapports", "formulaires", "invitations", "archives"],
    roles: [
      { id: "DIRECTEUR_REGIONAL", label: "Directeur régional" },
      { id: "GESTIONNAIRE_MAGASIN", label: "Gestionnaire magasin" },
      { id: "CAISSIER", label: "Caissier" },
      { id: "EMPLOYE", label: "Employé" },
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
  const saved = loadOnboardingState();

  // ── État étape ──
  const [step, setStep] = useState<Step>(1);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // ── Étape 1 : Logo ──
  const [logoUrl, setLogoUrl] = useState("");

  // ── Étape 2 : Identité ──
  const [name, setName] = useState(saved.org.name || config.churchName || "");
  const [sigle, setSigle] = useState(saved.org.sigle || "");

  // ── Étape 3 : Type ──
  const [type, setType] = useState<OrgTypeChoice | null>(
    (saved.org.type as OrgTypeChoice) ?? DEFAULT_ORG_TYPE,
  );
  const [role, setRole] = useState<string | null>(saved.role ?? null);

  // ── Étape 4 : Modules ──
  const [features, setFeatures] = useState<string[]>(
    saved.org.features.length
      ? saved.org.features
      : (TEMPLATE_CHOICES.find((t) => t.type === type)?.defaultFeatures ??
          TEMPLATE_CHOICES[0].defaultFeatures),
  );

  // ── Étape 5 : Détails ──
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [description, setDescription] = useState("");
  const [themeId, setThemeId] = useState<ThemeId>(
    (saved.org.theme as ThemeId) ?? LUMINA_THEMES[0].id,
  );

  const chosen = TEMPLATE_CHOICES.find((t) => t.type === type) ?? null;
  const canCreate = name.trim().length >= 2 && type !== null && role !== null;

  const handleNext = () => {
    if (step < 5) setStep((s) => (s + 1) as Step);
  };

  const handleBack = () => {
    if (step > 1) setStep((s) => (s - 1) as Step);
    else navigate(-1);
  };

  const handleSkipLogo = () => {
    setLogoUrl("");
    setStep(2);
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setLogoUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const pickType = (t: OrgTypeChoice) => {
    setType(t);
    setRole(null);
    setFeatures(
      TEMPLATE_CHOICES.find((tc) => tc.type === t)?.defaultFeatures ??
        TEMPLATE_CHOICES[0].defaultFeatures,
    );
  };

  const toggleFeature = (key: string) => {
    setFeatures((f) => (f.includes(key) ? f.filter((k) => k !== key) : [...f, key]));
  };

  const handleCreate = async () => {
    if (!canCreate || !chosen) return;
    setCreating(true);
    setCreateError(null);
    try {
      const nextTheme = getThemeById(themeId);
      applyTheme(nextTheme);

      const created = await bootstrapOrganization({
        name: name.trim(),
        type: SERVER_ORG_TYPE[type as OrgTypeChoice] ?? "CHURCH",
      });
      const orgId = created.orgId;

      const effectiveRole = parseRole(created.role ?? "") ?? DEFAULT_ROLE;

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
        if (logoUrl) localStorage.setItem(`lumina-org-logo-${orgId}`, logoUrl);
        localStorage.setItem("lumina-org-address", address);
        localStorage.setItem("lumina-org-phone", phone);
        localStorage.setItem("lumina-org-website", website);
        localStorage.setItem("lumina-org-description", description);
        localStorage.setItem("lumina-org-logo", logoUrl);
        localStorage.setItem("lumina-org-theme", themeId);
      } catch {}

      await authService.refreshProfile();

      await updateConfig({
        churchName: name.trim(),
        churchSigle: sigle.trim().toUpperCase(),
        churchLogo: logoUrl || undefined,
      });

      const state = loadOnboardingState();
      state.branch = "creator";
      state.org = {
        name: name.trim(),
        sigle: sigle.trim().toUpperCase(),
        type,
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

  const progress = (step - 1) / 4;

  return (
    <IonPage>
      <IonContent className="bg-canvas">
        <div data-screen-state="ready" className="min-h-dvh flex flex-col">
          {/* ── Header ── */}
          <div className="flex items-center justify-between px-6 py-5">
            <img
              src="/lumina-logo-version-monochrome.png"
              alt="Lumina"
              className="w-10 h-10 object-contain"
            />
            <button
              onClick={handleBack}
              className="text-text-tertiary text-sm font-medium"
            >
              {step > 1 ? "Précédent" : "Annuler"}
            </button>
          </div>

          {/* ── Stepper ── */}
          <div className="px-6 mb-8">
            <div className="flex items-center justify-between">
              {[1, 2, 3, 4, 5].map((n) => {
                const active = step === n;
                const completed = step > n;
                return (
                  <motion.div
                    key={n}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: n * 0.06 }}
                    className="flex flex-col items-center gap-2 relative z-10"
                  >
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                        completed
                          ? "bg-accent-primary text-on-accent border-2 border-accent-primary"
                          : active
                          ? "bg-accent-primary text-on-accent border-2 border-accent-primary shadow-accent"
                          : "bg-surface border-2 border-border text-text-tertiary"
                      }`}
                    >
                      {completed ? (
                        <CheckCircle className="w-5 h-5" />
                      ) : (
                        n
                      )}
                    </div>
                    <span className="text-[10px] font-medium uppercase tracking-wider">
                      {STEP_LABELS[n as Step]}
                    </span>
                    {n < 5 && (
                      <div
                        className={`absolute -top-2 left-1/2 -translate-x-1/2 w-full h-0.5 ${
                          completed ? "bg-accent-primary" : "bg-border"
                        } z-0`}
                      />
                    )}
                  </motion.div>
                );
              })}
            </div>
            <div className="mt-2 h-1 bg-surface rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress * 100}%` }}
                transition={{ duration: 0.4 }}
                className="h-full bg-accent-primary rounded-full shadow-accent"
              />
            </div>
          </div>

          {/* ── Contenu des étapes ── */}
          <div className="flex-1 px-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={STEP_VARIANTS.hidden}
                animate={STEP_VARIANTS.visible}
                exit={STEP_VARIANTS.exit}
                className="max-w-md mx-auto"
              >
                {/* ── ÉTAPE 1 : Logo ── */}
                {step === 1 && (
                  <>
                    <motion.h1
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-text-primary font-bold text-3xl leading-tight mb-2"
                    >
                      Logo de l’organisation
                    </motion.h1>
                    <motion.p
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                      className="text-text-secondary text-sm leading-relaxed mb-8"
                    >
                      Ajoutez un logo pour personnaliser votre organisation. Vous
                      pouvez aussi ignorer cette étape.
                    </motion.p>

                    <MotionCard variant="flat" className="p-0 mb-8 relative overflow-hidden">
                      <div
                        className="aspect-square bg-surface border-2 border-dashed border-border rounded-2xl flex flex-col items-center justify-center cursor-pointer group hover:border-accent-primary transition-colors"
                        onClick={() => document.getElementById("logo-input")?.click()}
                      >
                        {logoUrl ? (
                          <img
                            src={logoUrl}
                            alt="Logo"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <>
                            <ImageIcon className="w-12 h-12 text-text-tertiary mb-3" />
                            <p className="text-sm font-medium text-text-primary">
                              Ajouter un logo
                            </p>
                            <p className="text-xs text-text-tertiary">
                              PNG, JPG ou SVG (max 2 Mo)
                            </p>
                          </>
                        )}
                        <input
                          id="logo-input"
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleLogoChange}
                        />
                      </div>
                      {logoUrl && (
                        <button
                          onClick={() => setLogoUrl("")}
                          className="absolute top-3 right-3 bg-black/60 backdrop-blur text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-black/80 transition-colors"
                          title="Supprimer le logo"
                        >
                          <SkipForward className="w-4 h-4" />
                        </button>
                      )}
                    </MotionCard>

                    <div className="flex flex-col sm:flex-row sm:justify-end gap-3">
                      <button
                        onClick={handleSkipLogo}
                        className="w-full sm:w-auto py-3.5 rounded-xl font-medium text-sm transition-all active:scale-95"
                        style={{
                          backgroundColor: "var(--surface)",
                          color: "var(--text-secondary)",
                          border: "1px solid var(--border)",
                        }}
                      >
                        Ignorer pour l’instant
                      </button>
                      <button
                        onClick={handleNext}
                        className="w-full sm:w-auto px-6 py-3.5 rounded-xl font-semibold text-sm text-on-accent transition-all active:scale-95 shadow-accent flex items-center justify-center gap-2"
                        style={{ backgroundColor: "var(--accent-primary)" }}
                      >
                        Continuer <ChevronRight className="w-4 h-4 ml-2" />
                      </button>
                    </div>
                  </>
                )}

                {/* ── ÉTAPE 2 : Identité ── */}
                {step === 2 && (
                  <>
                    <motion.h1
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-text-primary font-bold text-3xl leading-tight mb-2"
                    >
                      Identité de l’organisation
                    </motion.h1>
                    <motion.p
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                      className="text-text-secondary text-sm leading-relaxed mb-8"
                    >
                      Donnez un nom à votre organisation et un sigle court
                      affiché dans les menus.
                    </motion.p>

                    <MotionCard variant="flat" className="p-6 mb-8">
                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs font-semibold uppercase tracking-wider text-text-secondary mb-2">
                            Nom complet de l’organisation
                          </label>
                          <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Église MFE-JC Centrale"
                            className="w-full text-sm text-text-primary bg-transparent border-b border-border focus:border-accent-primary focus:ring-0 outline-none placeholder:text-text-placeholder"
                            autoFocus
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold uppercase tracking-wider text-text-secondary mb-2">
                            Sigle
                          </label>
                          <p className="text-[10px] text-text-tertiary mb-1">
                            Affiché dans les menus, le nom complet reste dans les rapports.
                          </p>
                          <input
                            type="text"
                            value={sigle}
                            onChange={(e) =>
                              setSigle(
                                ((e.target.value as string) ?? "")
                                  .toUpperCase()
                                  .slice(0, 12),
                              )
                            }
                            placeholder="MFE"
                            className="w-full text-sm text-text-primary bg-transparent border-b border-border focus:border-accent-primary focus:ring-0 outline-none placeholder:text-text-placeholder"
                          />
                        </div>
                      </div>
                    </MotionCard>

                    <div className="flex justify-between">
                      <button
                        onClick={handleBack}
                        className="py-3 rounded-xl font-medium text-sm transition-all active:scale-95"
                        style={{
                          backgroundColor: "var(--surface)",
                          color: "var(--text-secondary)",
                          border: "1px solid var(--border)",
                        }}
                      >
                        <ChevronLeft className="w-4 h-4 mr-2" /> Précédent
                      </button>
                      <button
                        onClick={handleNext}
                        disabled={name.trim().length < 2}
                        className="px-6 py-3 rounded-xl font-semibold text-sm text-on-accent transition-all active:scale-95 disabled:opacity-40 shadow-accent"
                        style={{ backgroundColor: "var(--accent-primary)" }}
                      >
                        Suivant <ChevronRight className="w-4 h-4 ml-2" />
                      </button>
                    </div>
                  </>
                )}

                {/* ── ÉTAPE 3 : Type d'organisation ── */}
                {step === 3 && (
                  <>
                    <motion.h1
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-text-primary font-bold text-3xl leading-tight mb-2"
                    >
                      Type d’organisation
                    </motion.h1>
                    <motion.p
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                      className="text-text-secondary text-sm leading-relaxed mb-8"
                    >
                      Choisissez le type qui correspond le mieux à votre
                      organisation. Cela détermine les modules et rôles par défaut.
                    </motion.p>

                    <div className="space-y-3 mb-8">
                      {TEMPLATE_CHOICES.map((t) => {
                        const active = type === t.type;
                        return (
                          <MotionCard
                            key={t.type}
                            variant="flat"
                            onPress={() => pickType(t.type)}
                            className="p-5 flex items-start gap-4 cursor-pointer group"
                            style={{
                              border:
                                active
                                  ? "2px solid var(--accent-primary)"
                                  : "1px solid var(--surface-hover)",
                            }}
                          >
                            <div
                              className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                              style={{
                                background: active
                                  ? "color-mix(in srgb, var(--accent-primary) 20%, transparent)"
                                  : "var(--surface-hover)",
                              }}
                            >
                              <t.icon
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
                                  <CheckCircle className="w-4 h-4 inline ml-2" />
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

                    {/* Sélection du rôle après le type */}
                    {chosen && (
                      <MotionCard variant="flat" className="p-6 mb-8">
                        <p className="text-xs font-semibold uppercase tracking-wider text-text-secondary mb-3">
                          Votre rôle
                        </p>
                        <div className="grid grid-cols-2 gap-3">
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
                                  style={{
                                    color: on
                                      ? "var(--accent-primary)"
                                      : "var(--text-primary)",
                                  }}
                                >
                                  {r.label}
                                </p>
                              </MotionCard>
                            );
                          })}
                        </div>
                      </MotionCard>
                    )}

                    <div className="flex justify-between">
                      <button
                        onClick={handleBack}
                        className="py-3 rounded-xl font-medium text-sm transition-all active:scale-95"
                        style={{
                          backgroundColor: "var(--surface)",
                          color: "var(--text-secondary)",
                          border: "1px solid var(--border)",
                        }}
                      >
                        <ChevronLeft className="w-4 h-4 mr-2" /> Précédent
                      </button>
                      <button
                        onClick={handleNext}
                        disabled={type === null || role === null}
                        className="px-6 py-3 rounded-xl font-semibold text-sm text-on-accent transition-all active:scale-95 disabled:opacity-40 shadow-accent"
                        style={{ backgroundColor: "var(--accent-primary)" }}
                      >
                        Suivant <ChevronRight className="w-4 h-4 ml-2" />
                      </button>
                    </div>
                  </>
                )}

                {/* ── ÉTAPE 4 : Modules / Features ── */}
                {step === 4 && (
                  <>
                    <motion.h1
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-text-primary font-bold text-3xl leading-tight mb-2"
                    >
                      Modules à activer
                    </motion.h1>
                    <motion.p
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                      className="text-text-secondary text-sm leading-relaxed mb-8"
                    >
                      Sélectionnez les fonctionnalités dont votre organisation
                      aura besoin. Vous pourrez les ajuster plus tard.
                    </motion.p>

                    <div className="grid grid-cols-2 gap-3 mb-8">
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

                    <div className="flex justify-between">
                      <button
                        onClick={handleBack}
                        className="py-3 rounded-xl font-medium text-sm transition-all active:scale-95"
                        style={{
                          backgroundColor: "var(--surface)",
                          color: "var(--text-secondary)",
                          border: "1px solid var(--border)",
                        }}
                      >
                        <ChevronLeft className="w-4 h-4 mr-2" /> Précédent
                      </button>
                      <button
                        onClick={handleNext}
                        className="px-6 py-3 rounded-xl font-semibold text-sm text-on-accent transition-all active:scale-95 shadow-accent"
                        style={{ backgroundColor: "var(--accent-primary)" }}
                      >
                        Suivant <ChevronRight className="w-4 h-4 ml-2" />
                      </button>
                    </div>
                  </>
                )}

                {/* ── ÉTAPE 5 : Détails + Thème ── */}
                {step === 5 && (
                  <>
                    <motion.h1
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-text-primary font-bold text-3xl leading-tight mb-2"
                    >
                      Détails de l’organisation
                    </motion.h1>
                    <motion.p
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                      className="text-text-secondary text-sm leading-relaxed mb-8"
                    >
                      Adresse, numéro de téléphone et autres informations qui
                      apparaîtront sur le profil de votre organisation.
                    </motion.p>

                    <MotionCard variant="flat" className="p-6 mb-8">
                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs font-semibold uppercase tracking-wider text-text-secondary mb-2">
                            Adresse
                          </label>
                          <input
                            type="text"
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            placeholder="123 Rue de la Paix, Ville"
                            className="w-full text-sm text-text-primary bg-transparent border-b border-border focus:border-accent-primary focus:ring-0 outline-none placeholder:text-text-placeholder"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold uppercase tracking-wider text-text-secondary mb-2">
                            Numéro de téléphone
                          </label>
                          <input
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="+229 XX XX XX XX"
                            inputMode="tel"
                            className="w-full text-sm text-text-primary bg-transparent border-b border-border focus:border-accent-primary focus:ring-0 outline-none placeholder:text-text-placeholder"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold uppercase tracking-wider text-text-secondary mb-2">
                            Site web
                          </label>
                          <input
                            type="url"
                            value={website}
                            onChange={(e) => setWebsite(e.target.value)}
                            placeholder="https://exemple.org"
                            className="w-full text-sm text-text-primary bg-transparent border-b border-border focus:border-accent-primary focus:ring-0 outline-none placeholder:text-text-placeholder"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold uppercase tracking-wider text-text-secondary mb-2">
                            Description
                          </label>
                          <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Une courte présentation de votre organisation…"
                            rows={3}
                            className="w-full text-sm text-text-primary bg-transparent border-b border-border focus:border-accent-primary focus:ring-0 outline-none placeholder:text-text-placeholder resize-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold uppercase tracking-wider text-text-secondary mb-2">
                            Thème de marque
                          </label>
                          <ThemePicker
                            value={themeId}
                            onChange={setThemeId}
                            columns={5}
                          />
                        </div>
                      </div>
                    </MotionCard>

                    {createError && (
                      <MotionCard
                        variant="flat"
                        className="p-4 mb-6 text-center"
                        style={{ backgroundColor: "color-mix(in srgb, var(--data-alert) 10%, transparent)" }}
                      >
                        <p className="text-sm text-text-primary" style={{ color: "var(--data-alert)" }}>
                          {createError}
                        </p>
                      </MotionCard>
                    )}

                    <div className="flex flex-col sm:flex-row sm:justify-end gap-3">
                      <button
                        onClick={handleBack}
                        className="w-full sm:w-auto py-3.5 rounded-xl font-medium text-sm transition-all active:scale-95"
                        style={{
                          backgroundColor: "var(--surface)",
                          color: "var(--text-secondary)",
                          border: "1px solid var(--border)",
                        }}
                      >
                        <ChevronLeft className="w-4 h-4 mr-2" /> Précédent
                      </button>
                      <button
                        onClick={handleCreate}
                        disabled={!canCreate || creating}
                        className="w-full sm:w-auto py-3.5 rounded-xl font-semibold text-sm text-on-accent transition-all active:scale-95 disabled:opacity-40 shadow-accent flex items-center justify-center gap-2"
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
                            <ArrowRight className="w-4 h-4" />
                          </>
                        )}
                      </button>
                    </div>
                  </>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
}
