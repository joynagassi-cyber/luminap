import { useState } from "react";
import { Building2, Check, ImageIcon } from "lucide-react";
import SettingsShell from "@/components/SettingsShell";
import { useAppConfig } from "@/lib/dataLayer";
import { uploadLuminaFile } from "@/lib/storageService";
import { supabase } from "@/integrations/supabase/client";

export default function SettingsPersonalisation() {
  const { config, updateConfig } = useAppConfig();
  const [churchName, setChurchName] = useState(config.churchName);
  const [churchLogo, setChurchLogo] = useState(config.churchLogoUrl);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);

  const handleSave = async () => {
    setSaving(true);
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
            <input
              id="org-name"
              type="text"
              value={churchName}
              onChange={(e) => {
                setChurchName(e.target.value);
                setDirty(true);
              }}
              placeholder="Ex: Église MFE-JC Centrale de Douala"
              className="w-full px-4 py-3 rounded-xl text-text-primary text-sm"
              style={{
                backgroundColor: "var(--card)",
                border: "1px solid var(--border)",
              }}
              data-testid="org-name-input"
            />
            <p className="text-text-tertiary text-[11px] mt-1.5">
              Nom d'origine affiché dans l'en-tête et les rapports.
            </p>
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

          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !dirty}
            className="w-full py-3 rounded-full font-semibold text-white text-sm transition-transform active:scale-95 disabled:opacity-50"
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
