import { useMemo, useState } from "react";
import {
  IonItem,
  IonLabel,
  IonInput,
  IonSelect,
  IonSelectOption,
  IonTextarea,
  IonCheckbox,
  IonChangeCustomEvent,
} from "@ionic/react";
import { Plus, CheckCircle, Circle, Clock, Lock, Play } from "lucide-react";
import {
  useEventTasks,
  addEventTaskPS,
  updateEventTaskPS,
} from "@/lib/dataLayer";
import { getOrganizationId } from "@/lib/orgContext";
import { formatDate } from "@/lib/utils";
import type { PSEventTask } from "@/lib/dataLayer";
import EmptyState from "@/components/EmptyState";

interface EventTasksProps {
  eventId: string;
  groups?: { id: string; name: string }[];
}

type TaskStatus = "OPEN" | "IN_PROGRESS" | "DONE" | "BLOCKED";

const STATUS_CONFIG: Record<
  TaskStatus,
  { label: string; color: string; bg: string; icon: any }
> = {
  OPEN: {
    label: "Ouverte",
    color: "var(--data-planified)",
    bg: "color-mix(in srgb, var(--data-planified) 12%, transparent)",
    icon: Circle,
  },
  IN_PROGRESS: {
    label: "En cours",
    color: "var(--data-income)",
    bg: "color-mix(in srgb, var(--data-income) 12%, transparent)",
    icon: Play,
  },
  DONE: {
    label: "Terminée",
    color: "var(--text-tertiary)",
    bg: "color-mix(in srgb, var(--text-tertiary) 12%, transparent)",
    icon: CheckCircle,
  },
  BLOCKED: {
    label: "Bloquée",
    color: "var(--data-expense)",
    bg: "color-mix(in srgb, var(--data-expense) 12%, transparent)",
    icon: Lock,
  },
};

export default function EventTasks({
  eventId,
  groups = [],
}: EventTasksProps) {
  const { data: tasks, isLoading } = useEventTasks(eventId);
  const groupMap = useMemo(
    () => new Map(groups.map((g) => [g.id, g.name])),
    [groups],
  );

  // ── Form state (bottom-sheet) ──
  const [showAdd, setShowAdd] = useState(false);
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [groupId, setGroupId] = useState("");
  const [description, setDescription] = useState("");
  const [isSub, setIsSub] = useState(false);
  const [parentId, setParentId] = useState("");
  const [error, setError] = useState("");

  const parents = tasks.filter((t: PSEventTask) => t.is_sub === 0);

  const doneCount = tasks.filter((t: PSEventTask) => t.status === "DONE").length;
  const progressPct = tasks.length > 0 ? Math.round((doneCount / tasks.length) * 100) : 0;

  const resetForm = () => {
    setTitle("");
    setDueDate("");
    setGroupId("");
    setDescription("");
    setIsSub(false);
    setParentId("");
    setError("");
  };

  const handleAdd = async () => {
    if (!title.trim()) {
      setError("Le titre est obligatoire");
      return;
    }
    try {
      await addEventTaskPS({
        org_id: getOrganizationId(),
        event_id: eventId,
        title: title.trim(),
        description: description.trim(),
        is_sub: isSub ? 1 : 0,
        parent_task_id: isSub ? parentId || null : null,
        assigned_group_id: groupId || null,
        due_date: dueDate || null,
        status: "OPEN",
      });
      setShowAdd(false);
      resetForm();
    } catch {
      setError("Erreur lors de l'enregistrement de la tâche");
    }
  };

  const changeStatus = async (id: string, status: TaskStatus) => {
    await updateEventTaskPS(id, { status });
  };

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-3" aria-busy="true">
        <div className="h-2 rounded-full" style={{ backgroundColor: "var(--surface-hover)" }} />
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl h-16" style={{ backgroundColor: "var(--surface)" }} />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Compteur de progression */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
            {doneCount}/{tasks.length} tâche{tasks.length > 1 ? "s" : ""} terminée
            {doneCount > 1 ? "s" : ""}
          </span>
          <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
            {progressPct}%
          </span>
        </div>
        <div
          className="h-2 rounded-full overflow-hidden"
          style={{ backgroundColor: "var(--surface-hover)" }}
        >
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${progressPct}%`,
              backgroundColor: "var(--accent-primary)",
            }}
          />
        </div>
      </div>

      {/* Bouton d'ajout */}
      <button
        onClick={() => setShowAdd(true)}
        className="w-full py-3 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-all active:scale-95"
        style={{
          backgroundColor: "var(--surface)",
          border: "1px dashed color-mix(in srgb, var(--accent-primary) 25%, transparent)",
          color: "var(--accent-primary)",
        }}
        aria-label="Ajouter une tâche"
      >
        <Plus className="w-4 h-4" /> Ajouter une tâche
      </button>

      {/* Liste des tâches */}
      {tasks.length === 0 ? (
        <EmptyState
          title="Aucune tâche"
          description="Ajoutez des tâches pour préparer l'événement"
          icon={<Plus className="w-6 h-6" />}
        />
      ) : (
        <div className="space-y-2">
          {tasks.map((task: PSEventTask) => {
            const status = STATUS_CONFIG[task.status as TaskStatus] ?? STATUS_CONFIG.OPEN;
            const group = task.assigned_group_id ? groupMap.get(task.assigned_group_id) : null;
            const isDone = task.status === "DONE";
            return (
              <div
                key={task.id}
                className="rounded-xl p-3"
                style={{
                  backgroundColor: "var(--surface)",
                  border: "1px solid var(--border)",
                  ...(task.is_sub === 1 ? { marginLeft: 12 } : {}),
                }}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: status.bg }}
                  >
                    <status.icon className="w-4 h-4" style={{ color: status.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-sm font-medium truncate"
                      style={{
                        color: isDone ? "var(--text-tertiary)" : "var(--text-primary)",
                        textDecoration: isDone ? "line-through" : "none",
                      }}
                    >
                      {task.title}
                    </p>
                    {task.description && (
                      <p className="text-xs text-text-tertiary mt-0.5 line-clamp-2">
                        {task.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      {task.due_date && (
                        <span className="flex items-center gap-1 text-xs" style={{ color: "var(--text-tertiary)" }}>
                          <Clock className="w-3 h-3" />
                          {formatDate(task.due_date)}
                        </span>
                      )}
                      {group && (
                        <span
                          className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{
                            backgroundColor: "color-mix(in srgb, var(--accent-primary) 12%, transparent)",
                            color: "var(--accent-primary)",
                          }}
                        >
                          {group}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions inline */}
                <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
                  {task.status !== "IN_PROGRESS" && !isDone && (
                    <button
                      role="button"
                      onClick={() => changeStatus(task.id, "IN_PROGRESS")}
                      className="text-xs px-2 py-1 rounded-full font-medium transition-all active:scale-95"
                      style={{
                        backgroundColor: "color-mix(in srgb, var(--data-income) 12%, transparent)",
                        color: "var(--data-income)",
                      }}
                      aria-label="Marquer en cours"
                    >
                      En cours
                    </button>
                  )}
                  {!isDone && (
                    <button
                      role="button"
                      onClick={() => changeStatus(task.id, "DONE")}
                      className="text-xs px-2 py-1 rounded-full font-medium transition-all active:scale-95"
                      style={{
                        backgroundColor: "color-mix(in srgb, var(--text-tertiary) 12%, transparent)",
                        color: "var(--text-secondary)",
                      }}
                      aria-label="Marquer terminée"
                    >
                      Terminer
                    </button>
                  )}
                  {task.status !== "BLOCKED" && (
                    <button
                      role="button"
                      onClick={() => changeStatus(task.id, "BLOCKED")}
                      className="text-xs px-2 py-1 rounded-full font-medium transition-all active:scale-95"
                      style={{
                        backgroundColor: "color-mix(in srgb, var(--data-expense) 12%, transparent)",
                        color: "var(--data-expense)",
                      }}
                      aria-label="Marquer bloquée"
                    >
                      Bloquer
                    </button>
                  )}
                  {isDone || task.status === "BLOCKED" ? (
                    <button
                      role="button"
                      onClick={() => changeStatus(task.id, "OPEN")}
                      className="text-xs px-2 py-1 rounded-full font-medium transition-all active:scale-95"
                      style={{
                        backgroundColor: "var(--surface-hover)",
                        color: "var(--text-tertiary)",
                      }}
                      aria-label="Réinitialiser au statut ouvert"
                    >
                      Réinitialiser
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal bottom-sheet : création de tâche */}
      {showAdd && (
        <div className="fixed inset-0 z-overlay flex items-end sm:items-center justify-center">
          <div
            className="absolute inset-0 bg-scrim"
            onClick={() => {
              setShowAdd(false);
              resetForm();
            }}
          />
          <div
            className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl"
            style={{ backgroundColor: "var(--card)" }}
          >
            <div className="p-5">
              <h3 className="text-text-primary font-bold text-lg mb-4">
                Nouvelle tâche
              </h3>

              {error && (
                <div
                  className="mb-4 p-3 rounded-xl text-sm"
                  style={{
                    backgroundColor: "color-mix(in srgb, var(--data-expense) 12%, transparent)",
                    color: "var(--data-expense)",
                  }}
                >
                  {error}
                </div>
              )}

              <div className="space-y-4">
                {/* Titre (obligatoire) */}
                <IonItem lines="none" className="bg-card rounded-xl">
                  <IonLabel position="floating" className="text-sm text-text-secondary">
                    Titre *
                  </IonLabel>
                  <IonInput
                    type="text"
                    value={title}
                    onIonChange={(e: IonChangeCustomEvent<string>) =>
                      setTitle(e.detail.value ?? "")
                    }
                    placeholder="Ex: Préparer la salle"
                    slot="input"
                  />
                </IonItem>

                {/* Échéance */}
                <IonItem lines="none" className="bg-card rounded-xl">
                  <IonLabel position="floating" className="text-sm text-text-secondary">
                    Échéance
                  </IonLabel>
                  <IonInput
                    type="date"
                    value={dueDate}
                    onIonChange={(e: IonChangeCustomEvent<string>) =>
                      setDueDate(e.detail.value ?? "")
                    }
                    slot="input"
                  />
                </IonItem>

                {/* Groupe « doit » */}
                <IonItem lines="none" className="bg-card rounded-xl">
                  <IonLabel position="floating" className="text-sm text-text-secondary">
                    Groupe assigné
                  </IonLabel>
                  <IonSelect
                    value={groupId}
                    onIonChange={(e: IonChangeCustomEvent<string>) =>
                      setGroupId(e.detail.value ?? "")
                    }
                    interface="popover"
                    slot="input"
                  >
                    <IonSelectOption value="">Sélectionner un groupe...</IonSelectOption>
                    {groups.map((g) => (
                      <IonSelectOption key={g.id} value={g.id}>
                        {g.name}
                      </IonSelectOption>
                    ))}
                  </IonSelect>
                </IonItem>

                {/* Description */}
                <IonItem lines="none" className="bg-card rounded-xl">
                  <IonLabel position="floating" className="text-sm text-text-secondary">
                    Description
                  </IonLabel>
                  <IonTextarea
                    value={description}
                    onIonChange={(e: IonChangeCustomEvent<string>) =>
                      setDescription(e.detail.value ?? "")
                    }
                    placeholder="Détails, consignes..."
                    rows={3}
                    slot="input"
                  />
                </IonItem>

                {/* Sous-tâche */}
                <IonItem lines="none" className="bg-card rounded-xl">
                  <IonCheckbox
                    checked={isSub}
                    onIonChange={(e: IonChangeCustomEvent) =>
                      setIsSub(e.detail?.checked ?? false)
                    }
                    slot="start"
                  >
                    Sous-tâche
                  </IonCheckbox>
                </IonItem>

                {isSub && parents.length > 0 && (
                  <IonItem lines="none" className="bg-card rounded-xl">
                    <IonLabel position="floating" className="text-sm text-text-secondary">
                      Tâche parente
                    </IonLabel>
                    <IonSelect
                      value={parentId}
                      onIonChange={(e: IonChangeCustomEvent<string>) =>
                        setParentId(e.detail.value ?? "")
                      }
                      interface="popover"
                      slot="input"
                    >
                      <IonSelectOption value="">Sélectionner une tâche...</IonSelectOption>
                      {parents.map((p) => (
                        <IonSelectOption key={p.id} value={p.id}>
                          {p.title}
                        </IonSelectOption>
                      ))}
                    </IonSelect>
                  </IonItem>
                )}
              </div>

              <div className="flex gap-3 mt-5">
                <button
                  onClick={() => {
                    setShowAdd(false);
                    resetForm();
                  }}
                  className="flex-1 py-3 rounded-full font-medium text-sm"
                  style={{
                    backgroundColor: "var(--surface)",
                    color: "var(--text-secondary)",
                  }}
                >
                  Annuler
                </button>
                <button
                  onClick={handleAdd}
                  className="flex-1 py-3 rounded-full font-semibold text-on-accent transition-all active:scale-95"
                  style={{ backgroundColor: "var(--accent-primary)" }}
                >
                  Enregistrer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
