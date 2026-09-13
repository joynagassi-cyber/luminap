import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAppConfig, useCurrentUser, useOnlineStatus } from "@/lib/dataLayer";
import { uploadLuminaFile } from "@/lib/storageService";
import { supabase } from "@/integrations/supabase/client";
import { useNotifications, useAccounts } from "@/lib/dataLayer";
import {
  Settings,
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
  ScrollText,
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
} from "lucide-react";
import {
  useFeatureConfig,
  FEATURES,
  featureById,
  NAV_TAB_COUNT,
} from "@/lib/features";
import BottomNav from "@/components/BottomNav";
import TopHeader from "@/components/TopHeader";
import LuminaLogo from "@/components/LuminaLogo";
import ThemePicker from "@/components/ThemePicker";
import { SettingsSkeleton } from "@/components/PageSkeletons";
import { generateId } from "@/lib/utils";
import {
  getStoredThemeId,
  applyTheme,
  getThemeById,
  type ThemeId,
} from "@/ionic/themes";
import {
  IonPage,
  IonHeader,
  IonContent,
  IonTitle,
  IonToolbar,
} from "@ionic/react";
import { useLocalStore } from "@/store/useLocalStore";

export default function SettingsPage() {
  const navigate = useNavigate();
  const { config: appConfig, updateConfig } = useAppConfig();
  const user = useCurrentUser();
  const isOnline = useOnlineStatus();
  const { data: notifications } = useNotifications();
  const { data: accounts, isLoading: accountsLoading } = useAccounts();
  const loadInitialData = useLocalStore((s) => s.loadInitialData);
  const auditEntries = useLocalStore((s) => s.auditEntries);

  // Features & navigation (réglable par l'utilisateur)
  const {
    navTabs,
    visible: featureVisible,
    setNavTab,
    setFeatureVisible,
    resetFeatures,
  } = useFeatureConfig();
  const [churchName, setChurchName] = useState(appConfig.churchName);
  const [churchLogo, setChurchLogo] = useState(appConfig.churchLogoUrl);
  const [userPhoto, setUserPhoto] = useState(appConfig.userPhoto);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [themeId, setThemeId] = useState<ThemeId>(
    () => getStoredThemeId() ?? "fire",
  );

  // The ThemePicker applies the palette to the live document and persists it.
  // We mirror the choice here so the swatch ring + label stay in sync.
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
  const unreadCount = notifications?.filter((n) => !(n as any).is_read).length ?? 0;

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
            <h1 className="text-text-primary font-bold text-xl mb-5">
              Paramètres
            </h1>

            {/* Profile card */}
            <div
              className="rounded-xl p-4 mb-5 flex items-center gap-4"
              style={{ backgroundColor: "#212121" }}
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
                    style={{ backgroundColor: "color-mix(in srgb, var(--accent-primary) 15%, transparent)" }}
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

            {/* Church config */}
            <div
              className="rounded-xl p-4 mb-5"
              style={{ backgroundColor: "#212121" }}
            >
              <div className="flex items-center gap-2 mb-4">
                <Building2 className="w-5 h-5" style={{ color: "var(--accent-primary)" }} />
                <span className="text-text-primary font-semibold">
                  Configuration de l'église
                </span>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-text-tertiary text-xs mb-1.5 block">
                    Nom complet de l'église
                  </label>
                  <input
                    type="text"
                    value={churchName}
                    onChange={(e) => setChurchName(e.target.value)}
                    placeholder="Ex: Église MFE-JC Centrale de Douala"
                    className="w-full px-4 py-3 rounded-xl text-text-primary text-sm "
                    style={{
                      backgroundColor: "#181818",
                      border: "1px solid #282828",
                    }}
                  />
                </div>
                <div>
                  <label className="text-text-tertiary text-xs mb-1.5 block">
                    Logo de l'église
                    <span className="block text-[11px] opacity-70 mt-0.5">
                      Envoyé dans le bucket « logos » (repli local hors ligne)
                    </span>
                  </label>
                  <div className="flex items-center gap-3">
                    {churchLogo ? (
                      <img
                        src={churchLogo}
                        alt={`Logo de ${churchName || "l'église"}`}
                        className="w-12 h-12 rounded-lg object-cover"
                        style={{ border: "1px solid #282828" }}
                      />
                    ) : (
                      <div
                        className="w-12 h-12 rounded-lg flex items-center justify-center"
                        style={{
                          backgroundColor: "#181818",
                          border: "1px solid #282828",
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

            {/* Theme / branding */}
            <div
              className="rounded-xl p-4 mb-5"
              style={{ backgroundColor: "#212121" }}
            >
              <div className="flex items-center gap-2 mb-4">
                <Palette className="w-5 h-5" style={{ color: "var(--accent-primary)" }} />
                <span className="text-text-primary font-semibold">
                  Thème & apparence
                </span>
              </div>
              <p className="text-text-tertiary text-xs mb-4">
                Choisissez la couleur de marque de votre organisation. Elle
                s'applique immédiatement à toute l'application et se conserve
                entre les sessions.
              </p>
              <ThemePicker value={themeId} onChange={handleThemeChange} />
            </div>

            {/* Features & navigation */}
            <div
              className="rounded-xl p-4 mb-5"
              style={{ backgroundColor: "#212121" }}
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

              {/* Barre de navigation — 4 emplacements */}
              <p
                className="text-text-secondary text-xs font-medium mb-2"
              >
                Barre de navigation
              </p>
              <div className="space-y-2 mb-4">
                {Array.from({ length: NAV_TAB_COUNT }).map((_, i) => {
                  const current = featureById(navTabs[i]);
                  const locked = i < 2;
                  if (locked) {
                    return (
                      <div
                        key={i}
                        className="flex items-center gap-3 rounded-xl px-3 py-2.5"
                        style={{ backgroundColor: "#181818", border: "1px solid #282828", opacity: 0.85 }}
                      >
                        {(() => {
                          const Icon = current?.icon ?? Puzzle;
                          return (
                            <Icon className="w-4 h-4" style={{ color: "#808080" }} />
                          );
                        })()}
                        <span className="text-text-tertiary text-sm flex-1">
                          {current?.label ?? "—"}
                        </span>
                        <Lock className="w-3.5 h-3.5 text-text-tertiary" aria-label="Verrouillé" />
                      </div>
                    );
                  }
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <label
                        className="text-text-tertiary text-xs w-16 flex-shrink-0"
                        htmlFor={`nav-slot-${i + 1}`}
                      >
                        Empl. {i + 1}
                      </label>
                      <select
                        id={`nav-slot-${i + 1}`}
                        value={navTabs[i]}
                        onChange={(e) =>
                          setNavTab(i as 2 | 3, e.target.value)
                        }
                        className="flex-1 px-3 py-2.5 rounded-xl text-sm "
                        style={{
                          backgroundColor: "#181818",
                          color: "#fff",
                          border: "1px solid #282828",
                        }}
                        aria-label={`Feature de l'emplacement ${i + 1}`}
                      >
                        {FEATURES.map((f) => {
                          // Une feature déjà épinglée ailleurs est indisponible.
                          const used = navTabs.includes(f.id) && navTabs[i] !== f.id;
                          return (
                            <option key={f.id} value={f.id} disabled={used}>
                              {used ? `${f.label} (déjà choisi)` : f.label}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  );
                })}
              </div>

              {/* Features affichées (menu « Plus ») */}
              <p
                className="text-text-secondary text-xs font-medium mb-2"
              >
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
                      style={{ backgroundColor: "#181818", border: "1px solid #282828" }}
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
                          color: on ? "var(--accent-primary)" : "#808080",
                        }}
                      />
                      <span
                        className="text-sm flex-1"
                        style={{ color: on ? "#fff" : "#808080" }}
                      >
                        {f.label}
                      </span>
                      {pinned ? (
                        <Lock className="w-3.5 h-3.5 text-text-tertiary" />
                      ) : (
                        <span
                          className="w-10 h-6 rounded-full relative flex-shrink-0 transition-colors"
                          style={{
                            backgroundColor: on ? "var(--accent-primary)" : "#282828",
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
                style={{ backgroundColor: "#181818", border: "1px solid #282828", color: "#B3B3B3" }}
                aria-label="Restaurer les features par défaut"
              >
                <RotateCcw className="w-4 h-4" />
                Restaurer les réglages par défaut
              </button>
            </div>

            {/* Sync status */}
            <div
              className="rounded-xl p-4 mb-5"
              style={{ backgroundColor: "#212121" }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  {isOnline ? (
                    <Cloud className="w-5 h-5" style={{ color: "#1DB954" }} />
                  ) : (
                    <CloudOff
                      className="w-5 h-5"
                      style={{ color: "#B3B3B3" }}
                    />
                  )}
                  <span className="text-text-primary font-medium">
                    Synchronisation
                  </span>
                </div>
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{
                    backgroundColor: isOnline ? "#1DB95420" : "#80808020",
                    color: isOnline ? "#1DB954" : "#808080",
                  }}
                >
                  {isOnline ? "Connecté" : "Hors ligne"}
                </span>
              </div>
              <p className="text-text-tertiary text-xs">
                Données synchronisées automatiquement quand la connexion est
                disponible.
              </p>
            </div>

            {/* Storage */}
            <div
              className="rounded-xl p-4 mb-5"
              style={{ backgroundColor: "#212121" }}
            >
              <div className="flex items-center gap-2 mb-3">
                <Database className="w-5 h-5" style={{ color: "var(--accent-primary)" }} />
                <span className="text-text-primary font-medium">
                  Stockage local
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

            {/* Quick links */}
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
                      style={{ backgroundColor: "color-mix(in srgb, var(--accent-primary) 15%, transparent)" }}
                    >
                      <Building2 className="w-5 h-5" style={{ color: "var(--accent-primary)" }} />
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
                  backgroundColor: "#212121",
                  border: "1px solid #282828",
                }}
                aria-label="Gérer les formulaires"
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center mb-2"
                  style={{ backgroundColor: "color-mix(in srgb, var(--accent-primary) 15%, transparent)" }}
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
                  backgroundColor: "#212121",
                  border: "1px solid #282828",
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
                  backgroundColor: "#212121",
                  border: "1px solid #282828",
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
                  backgroundColor: "#212121",
                  border: "1px solid #282828",
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
            <div className="space-y-2 mb-6">
              <button
                onClick={handleRefresh}
                className="w-full flex items-center gap-3 p-4 rounded-xl active:scale-95 transition-transform text-left"
                style={{
                  backgroundColor: "#212121",
                  border: "1px solid #282828",
                }}
                aria-label="Actualiser les données"
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: "color-mix(in srgb, var(--accent-primary) 15%, transparent)" }}
                >
                  <RefreshCw className="w-5 h-5" style={{ color: "var(--accent-primary)" }} />
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

              <button
                onClick={() => navigate("/balance")}
                className="w-full flex items-center gap-3 p-4 rounded-xl active:scale-95 transition-transform text-left"
                style={{
                  backgroundColor: "#212121",
                  border: "1px solid #282828",
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
                  backgroundColor: "#212121",
                  border: "1px solid #282828",
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
                  backgroundColor: "#212121",
                  border: "1px solid #282828",
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
                  backgroundColor: "#212121",
                  border: "1px solid #282828",
                }}
                aria-label="Voir l'historique financier"
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: "#FFB80020" }}
                >
                  <BarChart3 className="w-5 h-5" style={{ color: "#FFB800" }} />
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
                  backgroundColor: "#212121",
                  border: "1px solid #282828",
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
            </div>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="w-full py-3 rounded-full font-medium text-sm text-text-tertiary transition-all active:scale-95"
              style={{ backgroundColor: "#212121" }}
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
                Lumina v2.0 · {appConfig.churchName || user?.org?.name || "Lumina"}
              </p>
            </div>
          </div>
          <BottomNav />
        </div>
      </IonContent>
    </IonPage>
  );
}
