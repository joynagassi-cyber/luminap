import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  UserCircle,
  Camera,
  Mail,
  Building2,
  Database,
  Cloud,
  CloudOff,
  LogOut,
} from "lucide-react";
import SettingsShell from "@/components/SettingsShell";
import {
  useAppConfig,
  useCurrentUser,
  useOnlineStatus,
  useNotifications,
  useAccounts,
} from "@/lib/dataLayer";
import { useLocalStore } from "@/store/useLocalStore";
import { authService } from "@/lib/auth";

const ROLE_LABEL: Record<string, string> = {
  CENTRAL_ADMIN: "Administration centrale",
  TREASURIER: "Trésurier",
  ADMIN: "Administrateur",
  PASTEUR: "Pasteur",
  DIACRE: "Diacre",
  MEMBRE: "Membre",
  SECRETARIA: "Secrétariat",
};

function roleLabel(role: string | undefined): string {
  if (!role) return "—";
  const clean = role.replace(/_/g, " ").trim();
  return ROLE_LABEL[role] ?? clean;
}

export default function SettingsProfile() {
  const navigate = useNavigate();
  const { config, updateConfig } = useAppConfig();
  const user = useCurrentUser();
  const isOnline = useOnlineStatus();
  const { data: notifications } = useNotifications();
  const { data: accounts } = useAccounts();
  const auditEntries = useLocalStore((s) => s.auditEntries);

  // Photo de profil (persistée dans la config locale).
  const [photo, setPhoto] = useState(config.userPhoto);
  const [savingPhoto, setSavingPhoto] = useState(false);

  // Prénom / Nom éditables (persistés en localStorage, survivent aux sessions).
  const [firstName, setFirstName] = useState(
    () => localStorage.getItem("lumina-firstName") ?? user?.firstName ?? "",
  );
  const [lastName, setLastName] = useState(
    () => localStorage.getItem("lumina-lastName") ?? user?.lastName ?? "",
  );
  const [namesDirty, setNamesDirty] = useState(false);

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = async () => {
      const dataUrl = reader.result as string;
      setPhoto(dataUrl);
      setSavingPhoto(true);
      await updateConfig({
        churchName: config.churchName,
        churchLogoUrl: config.churchLogoUrl,
        userPhoto: dataUrl,
      });
      setSavingPhoto(false);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveNames = async () => {
    localStorage.setItem("lumina-firstName", firstName.trim());
    localStorage.setItem("lumina-lastName", lastName.trim());
    // Met à jour l'utilisateur local pour que le nom s'affiche partout.
    try {
      const stored = localStorage.getItem("lumina-user");
      if (stored) {
        const parsed = JSON.parse(stored);
        parsed.firstName = firstName.trim();
        parsed.lastName = lastName.trim();
        localStorage.setItem("lumina-user", JSON.stringify(parsed));
      }
    } catch {
      /* stockage indisponible — les champs restent éditables */
    }
    setNamesDirty(false);
  };

  useEffect(() => {
    setNamesDirty(
      firstName !== (user?.firstName ?? "") || lastName !== (user?.lastName ?? ""),
    );
  }, [firstName, lastName, user?.firstName, user?.lastName]);

  const handleLogout = () => {
    // Déconnexion volontaire : les comptes restent listés dans « Mes
    // comptes » (/sessions) — il suffit d'un clic pour re-s'authentifier.
    localStorage.removeItem("lumina-session");
    localStorage.removeItem("lumina-role");
    localStorage.removeItem("lumina-onboarded");
    authService.signOut().catch(() => undefined);
    navigate("/sessions");
  };

  return (
    <SettingsShell title="Profil" subtitle="Vos informations et votre compte">
      {/* Photo bien en haut */}
      <div className="flex flex-col items-center mb-6">
        <div className="relative">
          {photo ? (
            <img
              src={photo}
              alt={`Photo de ${firstName || "l'utilisateur"}`}
              className="w-24 h-24 rounded-full object-cover"
              style={{ border: "2px solid var(--accent-primary)" }}
            />
          ) : (
            <div
              className="w-24 h-24 rounded-full flex items-center justify-center"
              style={{
                backgroundColor:
                  "color-mix(in srgb, var(--accent-primary) 15%, transparent)",
              }}
            >
              <UserCircle className="w-12 h-12" style={{ color: "var(--accent-primary)" }} />
            </div>
          )}
          <label
            className="absolute bottom-0 right-0 w-8 h-8 rounded-full flex items-center justify-center cursor-pointer transition-transform active:scale-90"
            style={{
              backgroundColor: "var(--accent-primary)",
              border: "2px solid var(--canvas)",
            }}
          >
            <Camera className="w-4 h-4 text-white" />
            <input
              type="file"
              accept="image/*"
              onChange={handlePhoto}
              className="hidden"
              aria-label="Changer la photo de profil"
            />
          </label>
        </div>

        {/* Badge rôle */}
        <span
          className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
          style={{
            backgroundColor: "color-mix(in srgb, var(--accent-primary) 16%, transparent)",
            color: "var(--accent-primary)",
            border: "1px solid color-mix(in srgb, var(--accent-primary) 30%, transparent)",
          }}
          data-testid="profile-role-badge"
        >
          <Building2 className="w-3 h-3" />
          {roleLabel(user?.role)}
        </span>
      </div>

      {/* Prénom / Nom éditables */}
      <div
        className="rounded-xl p-4 mb-4"
        style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
      >
        <div className="flex items-center gap-2 mb-3">
          <span className="text-text-primary font-semibold text-sm">
            Nom &amp; prénom
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-text-tertiary text-xs mb-1.5 block" htmlFor="profile-firstname">
              Prénom
            </label>
            <input
              id="profile-firstname"
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              autoComplete="given-name"
              className="w-full px-4 py-3 rounded-xl text-text-primary text-sm"
              style={{
                backgroundColor: "var(--card)",
                border: "1px solid var(--border)",
              }}
            />
          </div>
          <div>
            <label className="text-text-tertiary text-xs mb-1.5 block" htmlFor="profile-lastname">
              Nom
            </label>
            <input
              id="profile-lastname"
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              autoComplete="family-name"
              className="w-full px-4 py-3 rounded-xl text-text-primary text-sm"
              style={{
                backgroundColor: "var(--card)",
                border: "1px solid var(--border)",
              }}
            />
          </div>
        </div>
        <button
          type="button"
          onClick={handleSaveNames}
          disabled={!namesDirty}
          className="w-full mt-3 py-3 rounded-full font-semibold text-white text-sm transition-transform active:scale-95 disabled:opacity-40"
          style={{ backgroundColor: "var(--accent-primary)" }}
          aria-label="Enregistrer le nom"
        >
          {namesDirty ? "Enregistrer" : "Enregistré"}
        </button>
      </div>

      {/* Détails concernant le profil */}
      <div
        className="rounded-xl p-4 mb-4"
        style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
      >
        <p className="text-text-primary font-semibold text-sm mb-3">Détails</p>
        <div className="space-y-2.5 text-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-text-tertiary min-w-0">
              <Mail className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{user?.email || "Non renseigné"}</span>
            </div>
            <span className="text-text-secondary text-xs">E-mail</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-text-tertiary truncate">
              {user?.org?.name || "—"}
            </span>
            <span className="text-text-secondary text-xs flex-shrink-0">Organisation</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-text-tertiary">
              {user?.org?.type || "Église"}
            </span>
            <span className="text-text-secondary text-xs flex-shrink-0">Type</span>
          </div>
        </div>
      </div>

      {/* Statistiques & données */}
      <div
        className="rounded-xl p-4 mb-4"
        style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
      >
        <div className="flex items-center gap-2 mb-3">
          <Database className="w-5 h-5" style={{ color: "var(--accent-primary)" }} />
          <span className="text-text-primary font-medium text-sm">
            Données & synchronisation
          </span>
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-text-tertiary">
              {isOnline ? (
                <Cloud className="w-4 h-4" style={{ color: "var(--data-income)" }} />
              ) : (
                <CloudOff className="w-4 h-4" style={{ color: "var(--text-secondary)" }} />
              )}
              <span>Synchronisation</span>
            </div>
            <span
              className="text-xs px-2 py-0.5 rounded-full font-medium"
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
          <div className="flex items-center justify-between">
            <span className="text-text-tertiary">Actions enregistrées</span>
            <span className="text-text-secondary">{auditEntries.length}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-text-tertiary">Notifications</span>
            <span className="text-text-secondary">{notifications?.length ?? 0}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-text-tertiary">Caisses / comptes</span>
            <span className="text-text-secondary">{accounts?.length ?? 0}</span>
          </div>
        </div>
      </div>

      {/* Déconnexion */}
      <button
        type="button"
        onClick={handleLogout}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-full font-medium text-sm transition-transform active:scale-95"
        style={{
          backgroundColor: "var(--surface)",
          color: "var(--data-expense)",
          border: "1px solid var(--border)",
        }}
        aria-label="Se déconnecter"
      >
        <LogOut className="w-4 h-4" /> Se déconnecter
      </button>

      <div className="flex items-center justify-center gap-2 mt-6">
        <img src="/lumina-logo.png" alt="Lumina" className="w-5 h-5 rounded" />
        <p className="text-text-tertiary text-xs">
          Lumina v2.0 · {user?.org?.name || "Lumina"}
        </p>
      </div>
    </SettingsShell>
  );
}
