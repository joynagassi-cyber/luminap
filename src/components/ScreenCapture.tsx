/**
 * ScreenCapture — affiche la capture d'écran illustrant un parcours.
 *
 * ── Principe : dégradation silencieuse ──────────────────────────────────────
 * Les captures sont produites hors ligne (`pnpm capture:screens`) et vivent
 * dans `public/captures/<id>.png`. Tant qu'elles n'ont pas été générées, le
 * fichier n'existe pas : l'image renvoie 404 et on l'**omet simplement**. Une
 * icône d'image cassée dans un écran d'aide serait pire que pas d'image.
 *
 * C'est aussi ce qui rend l'intégration progressive possible : on peut livrer
 * le tutoriel avant d'avoir photographié tous les écrans, et les images
 * apparaissent au fur et à mesure, sans redéploiement de code.
 *
 * ── Pourquoi une image et pas un schéma ─────────────────────────────────────
 * L'utilisateur visé ne lit pas « ouvrez la page Finance puis touchez le bouton
 * en bas » : il ne sait pas où est « en bas ». Une photo du vrai écran, avec
 * l'élément qu'il doit reconnaître, remplace une phrase par un repère.
 */
import { useState } from "react";
import { screensForHowto } from "@/lib/screenManifest";

export interface ScreenCaptureProps {
  /** Identifiant du parcours (`HOWTOS[].id`). */
  howtoId: string;
}

export default function ScreenCapture({ howtoId }: ScreenCaptureProps) {
  const screens = screensForHowto(howtoId);
  // Suit les images qui ont échoué : Set plutôt qu'un booléen, car un parcours
  // peut illustrer plusieurs écrans.
  const [failed, setFailed] = useState<ReadonlySet<string>>(new Set());

  const visible = screens.filter((s) => !failed.has(s.id));
  if (visible.length === 0) return null;

  return (
    <div className="mt-3 space-y-3">
      {visible.map((screen) => (
        <figure key={screen.id} className="m-0">
          <img
            src={`/captures/${screen.id}.png`}
            alt={`Écran « ${screen.title} »`}
            loading="lazy"
            decoding="async"
            className="w-full rounded-lg"
            style={{
              border: "1px solid var(--border)",
              display: "block",
              backgroundColor: "var(--surface-hover)",
            }}
            onError={() =>
              setFailed((prev) => {
                const next = new Set(prev);
                next.add(screen.id);
                return next;
              })
            }
          />
          <figcaption
            className="text-xs mt-1"
            style={{ color: "var(--text-tertiary)" }}
          >
            {screen.title} — {screen.hint}
          </figcaption>
        </figure>
      ))}
    </div>
  );
}
