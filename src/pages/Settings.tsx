import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAppConfig, useCurrentUser, useOnlineStatus } from "@/lib/dataLayer";
import { uploadLuminaFile } from "@/lib/storageService";
import { supabase } from "@/integrations/supabase/client";
import { useNotifications, useAccounts } from "@/lib/dataLayer";
import {
  Database,
  Cloud,
  CloudOff,
  RefreshCw,
  CreditCard,
  UserCircle,
  Camera,
  Building2,
  Image as ImageIcon,
  BookOpen,
  Check,
  ClipboardList,
  Tag,
  Archive,
  BarChart3,
  Clock,
  Palette,
  Puzzle,
  Lock,
  RotateCcw,
  ChevronUp,
  ChevronDown,
  Plus,
  X,
} from "lucide-react";
import {
  useFeatureConfig,
  FEATURES,
  featureById,
  MAX_NAV_TABS,
  prefetchNavViews,
  type FeatureConfigState,
} from "@/lib/features";
import BottomNav from "@/components/BottomNav";
import TopHeader from "@/components/TopHeader";
import ThemePicker from "@/components/ThemePicker";
import SegmentedTabs from "@/components/SegmentedTabs";
import ThemeToggle from "@/components/ThemeToggle";
import { SettingsSkeleton } from "@/components/PageSkeletons";
import {
  getStoredThemeId,
  applyTheme,
  getThemeById,
  type ThemeId,
} from "@/ionic/themes";
import { IonPage, IonContent } from "@ionic/react";
import { useLocalStore } from "@/store/useLocalStore";

type SettingsTab = "parameters" | "pratique" | "profile";

const SETTINGS_TABS = [
  { id: "parameters", label: "Paramètres", testId: "tab-parameters" },
  { id: "pratique", label: "Pratique", testId: "tab-practical" },
  { id: "profile", label: "Profil", testId: "tab-profile" },
];

/** Onglet 1 « Paramètres » : configuration org + thème & apparence + features & navigation. */
function SettingsTabParameters({
  churchName,
  setChurchName,
  churchLogo,
  saving,
  saved,
  themeId,
  handleThemeChange,
  handleSave,
  handleLogoUpload,
  featureConfig,
}: {
  churchName: string;
  setChurchName: (v: string) => void;
  churchLogo: string;
  saving: boolean;
  saved: boolean;
  themeId: ThemeId;
  handleThemeChange: (id: ThemeId) => void;
  handleSave: () => void;
  handleLogoUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  featureConfig: FeatureConfigState;
}) {
  const {
    navTabs,
    visible: featureVisible,
    addNavTab,
    removeNavTab,
    moveNavTab,
    setFeatureVisible,
    resetFeatures,
  } = featureConfig;

  return (
    <div role="tabpanel" aria-label="Paramètres" className="mb-6">
      {/* Configuration de l'organisation */}
      <div
        className="rounded-xl p-4 mb-5"
        style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
      >
        <div className="flex items-center gap-2 mb-4">
          <Building2 className="w-5 h-5" style={{ color: "var(--accent-primary)" }} />
          <span className="text-text-primary font-semibold">
            Configuration de l'organisation
          </span>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-text-tertiary text-xs mb-1.5 block">
              Nom complet de l'organisation
            </label>
            <input
              type="text"
              value={churchName}
              onChange={(e) => setChurchName(e.target.value)}
              placeholder="Ex: Église MFE-JC Centrale de Douala"
              className="w-full px-4 py-3 rounded-xl text-text-primary text-sm"
              style={{
                backgroundColor: "var(--card)",
                border: "1px solid var(--border)",
              }}
            />
          </div>
          <div>
            <label className="text-text-tertiary text-xs mb-1.5 block">
              Logo de l'organisation
              <span className="block text-[11px] opacity-70 mt-0.5">
                Envoyé dans le bucket « logos » (repli local hors ligne)
              </span>
            </label>
            <div className="flex items-center gap-3">
              {churchLogo ? (
                <img
                  src={churchLogo}
                  alt={`Logo de ${churchName || "l'organisation"}`}
                  className="w-12 h-12 rounded-lg object-cover"
                  style={{ border: "1px solid var(--border)" }}
                />
              ) : (
                <div
                  className="w-12 h-12 rounded-lg flex items-center justify-center"
                  style={{
                    backgroundColor: "var(--card)",
                    border: "1px solid var(--border)",
                  }}
                >
                  <ImageIcon className="w-5 h-5 text-text-tertiary" />
                </div>
              )}
              <label className="flex-1">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
                <span
                  className="text-xs font-medium text-center py-2 rounded-xl block cursor-pointer transition-all active:scale-95"
                  style={{
                    backgroundColor: "color-mix(in srgb, var(--accent-primary) 15%, transparent)",
                    color: "var(--accent-primary)",
                  }}
                  aria-label="Choisir un logo"
                >
                  Choisir un logo
                </span>
              </label>
            </div>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-3 rounded-full font-semibold text-white text-sm transition-all active:scale-95 disabled:opacity-50"
            style={{ backgroundColor: "var(--accent-primary)" }}
            aria-label="Sauvegarder la configuration"
          >
            {saving ? (
              "Sauvegarde..."
            ) : saved ? (
              <span className="flex items-center justify-center gap-2">
                <Check className="w-4 h-4" /> Sauvegardé
              </span>
            ) : (
              "Sauvegarder la configuration"
            )}
          </button>
        </div>
      </div>

      {/* Thème & apparence — bascule Sombre/Clair + couleur d'accent */}
      <div
        className="rounded-xl p-4 mb-5"
        style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
      >
        <div className="flex items-center gap-2 mb-4">
          <Palette className="w-5 h-5" style={{ color: "var(--accent-primary)" }} />
          <span className="text-text-primary font-semibold">
            Thème &amp; apparence
          </span>
        </div>
        <ThemeToggle />
        <p className="text-text-tertiary text-xs mt-4 mb-3">
          Couleur de marque de votre organisation. Elle s'applique immédiatement
          à toute l'application (inchangée entre les modes sombre et clair) et
          se conserve entre les sessions.
        </p>
        <ThemePicker value={themeId} onChange={handleThemeChange} />
      </div>

      {/* Features & navigation */}
      <div
        className="rounded-xl p-4 mb-5"
        style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
      >
        <div className="flex items-center gap-2 mb-3">
          <Puzzle className="w-5 h-5" style={{ color: "var(--accent-primary)" }} />
          <span className="text-text-primary font-semibold">
            Features &amp; navigation
          </span>
        </div>
        <p className="text-text-tertiary text-xs mb-4">
          Choisissez les features de la barre de navigation et celles
          affichées dans le menu « Plus ». Les changements
          s'appliquent immédiatement.
        </p>

        {/* Barre de navigation — liste dynamique (non hardcodée) */}
        <p className="text-text-secondary text-xs font-medium mb-2">
          Barre de navigation
        </p>
        <p className="text-text-tertiary text-xs mb-3">
          Composez votre liste : ajoutez, retirez ou réordonnez les
          onglets ({navTabs.length}/{MAX_NAV_TABS} maximum). Le bouton
          « Plus » reste toujours disponible.
        </p>
        <div className="space-y-2 mb-4">
          {navTabs.map((id, i) => {
            const f = featureById(id);
            const Icon = f?.icon ?? Puzzle;
            return (
              <div
                key={id}
                data-testid="nav-tab-item"
                className="flex items-center gap-2 rounded-xl px-3 py-2.5"
                style={{
                  backgroundColor: "var(--card)",
                  border: "1px solid var(--border)",
                }}
              >
                <Icon
                  className="w-4 h-4 flex-shrink-0"
                  style={{ color: "var(--accent-primary)" }}
                />
                <span className="text-sm text-text-primary flex-1">
                  {f?.label ?? id}
                </span>
                <button
                  type="button"
                  onClick={() => moveNavTab(i, -1)}
                  disabled={i === 0}
                  className="w-7 h-7 rounded-full flex items-center justify-center disabled:opacity-30 active:scale-95 transition-all"
                  style={{ border: "1px solid var(--border)" }}
                  aria-label={`Monter ${f?.label ?? "l'onglet"}`}
                >
                  <ChevronUp className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => moveNavTab(i, 1)}
                  disabled={i === navTabs.length - 1}
                  className="w-7 h-7 rounded-full flex items-center justify-center disabled:opacity-30 active:scale-95 transition-all"
                  style={{ border: "1px solid var(--border)" }}
                  aria-label={`Descendre ${f?.label ?? "l'onglet"}`}
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => removeNavTab(id)}
                  disabled={navTabs.length <= 1}
                  className="w-7 h-7 rounded-full flex items-center justify-center disabled:opacity-30 active:scale-95 transition-all"
                  style={{ border: "1px solid var(--border)" }}
                  aria-label={`Retirer ${f?.label ?? "l'onglet"}`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            );
          })}

          {/* Ajouter une feature à la barre */}
          <div className="flex items-center gap-3">
            <Plus
              className="w-4 h-4 flex-shrink-0"
              style={{ color: "var(--accent-primary)" }}
            />
            <select
              id="nav-tab-select"
              data-testid="nav-tab-select"
              value=""
              disabled={navTabs.length >= MAX_NAV_TABS}
              onChange={(e) => {
                if (e.target.value) addNavTab(e.target.value);
              }}
              className="px-3 py-2.5 rounded-xl text-sm"
              style={{
                backgroundColor: "var(--card)",
                color: "var(--text-primary)",
                border: "1px solid var(--border)",
                maxWidth: 190,
              }}
              aria-label="Ajouter une feature à la barre de navigation"
            >
              <option value="">
                {navTabs.length >= MAX_NAV_TABS
                  ? `Maximum ${MAX_NAV_TABS} onglets`
                  : "Choisir…"}
              </option>
              {FEATURES.filter((f) => !navTabs.includes(f.id)).map((f) => (
                <option key={f.id} value={f.id}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Features affichées (menu « Plus ») */}
        <p className="text-text-secondary text-xs font-medium mb-2">
          Features affichées
        </p>
        <p className="text-text-tertiary text-xs mb-3">
          Non affichées ici = masquées du menu « Plus » de la
          navigation. Une feature épinglée dans la barre n'apparaît pas
          dans cette liste de bascule.
        </p>
        <div className="space-y-1 mb-4">
          {FEATURES.filter((f) => f.kind === "feature").map((f) => {
            const Icon = f.icon;
            const pinned = navTabs.includes(f.id);
            const on = pinned || featureVisible[f.id];
            return (
              <button
                key={f.id}
                onClick={() => {
                  if (!pinned) setFeatureVisible(f.id, !featureVisible[f.id]);
                }}
                disabled={pinned}
                className="flex items-center gap-3 w-full px-3 py-2 rounded-xl transition-all active:scale-95 disabled:opacity-50 text-left"
                style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}
                role="switch"
                aria-checked={on}
                aria-label={
                  pinned
                    ? `${f.label} (épinglée dans la barre)`
                    : `Afficher ${f.label}`
                }
              >
                <Icon
                  className="w-4 h-4 flex-shrink-0"
                  style={{
                    color: on ? "var(--accent-primary)" : "var(--text-tertiary)",
                  }}
                />
                <span
                  className="text-sm flex-1"
                  style={{
                    color: on ? "var(--text-primary)" : "var(--text-tertiary)",
                  }}
                >
                  {f.label}
                </span>
                {pinned ? (
                  <Lock className="w-3.5 h-3.5 text-text-tertiary" />
                ) : (
                  <span
                    className="w-10 h-6 rounded-full relative flex-shrink-0 transition-colors"
                    style={{
                      backgroundColor: on
                        ? "var(--accent-primary)"
                        : "var(--surface-hover)",
                    }}
                  >
                    <span
                      className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all"
                      style={{ left: on ? "22px" : "2px" }}
                    />
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <button
          onClick={resetFeatures}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-full text-sm font-medium transition-all active:scale-95"
          style={{
            backgroundColor: "var(--card)",
            border: "1px solid var(--border)",
            color: "var(--text-secondary)",
          }}
          aria-label="Restaurer les features par défaut"
        >
          <RotateCcw className="w-4 h-4" />
          Restaurer les réglages par défaut
        </button>
      </div>

    </div>
  );
}

export default function SettingsPage() {
  const navigate = useNavigate();
  const { config: appConfig, updateConfig } = useAppConfig();
  const user = useCurrentUser();
  const isOnline = useOnlineStatus();
  const { data: notifications } = useNotifications();
  const { data: accounts, isLoading: accountsLoading } = useAccounts();
  const loadInitialData = useLocalStore((s) => s.loadInitialData);
  const auditEntries = useLocalStore((s) => s.auditEntries);

  // Onglet actif (onglet 1 par défaut ; réinitialisable)
  const [activeTab, setActiveTab] = useState<SettingsTab>("parameters");

  // Features & navigation (réglable par l'utilisateur)
  const featureConfig = useFeatureConfig();

  // Fluidité : dès qu'un réglage de la nav change, on préchauffe les chunks
  // des vues ciblées pour que le premier clic n'affiche pas le squelette.
  useEffect(() => {
    prefetchNavViews(featureConfig.navTabs);
  }, [featureConfig.navTabs]);

  const [churchName, setChurchName] = useState(appConfig.churchName);
  const [churchLogo, setChurchLogo] = useState(appConfig.churchLogoUrl);
  const [userPhoto, setUserPhoto] = useState(appConfig.userPhoto);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [themeId, setThemeId] = useState<ThemeId>(
    () => getStoredThemeId() ?? "fire",
  );

  // La ThemePicker applique la palette au document live et la persiste.
  const handleThemeChange = (id: ThemeId) => {
    setThemeId(id);
    applyTheme(getThemeById(id));
  };

  const handleSave = async () => {
    setSaving(true);
    await updateConfig({
      churchName: churchName.trim(),
      churchLogoUrl: churchLogo,
      userPhoto,
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setUserPhoto(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    // Logos : upload dans le bucket public `logos` (URL stable) ;
    // repli base64 si hors-ligne pour rester fonctionnel.
    try {
      const path = await uploadLuminaFile("logos", file);
      const { data } = supabase.storage.from("logos").getPublicUrl(path);
      setChurchLogo(data.publicUrl);
    } catch {
      const reader = new FileReader();
      reader.onloadend = () => setChurchLogo(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleRefresh = async () => {
    await loadInitialData();
  };

  const handleLogout = () => {
    localStorage.removeItem("lumina-session");
    localStorage.removeItem("lumina-role");
    localStorage.removeItem("lumina-onboarded");
    localStorage.removeItem("lumina-firstName");
    navigate("/auth");
  };

  const totalActions = auditEntries.length;

  if (accountsLoading) {
    return (
      <IonPage>
        <IonContent className="bg-canvas" fullscreen>
          <SettingsSkeleton />
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <IonContent className="bg-canvas">
        <div className="min-h-screen bg-canvas">
          <TopHeader title="Paramètres" />
          <div className="max-w-lg mx-auto px-5 pb-32 pt-16">
            <h1 className="text-text-primary font-bold text-xl mb-4">
              Paramètres
            </h1>

            {/* Tabuleur en haut (HTML natif — pas de custom elements) */}
            <SegmentedTabs
              tabs={SETTINGS_TABS}
              active={activeTab}
              onChange={(id) => setActiveTab(id as SettingsTab)}
            />

            {activeTab === "parameters" && (
              <SettingsTabParameters
                churchName={churchName}
                setChurchName={setChurchName}
                churchLogo={churchLogo}
                saving={saving}
                saved={saved}
                themeId={themeId}
                handleThemeChange={handleThemeChange}
                handleSave={handleSave}
                handleLogoUpload={handleLogoUpload}
                featureConfig={featureConfig}
              />
            )}

            {activeTab === "pratique" && (
              <div role="tabpanel" aria-label="Pratique" className="mb-6">
                {/* Raccourcis */}
                <p className="text-text-secondary text-xs font-medium mb-2">
                  Raccourcis
                </p>
                <div className="grid grid-cols-2 gap-3 mb-5">
                  {user?.role === "CENTRAL_ADMIN" && (
                    <button
                      onClick={() => navigate("/admin")}
                      className="p-4 rounded-xl text-left active:scale-95 transition-transform w-full col-span-2"
                      style={{
                        backgroundColor: "#1a130f",
                        border: "1px solid #3a2a1a",
                      }}
                      aria-label="Administration centrale multi-organisation"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center"
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
                            Gérer plusieurs organisations · cycle de vie ·
                            grants d'admin
                          </p>
                        </div>
                      </div>
                    </button>
                  )}
                  <button
                    onClick={() => navigate("/forms")}
                    className="p-4 rounded-xl text-left active:scale-95 transition-transform w-full"
                    style={{
                      backgroundColor: "var(--surface)",
                      border: "1px solid var(--border)",
                    }}
                    aria-label="Gérer les formulaires"
                  >
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center mb-2"
                      style={{
                        backgroundColor:
                          "color-mix(in srgb, var(--accent-primary) 15%, transparent)",
                      }}
                    >
                      <ClipboardList
                        className="w-5 h-5"
                        style={{ color: "var(--accent-primary)" }}
                      />
                    </div>
                    <p className="text-text-primary text-sm font-semibold">
                      Formulaires
                    </p>
                    <p className="text-text-tertiary text-xs mt-0.5">
                      Créer & gérer
                    </p>
                  </button>
                  <button
                    onClick={() => navigate("/custom-fields")}
                    className="p-4 rounded-xl text-left active:scale-95 transition-transform w-full"
                    style={{
                      backgroundColor: "var(--surface)",
                      border: "1px solid var(--border)",
                    }}
                    aria-label="Champs personnalisés"
                  >
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center mb-2"
                      style={{ backgroundColor: "#8B5CF620" }}
                    >
                      <Tag className="w-5 h-5" style={{ color: "#8B5CF6" }} />
                    </div>
                    <p className="text-text-primary text-sm font-semibold">
                      Champs pers.
                    </p>
                    <p className="text-text-tertiary text-xs mt-0.5">Customiser</p>
                  </button>
                  <button
                    onClick={() => navigate("/archives")}
                    className="p-4 rounded-xl text-left active:scale-95 transition-transform w-full"
                    style={{
                      backgroundColor: "var(--surface)",
                      border: "1px solid var(--border)",
                    }}
                    aria-label="Gérer les archives"
                  >
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center mb-2"
                      style={{ backgroundColor: "#3B82F620" }}
                    >
                      <Archive className="w-5 h-5" style={{ color: "#3B82F6" }} />
                    </div>
                    <p className="text-text-primary text-sm font-semibold">
                      Archives
                    </p>
                    <p className="text-text-tertiary text-xs mt-0.5">
                      Gérer les archives
                    </p>
                  </button>
                  <button
                    onClick={() => navigate("/reports")}
                    className="p-4 rounded-xl text-left active:scale-95 transition-transform w-full"
                    style={{
                      backgroundColor: "var(--surface)",
                      border: "1px solid var(--border)",
                    }}
                    aria-label="Voir les rapports"
                  >
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center mb-2"
                      style={{ backgroundColor: "#1DB95420" }}
                    >
                      <BarChart3 className="w-5 h-5" style={{ color: "#1DB954" }} />
                    </div>
                    <p className="text-text-primary text-sm font-semibold">
                      Rapports
                    </p>
                    <p className="text-text-tertiary text-xs mt-0.5">
                      Bilans & stats
                    </p>
                  </button>
                </div>

                {/* Actions */}
                <p className="text-text-secondary text-xs font-medium mb-2">
                  Actions
                </p>
                <div className="space-y-2">
                  <button
                    onClick={() => navigate("/balance")}
                    className="w-full flex items-center gap-3 p-4 rounded-xl active:scale-95 transition-transform text-left"
                    style={{
                      backgroundColor: "var(--surface)",
                      border: "1px solid var(--border)",
                    }}
                    aria-label="Voir le bilan financier"
                  >
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: "#1DB95420" }}
                    >
                      <CreditCard
                        className="w-5 h-5"
                        style={{ color: "#1DB954" }}
                      />
                    </div>
                    <div>
                      <p className="text-text-primary text-sm font-semibold">
                        Bilan financier
                      </p>
                      <p className="text-text-tertiary text-xs mt-0.5">
                        Voir le rapport par période
                      </p>
                    </div>
                  </button>

                  <button
                    onClick={() => navigate("/tutoriel")}
                    className="w-full flex items-center gap-3 p-4 rounded-xl active:scale-95 transition-transform text-left"
                    style={{
                      backgroundColor: "var(--surface)",
                      border: "1px solid var(--border)",
                    }}
                    aria-label="Voir le tutoriel"
                  >
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: "#8B5CF620" }}
                    >
                      <BookOpen className="text-lg" style={{ color: "#8B5CF6" }} />
                    </div>
                    <div>
                      <p className="text-text-primary text-sm font-semibold">
                        Tutoriel & Aide
                      </p>
                      <p className="text-text-tertiary text-xs mt-0.5">
                        Guide complet d'utilisation
                      </p>
                    </div>
                  </button>

                  <button
                    onClick={() => navigate("/trace")}
                    className="w-full flex items-center gap-3 p-4 rounded-xl active:scale-95 transition-transform text-left"
                    style={{
                      backgroundColor: "var(--surface)",
                      border: "1px solid var(--border)",
                    }}
                    aria-label="Voir la trace d'activité"
                  >
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: "#3B82F620" }}
                    >
                      <Clock className="w-5 h-5" style={{ color: "#3B82F6" }} />
                    </div>
                    <div>
                      <p className="text-text-primary text-sm font-semibold">
                        Trace d'activité
                      </p>
                      <p className="text-text-tertiary text-xs mt-0.5">
                        Journal de toutes les opérations
                      </p>
                    </div>
                  </button>

                  <button
                    onClick={() => navigate("/history")}
                    className="w-full flex items-center gap-3 p-4 rounded-xl active:scale-95 transition-transform text-left"
                    style={{
                      backgroundColor: "var(--surface)",
                      border: "1px solid var(--border)",
                    }}
                    aria-label="Voir l'historique financier"
                  >
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: "#FFB80020" }}
                    >
                      <BarChart3
                        className="w-5 h-5"
                        style={{ color: "#FFB800" }}
                      />
                    </div>
                    <div>
                      <p className="text-text-primary text-sm font-semibold">
                        Historique financier
                      </p>
                      <p className="text-text-tertiary text-xs mt-0.5">
                        Graphiques et statistiques
                      </p>
                    </div>
                  </button>

                  <button
                    onClick={() => navigate("/versement")}
                    className="w-full flex items-center gap-3 p-4 rounded-xl active:scale-95 transition-transform text-left"
                    style={{
                      backgroundColor: "var(--surface)",
                      border: "1px solid var(--border)",
                    }}
                    aria-label="Nouveau versement"
                  >
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: "#FFB80020" }}
                    >
                      <CreditCard
                        className="text-lg"
                        style={{ color: "#FFB800" }}
                      />
                    </div>
                    <div>
                      <p className="text-text-primary text-sm font-semibold">
                        Versement
                      </p>
                      <p className="text-text-tertiary text-xs mt-0.5">
                        Transférer vers la caisse principale
                      </p>
                    </div>
                  </button>

                  <button
                    onClick={handleRefresh}
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
              </div>
            )}

            {activeTab === "profile" && (
              <div role="tabpanel" aria-label="Profil" className="mb-6">
                {/* Profile card */}
                <div
                  className="rounded-xl p-4 mb-5 flex items-center gap-4"
                  style={{
                    backgroundColor: "var(--surface)",
                    border: "1px solid var(--border)",
                  }}
                >
                  <div className="relative">
                    {userPhoto ? (
                      <img
                        src={userPhoto}
                        alt={`Photo de profil de ${user?.firstName ?? ""}`}
                        className="w-14 h-14 rounded-full object-cover"
                      />
                    ) : (
                      <div
                        className="w-14 h-14 rounded-full flex items-center justify-center"
                        style={{
                          backgroundColor:
                            "color-mix(in srgb, var(--accent-primary) 15%, transparent)",
                        }}
                      >
                        <UserCircle
                          className="w-7 h-7"
                          style={{ color: "var(--accent-primary)" }}
                        />
                      </div>
                    )}
                    <label
                      className="absolute bottom-0 right-0 w-6 h-6 rounded-full flex items-center justify-center cursor-pointer transition-all active:scale-95"
                      style={{ backgroundColor: "var(--accent-primary)" }}
                    >
                      <Camera className="w-3 h-3 text-white" />
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                  <div className="flex-1">
                    <p className="text-text-primary font-semibold text-base">
                      {user?.firstName} {user?.lastName}
                    </p>
                    <p className="text-text-tertiary text-sm">
                      {user?.role?.replace(/_/g, " ").toLowerCase()}
                    </p>
                    <p className="text-text-tertiary text-xs mt-0.5">
                      {user?.org?.name}
                    </p>
                  </div>
                </div>

                {/* Statistiques & données sauvegardées */}
                <div
                  className="rounded-xl p-4 mb-5"
                  style={{
                    backgroundColor: "var(--surface)",
                    border: "1px solid var(--border)",
                  }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <Database className="w-5 h-5" style={{ color: "var(--accent-primary)" }} />
                    <span className="text-text-primary font-medium">
                      Statistiques & données sauvegardées
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm mb-2">
                    <div className="flex items-center gap-2">
                      {isOnline ? (
                        <Cloud
                          className="w-4 h-4"
                          style={{ color: "var(--data-income)" }}
                        />
                      ) : (
                        <CloudOff className="w-4 h-4" style={{ color: "var(--text-secondary)" }} />
                      )}
                      <span className="text-text-tertiary">Synchronisation</span>
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{
                        backgroundColor: isOnline
                          ? "color-mix(in srgb, var(--data-income) 12%, transparent)"
                          : "color-mix(in srgb, var(--text-tertiary) 12%, transparent)",
                        color: isOnline ? "var(--data-income)" : "var(--text-tertiary)",
                      }}
                    >
                      {isOnline ? "Connecté" : "Hors ligne"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-text-tertiary">Base de données</span>
                    <span className="text-text-secondary">
                      PowerSync + LocalStorage
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-text-tertiary">Actions enregistrées</span>
                    <span className="text-text-secondary">{totalActions}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-text-tertiary">Notifications</span>
                    <span className="text-text-secondary">
                      {notifications?.length ?? 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-text-tertiary">Caisses / Comptes</span>
                    <span className="text-text-secondary">
                      {accounts?.length ?? 0}
                    </span>
                  </div>
                </div>

                {/* Logout */}
                <button
                  onClick={handleLogout}
                  className="w-full py-3 rounded-full font-medium text-sm text-text-tertiary transition-all active:scale-95"
                  style={{ backgroundColor: "var(--surface)" }}
                  aria-label="Se déconnecter"
                >
                  Se déconnecter
                </button>

                <div className="flex items-center justify-center gap-2 mt-6">
                  <img
                    src="/lumina-logo.png"
                    alt="Lumina"
                    className="w-5 h-5 rounded"
                  />
                  <p className="text-text-tertiary text-xs">
                    Lumina v2.0 ·{" "}
                    {appConfig.churchName || user?.org?.name || "Lumina"}
                  </p>
                </div>
              </div>
            )}
          </div>
          <BottomNav />
        </div>
      </IonContent>
    </IonPage>
  );
}
