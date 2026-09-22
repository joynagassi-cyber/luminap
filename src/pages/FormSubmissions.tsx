/**
 * FormSubmissions — liste et affiche les soumissions collectées d'un
 * formulaire dynamique (ex. « Baptêmes » + date de baptême).
 *
 * Route : /forms/:id/submissions
 * Accès  : bouton « Voir les soumissions » dans FormBuilder.
 *
 * Avant cette page, les réponses tombaient dans `form_submissions.data`
 * (JSONB) sans aucun écran de visualisation — « data black hole ».
 *
 * Lot F.1c : affichage structuré (labels du FormDefinition), export CSV
 * (buildSubmissionsCSV + Blob) et filtre par statut.
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
  IonButton,
  IonSelect,
  IonSelectOption,
  IonCard,
  IonCardContent,
} from "@ionic/react";
import { Inbox, Clock, User, Download } from "lucide-react";
import {
  formDefinitionRepo,
  formSubmissionRepo,
  buildSubmissionsCSV,
} from "@/lib/formSystem";
import type { FormDefinition, FormSubmission } from "@/types";

const STATUS_FILTERS: Array<{ value: string; label: string }> = [
  { value: "ALL", label: "Tous les statuts" },
  { value: "SUBMITTED", label: "Soumises" },
  { value: "PROCESSED", label: "Traitées" },
  { value: "REJECTED", label: "Rejetées" },
];

export default function FormSubmissions() {
  const { id } = useParams<{ id: string }>();
  const [rows, setRows] = useState<FormSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [formDef, setFormDef] = useState<FormDefinition | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    formDefinitionRepo
      .get(id)
      .then((def) => {
        if (!cancelled) setFormDef(def);
      })
      .catch(() => {
        if (!cancelled) setFormDef(null);
      });
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

  // Labels : key du champ du formulaire → label d'affichage.
  const labelMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const field of formDef?.fields ?? []) {
      map.set(field.key, field.label || field.key);
    }
    return map;
  }, [formDef]);

  const sorted = useMemo(
    () =>
      [...rows].sort(
        (a, b) =>
          new Date(b.submittedAt ?? b.createdAt).getTime() -
          new Date(a.submittedAt ?? a.createdAt).getTime(),
      ),
    [rows],
  );

  const visible = useMemo(
    () =>
      statusFilter === "ALL"
        ? sorted
        : sorted.filter((sub) => sub.status === statusFilter),
    [sorted, statusFilter],
  );

  /**
   * Export CSV des soumissions affichées : entêtes = labels du
   * FormDefinition, séparateur ";", BOM utf-8 (pattern
   * ReportBuilder.exportCSV : Blob + URL.createObjectURL + a.click()).
   */
  const exportCSV = () => {
    if (!formDef || visible.length === 0) return;
    const csv = buildSubmissionsCSV(visible, formDef);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `soumissions_${formDef.key || formDef.id}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const parseFields = (sub: FormSubmission): Record<string, any> => {
    if (sub.data && typeof sub.data === "object") return sub.data;
    try {
      return JSON.parse(typeof sub.data === "string" ? sub.data : "{}");
    } catch {
      return { _raw: String(sub.data) };
    }
  };

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
              style={{ backgroundColor: "var(--surface)" }}
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
              <div className="flex items-center justify-between gap-3">
                <p className="text-text-tertiary text-xs">
                  {visible.length} soumission(s)
                </p>
                <div className="flex items-center gap-2">
                  <IonSelect
                    value={statusFilter}
                    onIonChange={(e: any) =>
                      setStatusFilter(String(e.detail.value ?? "ALL"))
                    }
                    interface="popover"
                    style={{
                      width: "9.5rem",
                      backgroundColor: "var(--surface)",
                      border: "1px solid var(--border)",
                    }}
                  >
                    {STATUS_FILTERS.map((f) => (
                      <IonSelectOption key={f.value} value={f.value}>
                        {f.label}
                      </IonSelectOption>
                    ))}
                  </IonSelect>
                  <IonButton
                    size="small"
                    fill="outline"
                    disabled={visible.length === 0}
                    onClick={exportCSV}
                  >
                    <Download className="w-3 h-3 mr-1" />
                    Exporter CSV
                  </IonButton>
                </div>
              </div>
              {visible.length === 0 ? (
                <div className="text-center text-text-tertiary text-xs py-4">
                  Aucune soumission dans ce statut.
                </div>
              ) : (
                visible.map((sub) => {
                  const fields = parseFields(sub);
                  return (
                    <IonCard
                      key={sub.id}
                      style={{
                        backgroundColor: "var(--surface)",
                        border: "1px solid var(--border)",
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
                                {labelMap.get(k) ?? k}
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
                })
              )}
            </>
          )}
        </div>
      </IonContent>
    </IonPage>
  );
}
