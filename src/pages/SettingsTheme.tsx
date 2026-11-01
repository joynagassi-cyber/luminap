import { useState } from "react";
import SettingsShell from "@/components/SettingsShell";
import ThemeToggle from "@/components/ThemeToggle";
import ThemePicker from "@/components/ThemePicker";
import BadgeGallery from "@/components/BadgeGallery";
import { getStoredThemeId, type ThemeId } from "@/ionic/themes";

export default function SettingsTheme() {
  const [themeId, setThemeId] = useState<ThemeId>(
    () => getStoredThemeId() ?? "fire",
  );

  return (
    <SettingsShell
      title="Thème & apparence"
      subtitle="Mode, couleur de marque et style de l'application"
    >
      <div
        className="rounded-xl p-4 mb-4"
        style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
      >
        <p className="text-text-primary font-semibold text-sm mb-3">
          Mode d'affichage
        </p>
        <ThemeToggle />
        <p className="text-text-tertiary text-xs mt-3">
          Le mode sombre est le défaut. Le choix se conserve entre les sessions
          et s'applique à l'ensemble de l'application.
        </p>
      </div>

      <div
        className="rounded-xl p-4"
        style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
      >
        <p className="text-text-primary font-semibold text-sm mb-1">
          Couleur de marque
        </p>
        <p className="text-text-tertiary text-xs mb-4">
          Couleur d'accent de votre organisation. Elle s'applique immédiatement
          (inchangée entre les modes sombre et clair) et se conserve.
        </p>
        <ThemePicker value={themeId} onChange={(id) => setThemeId(id)} />
      </div>

      <p className="text-text-primary font-semibold text-sm mt-6 mb-3">
        Badges
      </p>
      <p className="text-text-tertiary text-xs mb-4">
        Aperçu des badges de l'application. Ils s'adaptent automatiquement au
        mode (sombre/clair) et à la couleur de marque ci-dessus.
      </p>
      <BadgeGallery />
    </SettingsShell>
  );
}
