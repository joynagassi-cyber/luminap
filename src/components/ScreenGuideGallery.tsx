/**
 * ScreenGuideGallery — galerie de captures d'écrans ANNOTÉES, intégrée au
 * tutoriel in-app (Phase 13 / demande « introduire les images annotées dans
 * le tutoriel »).
 *
 * Source unique : `src/lib/screenGuide.json` (généré par
 * `scripts/visual-docs/build.py` depuis `screens_manifest.py`). Chaque écran
 * y est rattaché à une section du tutoriel (`section`), de sorte que la
 * section « Transactions » montre la capture annotée de l'écran de
 * transaction, etc.
 *
 * L'image annotée (`<slug>.ann.webp`) porte des repères numérotés ; la légende
 * sous l'image rappelle ce que chaque numéro désigne, pour que l'utilisateur
 * s'oriente sans quitter le tutoriel.
 */
import screenGuide, { type ScreenGuideEntry } from "@/lib/screenGuide";

export type { ScreenGuideEntry };

const DATA = screenGuide;

/** Écrans rattachés à une section du tutoriel, dans l'ordre du manifeste. */
export function screensForSection(sectionId: string): ScreenGuideEntry[] {
  return DATA.screens.filter((s) => s.section === sectionId);
}

export default function ScreenGuideGallery({ sectionId }: { sectionId: string }) {
  const screens = screensForSection(sectionId);
  if (screens.length === 0) return null;

  return (
    <div className="space-y-4 mb-5" data-testid="screen-guide-gallery">
      <p className="text-text-tertiary text-xs font-medium uppercase tracking-wider">
        Aperçus annotés
      </p>
      {screens.map((screen) => (
        <figure
          key={screen.slug}
          className="rounded-xl overflow-hidden"
          style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}
          data-testid={`screen-guide-${screen.slug}`}
        >
          <img
            src={`${DATA.imageDir}/${screen.slug}.ann.webp`}
            alt={`Capture annotée — ${screen.title}`}
            loading="lazy"
            decoding="async"
            width={390}
            height={720}
            className="w-full h-auto block"
          />
          <figcaption className="px-4 py-3">
            <p className="text-text-primary text-sm font-semibold mb-1">
              {screen.title}
            </p>
            <p className="text-text-tertiary text-xs mb-3">{screen.purpose}</p>
            <ol className="space-y-1.5">
              {screen.annotations.map((a, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span
                    className="flex-shrink-0 w-5 h-5 rounded-full text-[11px] font-bold flex items-center justify-center"
                    style={{ backgroundColor: "var(--accent-primary)", color: "var(--on-accent)" }}
                  >
                    {i + 1}
                  </span>
                  <span className="text-text-secondary text-xs">{a.label}</span>
                </li>
              ))}
            </ol>
          </figcaption>
        </figure>
      ))}
    </div>
  );
}
