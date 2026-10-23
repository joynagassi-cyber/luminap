import { useState } from "react";
import { Building2, Check, ImageIcon, AlertCircle } from "lucide-react";
import SettingsShell from "@/components/SettingsShell";
import { useAppConfig, useCurrentUser, renameOrganizationPS } from "@/lib/dataLayer";
import { uploadLuminaFile } from "@/lib/storageService";
import { supabase } from "@/integrations/supabase/client";
import { getOrganizationId, hasResolvedOrganization } from "@/lib/orgContext";
import { IonInput } from "@ionic/react";

// Rôles autorisés à renommer l'organisation côté serveur (policy
// `orgs_update_merged` : ADMIN de l'org, ou admin central actif).
const RENAME_ROLES = ["ADMIN", "CENTRAL_ADMIN"];

export default function SettingsPersonalisation() {
  const { config, updateConfig } = useAppConfig();
  const user = useCurrentUser();
  const canRename = RENAME_ROLES.includes(user?.role ?? "");
  const [churchName, setChurchName] = useState(config.churchName);
  const [churchLogo, setChurchLogo] = useState(config.churchLogoUrl);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setError(null);
    setSaving(true);
    // 1) Persistance EN BASE (source de vérité, partagée par tous les
    //    utilisateurs de l'organisation). Sans cette écriture, le nom saisi
    //    n'existait que dans le navigateur de l'auteur : les autres membres,
    //    les rapports et l'en-tête affichaient l'ancien nom.
    if (hasResolvedOrganization()) {
      // Contrôle client (l'autorité reste la RLS serveur) : les écritures
      // PowerSync sont optimistes, donc un `rowsAffected` local ne prouve
      // PAS l'acceptation serveur. On refuse tôt un rôle non autorisé plutôt
      // que d'afficher un faux « Sauvegardé ».
      if (!canRename) {
        setSaving(false);
        setError(
          "Seul un administrateur de l'organisation peut modifier son nom.",
        );
        return;
      }
      try {
        await renameOrganizationPS(getOrganizationId(), churchName.trim());
      } catch (e: any) {
        setSaving(false);
        setError(
          `Enregistrement impossible : ${e?.message ?? "erreur inconnue"}. Réessayez une fois connecté.`,
        );
        return;
      }
    }
    // 2) Cache local (affichage immédiat, hors-ligne) — cohérent avec la base.
    await updateConfig({
      churchName: churchName.trim(),
      churchLogoUrl: churchLogo,
      userPhoto: config.userPhoto,
    });
    setSaving(false);
    setSaved(true);
    setDirty(false);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    // Bucket public `logos` (URL stable) ; repli base64 si hors-ligne.
    try {
      const path = await uploadLuminaFile("logos", file);
      const { data } = supabase.storage.from("logos").getPublicUrl(path);
      setChurchLogo(data.publicUrl);
      setDirty(true);
    } catch {
      const reader = new FileReader();
      reader.onloadend = () => {
        setChurchLogo(reader.result as string);
        setDirty(true);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <SettingsShell
      title="Personnalisation de l'organisation"
      subtitle="Nom de l'église / organisation et son logo"
    >
      <div
        className="rounded-xl p-4"
        style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
      >
        <div className="flex items-center gap-2 mb-4">
          <Building2 className="w-5 h-5" style={{ color: "var(--accent-primary)" }} />
          <span className="text-text-primary font-semibold text-sm">
            Identification
          </span>
        </div>

        <div className="space-y-4">
          <div>
            <label
              className="text-text-tertiary text-xs mb-1.5 block"
              htmlFor="org-name"
            >
              Nom de l'organisation
            </label>
            {/* M4 */}
            <IonInput
              id="org-name"
              value={churchName}
              onIonInput={(e) => {
                const v = (e.detail.value as string) ?? "";
                setChurchName(v);
                setDirty(true);
              }}
              placeholder="Ex: Église MFE-JC Centrale de Douala"
              data-testid="org-name-input"
            />
            <p className="text-text-tertiary text-xs mt-1.5">
              Nom d'origine affiché dans l'en-tête et les rapports.
            </p>
          </div>

          <div>
            <label className="text-text-tertiary text-xs mb-1.5 block">
              Logo de l'organisation
              <span className="block text-xs opacity-70 mt-0.5">
                Envoyé dans le bucket « logos » (repli local hors ligne)
              </span>
            </label>
            <div className="flex items-center gap-3">
              {churchLogo ? (
                <img
                  src={churchLogo}
                  alt={`Logo de ${churchName || "l'organisation"}`}
                  className="w-14 h-14 rounded-lg object-cover"
                  style={{ border: "1px solid var(--border)" }}
                />
              ) : (
                <div
                  className="w-14 h-14 rounded-lg flex items-center justify-center"
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
                  aria-label="Choisir un logo"
                />
                <span
                  className="text-xs font-medium text-center py-2.5 px-3 rounded-xl block cursor-pointer transition-transform active:scale-95"
                  style={{
                    backgroundColor:
                      "color-mix(in srgb, var(--accent-primary) 15%, transparent)",
                    color: "var(--accent-primary)",
                  }}
                >
                  {churchLogo ? "Changer le logo" : "Choisir un logo"}
                </span>
              </label>
            </div>
          </div>

          {error && (
            <p
              role="alert"
              data-testid="org-save-error"
              className="flex items-start gap-1.5 text-xs"
              style={{ color: "var(--data-expense)" }}
            >
              <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" aria-hidden="true" />
              <span>{error}</span>
            </p>
          )}

          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !dirty}
            className="w-full py-3 rounded-full font-semibold text-on-accent text-sm transition-transform active:scale-95 disabled:opacity-50"
            style={{ backgroundColor: "var(--accent-primary)" }}
            aria-label="Sauvegarder la personnalisation"
          >
            {saving ? (
              "Sauvegarde…"
            ) : saved ? (
              <span className="flex items-center justify-center gap-2">
                <Check className="w-4 h-4" /> Sauvegardé
              </span>
            ) : (
              "Sauvegarder"
            )}
          </button>
        </div>
      </div>
    </SettingsShell>
  );
}
