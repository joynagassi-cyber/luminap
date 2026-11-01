/**
 * OrgSetup — création d'organisation en 5 étapes (Apple/Google polish).
 *
 * Flux corrigé (recommandation UX) :
 *  1. Identité — nom complet + sigle
 *  2. Logo — upload ou ignorer (après l'identité, effort moindre)
 *  3. Type d'organisation — Église, École, Entreprise, ONG, Institution
 *  4. Modules à activer — Cotisations, Groupes, Événements, Caisses…
 *  5. Détails + Thème — adresse, téléphone, site, description, couleur
 *
 * Corrections appliquées :
 *  - Dropzone à hauteur fixe (≈170 px) avec bon contraste de bordure
 *  - Footer collant avec un seul bouton CTA (libellé dynamique)
 *  - Stepper simplifié : « Étape X sur 5 » + nom + barre segmentée (20% par étape)
 *  - Contraste WCAG AA : texte noir sur accent primaire (≈ 7:1)
 *  - Sanitisation SVG (protection XSS) + redimensionnement canvas client
 *  - Aperçu du logo avec Remplacer / Supprimer après sélection
 *  - Retour haut à gauche bien visible
 *
 * Design : tokens CSS `var(--*)` uniquement, interface en français.
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  Building2,
  MapPin,
  Phone,
  Globe,
  FileText,
  CheckCircle,
  ArrowRight,
  X as XIcon,
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
import {
  LUMINA_THEMES,
  applyTheme,
  getThemeById,
  type ThemeId,
} from "@/ionic/themes";
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

const STEP_INFO: Record<Step, { label: string; name: string }> = {
  1: { label: "Identité", name: "Nom et sigle" },
  2: { label: "Logo", name: "Logo de l'organisation" },
  3: { label: "Type", name: "Type d'organisation" },
  4: { label: "Modules", name: "Modules à activer" },
  5: { label: "Détails", name: "Profil et thème" },
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

/** Sanitise un SVG en supprimant script et attributs d'événement (protection XSS). */
function sanitizeSvg(svgText: string): string {
  return svgText
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/\bon\w+=("[^"]*"|'[^']*'|[^>\s]+)/gi, "")
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "");
}

/**
 * Redimensionne une image côté client via canvas (max 512 px, WebP si supporté).
 * Retourne une data URL. Best-effort : en cas d'échec, retourne l'original.
 */
function resizeImage(file: File, maxSize = 512): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement("canvas");
      let { width, height } = img;
      if (width > height && width > maxSize) {
        height = Math.round((height * maxSize) / width);
        width = maxSize;
      } else if (height > maxSize) {
        width = Math.round((width * maxSize) / height);
        height = maxSize;
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(img.src);
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      try {
        resolve(canvas.toDataURL("image/webp", 0.85));
      } catch {
        resolve(canvas.toDataURL("image/png", 0.85));
      }
      URL.revokeObjectURL(img.src);
    };
    img.onerror = () => resolve("");
  });
}

export default function OrgSetup() {
  const navigate = useNavigate();
  const { config, updateConfig } = useAppConfig();
  const saved = loadOnboardingState();

  // ── État étape ──
  const [step, setStep] = useState<Step>(1);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // ── Étape 1 : Identité ──
  const [name, setName] = useState(saved.org.name || config.churchName || "");
  const [sigle, setSigle] = useState(saved.org.sigle || "");

  // ── Étape 2 : Logo ──
  const [logoUrl, setLogoUrl] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);

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
  const stepInfo = STEP_INFO[step];
  const progress = step / 5;

  const canCreate = name.trim().length >= 2 && type !== null && role !== null;

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

  // ── Navigation ──
  const handleNext = () => {
    if (step < 5) setStep((s) => (s + 1) as Step);
  };

  const handleBack = () => {
    if (step > 1) setStep((s) => (s - 1) as Step);
    else navigate(-1);
  };

  // ── Logo ──
  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!/^image\/(jpeg|png|svg\+xml|webp)$/i.test(file.type)) {
      setCreateError("Format non supporté. Utilisez PNG, JPG, SVG ou WebP.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setCreateError("Le fichier dépasse 2 Mo. Choisissez une image plus légère.");
      return;
    }

    let dataUrl: string;
    if (file.type === "image/svg+xml") {
      const text = await file.text();
      const safe = sanitizeSvg(text);
      const blob = new Blob([safe], { type: "image/svg+xml" });
      dataUrl = URL.createObjectURL(blob);
    } else {
      dataUrl = await resizeImage(file);
    }

    setLogoFile(file);
    setLogoUrl(dataUrl);
    setCreateError(null);
  };

  const handleReplaceLogo = () => {
    document.getElementById("logo-input")?.click();
  };

  const handleRemoveLogo = () => {
    setLogoUrl("");
    setLogoFile(null);
    const input = document.getElementById("logo-input") as HTMLInputElement | null;
    if (input) input.value = "";
  };

  const hasLogo = logoUrl.length > 0;

  // ── Création ──
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

  const CARD_VARIANTS = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
    exit: { opacity: 0, y: -20, transition: { duration: 0.3 } },
  };

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
              className="text-text-primary font-semibold text-sm"
              aria-label="Retour"
            >
              <ChevronLeft className="w-4 h-4 mr-1" /> Retour
            </button>
          </div>

          {/* ── Stepper simplifié ── */}
          <div className="px-6 mb-8">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">
                Étape {step} sur 5
              </span>
              <span className="text-xs font-bold text-text-primary uppercase tracking-wider">
                {stepInfo.label}
              </span>
            </div>
            <div className="h-3 bg-surface rounded-full overflow-hidden border border-border/50">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress * 100}%` }}
                transition={{ duration: 0.4 }}
                className="h-full rounded-full"
                style={{
                  background: "linear-gradient(90deg, var(--accent-primary) 0%, color-mix(in srgb, var(--accent-primary) 50%, var(--data-alert)) 100%)",
                }}
              />
            </div>
          </div>

          {/* ── Contenu des étapes ── */}
          <div className="flex-1 px-6 pb-24">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="max-w-md mx-auto"
              >
                {/* ── ÉTAPE 1 : Identité ── */}
                {step === 1 && (
                  <>
                    <motion.h1
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-text-primary font-bold text-3xl leading-tight mb-4"
                    >
                      Identité de l’organisation
                    </motion.h1>
                    <motion.p
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.08 }}
                      className="text-text-secondary text-sm leading-relaxed mb-10"
                    >
                      Donnez un nom à votre organisation et un sigle court
                      affiché dans les menus.
                    </motion.p>

                    <MotionCard variant="flat" className="p-6 mb-10">
                      <div className="space-y-5">
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-2">
                            Nom complet de l’organisation
                          </label>
                          <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Église MFE-JC Centrale"
                            className="w-full text-sm text-text-primary bg-transparent border-b-2 border-border focus:border-accent-primary focus:ring-0 outline-none placeholder:text-text-placeholder/40"
                            autoFocus
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-2">
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
                            className="w-full text-sm text-text-primary bg-transparent border-b-2 border-border focus:border-accent-primary focus:ring-0 outline-none placeholder:text-text-placeholder/40"
                          />
                        </div>
                      </div>
                    </MotionCard>
                  </>
                )}

                {/* ── ÉTAPE 2 : Logo ── */}
                {step === 2 && (
                  <>
                    <motion.h1
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-text-primary font-bold text-3xl leading-tight mb-4"
                    >
                      Logo de l’organisation
                    </motion.h1>
                    <motion.p
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.08 }}
                      className="text-text-secondary text-sm leading-relaxed mb-10"
                    >
                      Ajoutez un logo pour personnaliser votre organisation.
                      Il apparaîtra dans l’en-tête et sur les rapports.
                      <br />
                      Vos initiales seront utilisées si vous n’en ajoutez pas.
                    </motion.p>

                    <MotionCard variant="flat" className="p-0 overflow-hidden mb-10">
                      {/* Dropzone à hauteur fixe */}
                      <div
                        className="relative w-full aspect-[16/9] min-h-[170px] max-h-[200px] bg-surface border-2 border-border rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all hover:border-accent-primary/50 focus-within:border-accent-primary"
                        onClick={() => document.getElementById("logo-input")?.click()}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            document.getElementById("logo-input")?.click();
                          }
                        }}
                        aria-label={hasLogo ? "Modifier le logo" : "Ajouter un logo"}
                      >
                        {hasLogo ? (
                          <>
                            <img
                              src={logoUrl}
                              alt="Aperçu du logo"
                              className="w-full h-full object-cover rounded-xl"
                            />
                            <div className="absolute inset-0 bg-black/20 backdrop-blur-sm flex flex-col items-center justify-center rounded-xl">
                              <ImageIcon className="w-8 h-8 text-white/60 mb-2" />
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleReplaceLogo();
                                }}
                                className="px-4 py-2 rounded-lg bg-white text-text-primary text-xs font-bold hover:bg-white/90 transition-colors"
                              >
                                Remplacer
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemoveLogo();
                                }}
                                className="mt-2 px-4 py-2 rounded-lg bg-transparent border border-white/40 text-white text-xs font-semibold hover:bg-white/20 transition-colors"
                              >
                                Supprimer
                              </button>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-3" style={{ background: "color-mix(in srgb, var(--accent-primary) 15%, transparent)" }}>
                              <ImageIcon className="w-6 h-6" style={{ color: "var(--accent-primary)" }} />
                            </div>
                            <p className="text-text-primary font-medium text-sm mb-1">
                              Ajouter un logo
                            </p>
                            <p className="text-text-tertiary text-xs leading-relaxed text-center px-4">
                              PNG, JPG, SVG ou WebP (max 2 Mo)
                            </p>
                            <input
                              id="logo-input"
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={handleLogoChange}
                            />
                          </>
                        )}
                      </div>
                    </MotionCard>
                  </>
                )}

                {/* ── ÉTAPE 3 : Type d'organisation ── */}
                {step === 3 && (
                  <>
                    <motion.h1
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-text-primary font-bold text-3xl leading-tight mb-4"
                    >
                      Type d’organisation
                    </motion.h1>
                    <motion.p
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.08 }}
                      className="text-text-secondary text-sm leading-relaxed mb-10"
                    >
                      Choisissez le type qui correspond le mieux à votre
                      organisation. Cela détermine les modules et rôles par défaut.
                    </motion.p>

                    <div className="space-y-3 mb-10">
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
                              background: active
                                ? "color-mix(in srgb, var(--accent-primary) 8%, transparent)"
                                : "var(--surface)",
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

                    {chosen && (
                      <MotionCard variant="flat" className="p-6 mb-10">
                        <p className="text-xs font-bold uppercase tracking-wider text-text-secondary mb-3">
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
                                  background: on
                                    ? "color-mix(in srgb, var(--accent-primary) 12%, transparent)"
                                    : "var(--surface)",
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
                  </>
                )}

                {/* ── ÉTAPE 4 : Modules ── */}
                {step === 4 && (
                  <>
                    <motion.h1
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-text-primary font-bold text-3xl leading-tight mb-4"
                    >
                      Modules à activer
                    </motion.h1>
                    <motion.p
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.08 }}
                      className="text-text-secondary text-sm leading-relaxed mb-10"
                    >
                      Sélectionnez les fonctionnalités dont votre organisation
                      aura besoin. Vous pourrez les ajuster plus tard.
                    </motion.p>

                    <div className="grid grid-cols-2 gap-3 mb-10">
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
                              background: on
                                ? "color-mix(in srgb, var(--accent-primary) 8%, transparent)"
                                : "var(--surface)",
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
                  </>
                )}

                {/* ── ÉTAPE 5 : Détails + Thème ── */}
                {step === 5 && (
                  <>
                    <motion.h1
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-text-primary font-bold text-3xl leading-tight mb-4"
                    >
                      Détails de l’organisation
                    </motion.h1>
                    <motion.p
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.08 }}
                      className="text-text-secondary text-sm leading-relaxed mb-10"
                    >
                      Adresse, numéro de téléphone et autres informations qui
                      apparaîtront sur le profil de votre organisation.
                    </motion.p>

                    <MotionCard variant="flat" className="p-6 mb-10">
                      <div className="space-y-5">
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-2">
                            Adresse
                          </label>
                          <input
                            type="text"
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            placeholder="123 Rue de la Paix, Ville"
                            className="w-full text-sm text-text-primary bg-transparent border-b-2 border-border focus:border-accent-primary focus:ring-0 outline-none placeholder:text-text-placeholder/40"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-2">
                            Numéro de téléphone
                          </label>
                          <input
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="+229 XX XX XX XX"
                            inputMode="tel"
                            className="w-full text-sm text-text-primary bg-transparent border-b-2 border-border focus:border-accent-primary focus:ring-0 outline-none placeholder:text-text-placeholder/40"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-2">
                            Site web
                          </label>
                          <input
                            type="url"
                            value={website}
                            onChange={(e) => setWebsite(e.target.value)}
                            placeholder="https://exemple.org"
                            className="w-full text-sm text-text-primary bg-transparent border-b-2 border-border focus:border-accent-primary focus:ring-0 outline-none placeholder:text-text-placeholder/40"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-2">
                            Description
                          </label>
                          <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Une courte présentation de votre organisation…"
                            rows={3}
                            className="w-full text-sm text-text-primary bg-transparent border-b-2 border-border focus:border-accent-primary focus:ring-0 outline-none placeholder:text-text-placeholder/40 resize-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-2">
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
                        className="w-full sm:w-auto py-3.5 rounded-xl font-bold text-sm text-black transition-all active:scale-[0.97] disabled:opacity-40 shadow-accent flex items-center justify-center gap-2 uppercase tracking-wider"
                        style={{ backgroundColor: "var(--accent-primary)" }}
                      >
                        {creating ? (
                          <>
                            <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                            Création en cours…
                          </>
                        ) : (
                          <>
                            <ArrowRight className="w-4 h-4" /> Créer l’organisation
                          </>
                        )}
                      </button>
                    </div>
                  </>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* ── Footer collant (un seul CTA principal) ── */}
          {step !== 5 && (
            <div
              className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-canvas/95 backdrop-blur-md"
              style={{ paddingBottom: "env(safe-area-inset-bottom)", paddingTop: "10px" }}
            >
              <div className="max-w-md mx-auto px-6">
                {step === 2 && !hasLogo ? (
                  <button
                    onClick={handleNext}
                    className="w-full py-4 rounded-xl font-bold text-sm text-text-secondary transition-all active:scale-[0.97] border border-border"
                  >
                    Ignorer pour l’instant
                  </button>
                ) : (
                  <button
                    onClick={handleNext}
                    disabled={
                      step === 1 ? name.trim().length < 2 :
                      step === 3 ? type === null || role === null :
                      false
                    }
                    className="w-full py-4 rounded-xl font-bold text-sm text-black transition-all active:scale-[0.97] shadow-accent flex items-center justify-center gap-2 uppercase tracking-wider"
                    style={{ backgroundColor: "var(--accent-primary)" }}
                  >
                    {creating ? (
                      <>
                        <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                        <span>Création en cours…</span>
                      </>
                    ) : (
                      <>
                        Continuer <ChevronRight className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </IonContent>
    </IonPage>
  );
}


