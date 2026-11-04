import { useState } from "react";
import { IonButton, IonContent, IonDatetime, IonModal } from "@ionic/react";

interface Props {
  value: string;
  onChange: (date: string) => void;
  label: string;
  id?: string;
}

/**
 * Date du jour au format local `aaaa-mm-jj`. Jamais via `toISOString()` :
 * en UTC+1, minuit local tombe la veille en UTC (jour décalé).
 */
function todayLocal(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/**
 * Sélecteur de date (A6) — `IonDatetime` en feuille modale.
 *
 * Remplace le calendrier maison (grille mensuelle réimplémentée) par le
 * composant Ionic : locale fr-FR, semaine commençant le lundi, boutons
 * Annuler/Valider natifs. L'API est inchangée (`value`/`onChange` au
 * format `aaaa-mm-jj`), les consommateurs n'ont pas bougé.
 *
 * La réécriture corrige au passage un décalage d'un jour de l'ancienne
 * implémentation en fuseau UTC+ (la date choisie était convertie par
 * `toISOString()`) : les conversions sont locales des deux côtés.
 */
export default function DatePicker({ value, onChange, label, id }: Props) {
  const [open, setOpen] = useState(false);

  // IonDatetime attend une ISO complète ; minuit LOCAL (sans suffixe Z)
  // pour qu'il affiche exactement le jour stocké.
  const isoValue = `${value || todayLocal()}T00:00:00`;

  return (
    <div>
      <label className="text-text-tertiary text-xs mb-1.5 block">{label}</label>
      <IonButton
        expand="block"
        type="button"
        onClick={() => setOpen(true)}
        id={id}
        className="w-full px-4 py-3 rounded-xl text-text-primary text-sm text-left flex items-center justify-between !min-height:auto"
        style={{
          backgroundColor: "var(--surface)",
          border: "1px solid var(--border)",
          color: "inherit",
        }}
      >
        <span>
          {value
            ? new Date(value + "T00:00:00").toLocaleDateString("fr-FR", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })
            : "Sélectionner…"}
        </span>
        <span className="text-text-tertiary text-xs">📅</span>
      </IonButton>

      <IonModal
        isOpen={open}
        onDidDismiss={() => setOpen(false)}
        breakpoints={[0, 0.6]}
        initialBreakpoint={0.6}
      >
        <IonContent>
          <IonDatetime
            presentation="date"
            locale="fr-FR"
            firstDayOfWeek={1}
            showDefaultButtons
            cancelText="Annuler"
            doneText="Valider"
            value={isoValue}
            onIonChange={(e) => {
              const next = e.detail.value;
              if (typeof next === "string" && next.length >= 10) {
                onChange(next.slice(0, 10));
              }
              setOpen(false);
            }}
            onIonCancel={() => setOpen(false)}
          />
        </IonContent>
      </IonModal>
    </div>
  );
}
