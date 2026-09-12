/**
 * FormSubmissions — liste et affiche les soumissions collectées d'un
 * formulaire dynamique (ex. « Baptêmes » + date de baptême).
 *
 * Route : /forms/:id/submissions
 * Accès  : bouton « Voir les soumissions » dans FormBuilder.
 *
 * Avant cette page, les réponses tombaient dans `form_submissions.data`
 * (JSONB) sans aucun écran de visualisation — « data black hole ».
 */
import { useEffect, useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import {
  IonPage,
  IonHeader,
  IonContent,
  IonTitle,
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonCard,
  IonCardContent,
} from "@ionic/react";
import { Inbox, Clock, User } from "lucide-react";
import { formSubmissionRepo } from "@/lib/formSystem";
import type { FormSubmission } from "@/types";

export default function FormSubmissions() {
  const { id } = useParams<{ id: string }>();
  const [rows, setRows] = useState<FormSubmission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    formSubmissionRepo
      .list({ formDefinitionId: id })
      .then((list) => {
        if (cancelled) return;
        setRows(list);
      })
      .catch(() => {
        if (cancelled) return;
        setRows([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const sorted = useMemo(
    () =>
      [...rows].sort(
        (a, b) =>
          new Date(b.submittedAt ?? b.createdAt).getTime() -
          new Date(a.submittedAt ?? a.createdAt).getTime(),
      ),
    [rows],
  );

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/forms" />
          </IonButtons>
          <IonTitle>Soumissions</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="bg-canvas" fullscreen>
        <div className="max-w-lg mx-auto px-5 py-4 space-y-3">
          {loading ? (
            <div className="p-4 text-center text-text-tertiary text-sm">
              Chargement…
            </div>
          ) : sorted.length === 0 ? (
            <div
              className="rounded-xl p-5 text-center"
              style={{ backgroundColor: "#212121" }}
            >
              <Inbox className="w-8 h-8 mx-auto text-text-tertiary mb-2" />
              <p className="text-text-primary text-sm">
                Aucune soumission pour l'instant.
              </p>
              <p className="text-text-tertiary text-xs mt-1">
                Les réponses envoyées depuis « Remplir » apparaîtront ici.
              </p>
            </div>
          ) : (
            <>
              <p className="text-text-tertiary text-xs">
                {sorted.length} soumission(s)
              </p>
              {sorted.map((sub) => {
                const fields =
                  sub.data && typeof sub.data === "object"
                    ? sub.data
                    : (() => {
                        try {
                          return JSON.parse(sub.data ?? "{}");
                        } catch {
                          return { _raw: String(sub.data) };
                        }
                      })();
                return (
                  <IonCard
                    key={sub.id}
                    style={{
                      backgroundColor: "#212121",
                      border: "1px solid #282828",
                    }}
                  >
                    <IonCardContent>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <User className="w-4 h-4 text-text-tertiary flex-shrink-0" />
                          <span className="text-text-primary text-sm truncate">
                            {sub.submittedBy || "Anonyme"}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-text-tertiary text-xs flex-shrink-0">
                          <Clock className="w-3 h-3" />
                          {(sub.submittedAt ?? sub.createdAt)
                            ? new Date(sub.submittedAt ?? sub.createdAt).toLocaleDateString("fr-FR")
                            : "—"}
                        </div>
                      </div>
                      <dl className="space-y-1.5">
                        {Object.entries(fields).map(([k, v]) => (
                          <div
                            key={k}
                            className="flex justify-between gap-3 text-xs"
                          >
                            <dt className="text-text-tertiary flex-shrink-0 max-w-[40%] break-words">
                              {k}
                            </dt>
                            <dd className="text-text-primary text-right break-words">
                              {v == null
                                ? "—"
                                : typeof v === "object"
                                  ? JSON.stringify(v)
                                  : String(v)}
                            </dd>
                          </div>
                        ))}
                      </dl>
                    </IonCardContent>
                  </IonCard>
                );
              })}
            </>
          )}
        </div>
      </IonContent>
    </IonPage>
  );
}
