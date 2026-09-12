import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useEvents, useTransactions, useCaisses, deleteEventPS, updateEventPS, addTransactionPS, useCurrentUser } from "@/lib/dataLayer";
import { formatCurrencyCompact, formatDate } from "@/lib/utils";
import {
  Calendar,
  Clock,
  Tag,
  CheckCircle,
  Play,
  Flag,
  Trash2,
  AlertCircle,
  Plus,
  ArrowUp,
  ArrowDown,
  Edit3,
} from "lucide-react";
import BottomNav from "@/components/BottomNav";
import TopHeader from "@/components/TopHeader";
import { FullPageSkeleton } from "@/components/Skeleton";
import type { EventStatus } from "@/types";
import { security } from "@/capabilities/security";
import { workflow } from "@/capabilities/workflow";
import { getOrganizationId } from "@/lib/orgContext";
import {
  IonPage,
  IonHeader,
  IonContent,
  IonTitle,
  IonToolbar,
  IonButtons,
  IonBackButton,
} from "@ionic/react";

type Tab = "overview" | "budget" | "transactions";

const STATUS_CONFIG: Record<
  EventStatus,
  { label: string; color: string; bg: string; icon: any }
> = {
  PLANIFIED: {
    label: "Planifié",
    color: "#3B82F6",
    bg: "#3B82F620",
    icon: Calendar,
  },
  ONGOING: { label: "En cours", color: "#1DB954", bg: "#1DB95420", icon: Play },
  COMPLETED: {
    label: "Terminé",
    color: "#B3B3B3",
    bg: "#80808020",
    icon: CheckCircle,
  },
  CANCELLED: { label: "Annulé", color: "#E51332", bg: "#E5133220", icon: Flag },
};

export default function EventDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: events } = useEvents();
  const { data: transactions } = useTransactions();
  const user = useCurrentUser();

  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [showDelete, setShowDelete] = useState(false);
  const [success, setSuccess] = useState("");
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [selectedBudgetItemId, setSelectedBudgetItemId] = useState<
    string | null
  >(null);
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseDescription, setExpenseDescription] = useState("");
  const [expenseError, setExpenseError] = useState("");

  const event = events.find((e: any) => e.id === id);

  if (!event) return <FullPageSkeleton />;

  const config = STATUS_CONFIG[event.status];
  const budgetItems = (event as any).budget_items ? JSON.parse((event as any).budget_items) : [];
  const budgetSpent = budgetItems.reduce(
    (s: number, i: any) => s + (i.spent || 0),
    0,
  );
  const eventTxs = transactions.filter(
    (t: any) => t.event_id === event.id || t.eventId === event.id,
  );

  const handleStatusChange = async (newStatus: EventStatus) => {
    if (!security.hasPermission(user.role as any, "event:update")) return;
    const result = await workflow.transition(
      "event",
      event,
      newStatus,
      user.id,
      { comment: `Changement de statut: ${event.status} -> ${newStatus}` },
    );
    if (!result.success) {
      setSuccess(`Transition bloquee : ${result.reason}`);
      setTimeout(() => setSuccess(""), 3000);
      return;
    }
    setSuccess(`Statut change : ${STATUS_CONFIG[newStatus].label}`);
    setTimeout(() => setSuccess(""), 3000);
  };

  const handleDelete = async () => {
    if (!security.hasPermission(user.role as any, "event:delete")) return;
    await deleteEventPS(id!);
    navigate("/events");
  };

  const handleAddExpense = async () => {
    if (!security.hasPermission(user.role as any, "transaction:create")) {
      setExpenseError("Permission insuffisante");
      return;
    }
    const trimmedAmount = (expenseAmount || "").trim();
    const trimmedDesc = (expenseDescription || "").trim();
    const trimmedItemId = (selectedBudgetItemId || "").trim();
    if (!trimmedAmount || !trimmedDesc || !trimmedItemId) {
      setExpenseError("Veuillez remplir tous les champs");
      return;
    }

    const budgetItem = budgetItems.find(
      (i: any) => i.id === selectedBudgetItemId,
    );
    if (!budgetItem) return;

    const amountFCFA = parseFloat(expenseAmount);
    if (isNaN(amountFCFA) || amountFCFA <= 0) {
      setExpenseError("Montant invalide");
      return;
    }

    const amountCents = Math.round(amountFCFA * 100);
    const now = new Date().toISOString();
    const sessionId = localStorage.getItem("lumina-session") || "local-user";

    const sourceCaisseId =
      budgetItem.fundedBy === "main" ? "main" : budgetItem.fundedBy;
    const categoryId = budgetItem.categoryId || "cat-frais-fonc";

    await addTransactionPS({
      org_id: getOrganizationId(),
      type: "EXPENSE",
      amount: amountCents,
      description: `${event.name} — ${expenseDescription}`,
      date: now.split("T")[0],
      status: "APPROVED",
      category_id: categoryId,
      org_unit_id: null,
      compensates_for: null,
      comment: `Dépense événement: ${expenseDescription}`,
      created_by_id: sessionId,
      approved_by_id: sessionId,
      approved_at: now,
      event_id: event.id,
      source: "CAISSE",
      person_name: null,
      source_caisse_id: sourceCaisseId,
      versement_id: null,
      reversal_of_id: null,
    });

    const updatedItems = budgetItems.map((item: any) =>
      item.id === selectedBudgetItemId
        ? { ...item, spent: (item.spent || 0) + amountCents }
        : item,
    );

    await updateEventPS(event.id, { budget_items: JSON.stringify(updatedItems) });

    setSuccess(
      `Dépense de ${formatCurrencyCompact(amountCents)} FCFA enregistrée`,
    );
    setTimeout(() => setSuccess(""), 3000);
    setShowAddExpense(false);
    setExpenseAmount("");
    setExpenseDescription("");
    setSelectedBudgetItemId(null);
  };

  const remaining = (event.budget || 0) - budgetSpent;
  const progressPct =
    (event.budget || 0) > 0
      ? Math.min(100, Math.round((budgetSpent / event.budget) * 100))
      : 0;

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/events" />
          </IonButtons>
          <IonTitle>{event.name}</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <TopHeader title={event.name} />

        <div className="flex-1 overflow-y-auto px-5 pb-28 pt-4">
          {success && (
            <div
              className="mb-4 p-3 rounded-xl text-sm"
              style={{ backgroundColor: "#1DB95420", color: "#1DB954" }}
            >
              {success}
            </div>
          )}

          {/* Status badge */}
          <div
            className="flex items-center justify-between mb-6 p-4 rounded-xl"
            style={{ backgroundColor: "#212121", border: "1px solid #282828" }}
          >
            <span
              className="flex items-center gap-2 text-sm px-3 py-1.5 rounded-full font-medium"
              style={{ color: config.color, backgroundColor: config.bg }}
            >
              <config.icon className="w-4 h-4" /> {config.label}
            </span>
            <div className="flex items-center gap-2">
              {event.status === "PLANIFIED" && (
                <button
                  onClick={() => handleStatusChange("ONGOING")}
                  className="px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1"
                  style={{ backgroundColor: "#1DB95420", color: "#1DB954" }}
                  aria-label="Démarrer l'événement"
                >
                  <Play className="w-3 h-3" /> Démarrer
                </button>
              )}
              {event.status === "ONGOING" && (
                <button
                  onClick={() => handleStatusChange("COMPLETED")}
                  className="px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1"
                  style={{ backgroundColor: "#80808020", color: "#B3B3B3" }}
                  aria-label="Terminer l'événement"
                >
                  <CheckCircle className="w-3 h-3" /> Terminer
                </button>
              )}
              {(event.status === "PLANIFIED" || event.status === "ONGOING") && (
                <button
                  onClick={() => handleStatusChange("CANCELLED")}
                  className="px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1"
                  style={{ backgroundColor: "#E5133220", color: "#E51332" }}
                  aria-label="Annuler l'événement"
                >
                  <Flag className="w-3 h-3" /> Annuler
                </button>
              )}
            </div>
          </div>

          {/* Hero Card */}
          <div
            className="rounded-2xl p-5 mb-5 text-center"
            style={{ backgroundColor: "#212121", border: "1px solid #282828" }}
          >
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3"
              style={{ backgroundColor: config.bg }}
            >
              <config.icon
                className="w-8 h-8"
                style={{ color: config.color }}
              />
            </div>
            <h1 className="text-text-primary font-bold text-xl mb-1">
              {event.name}
            </h1>
            {event.description && (
              <p className="text-text-tertiary text-sm mb-4">
                {event.description}
              </p>
            )}

            <div className="flex items-center justify-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-text-tertiary" />
                <span className="text-text-secondary">
                  {formatDate((event as any).start_date || (event as any).startDate)}
                </span>
              </div>
              {(event as any).end_date ||
                ((event as any).endDate && (
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-text-tertiary" />
                    <span className="text-text-secondary">
                      {formatDate((event as any).end_date || (event as any).endDate)}
                    </span>
                  </div>
                ))}
            </div>
          </div>

          {/* Stats summary */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div
              className="rounded-xl p-3 text-center"
              style={{ backgroundColor: "#212121" }}
            >
              <p className="text-text-tertiary text-xs mb-1">Budget</p>
              <p className="text-text-primary font-bold text-sm">
                {formatCurrencyCompact(event.budget || 0)}{" "}
                <span className="text-text-tertiary text-xs font-normal">
                  F
                </span>
              </p>
            </div>
            <div
              className="rounded-xl p-3 text-center"
              style={{ backgroundColor: "#212121" }}
            >
              <p className="text-text-tertiary text-xs mb-1">Dépensé</p>
              <p
                className="font-bold text-sm"
                style={{
                  color:
                    budgetSpent > (event.budget || 0) ? "#E51332" : "#FFB800",
                }}
              >
                {formatCurrencyCompact(budgetSpent)}{" "}
                <span className="text-text-tertiary text-xs font-normal">
                  F
                </span>
              </p>
            </div>
            <div
              className="rounded-xl p-3 text-center"
              style={{ backgroundColor: "#212121" }}
            >
              <p className="text-text-tertiary text-xs mb-1">Reste</p>
              <p
                className="font-bold text-sm"
                style={{ color: remaining >= 0 ? "#1DB954" : "#E51332" }}
              >
                {formatCurrencyCompact(Math.max(0, remaining))}{" "}
                <span className="text-text-tertiary text-xs font-normal">
                  F
                </span>
              </p>
            </div>
          </div>

          {/* Budget progress */}
          {(event.budget || 0) > 0 && (
            <div
              className="rounded-xl p-4 mb-6"
              style={{
                backgroundColor: "#212121",
                border: "1px solid #282828",
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-text-tertiary text-xs">
                  Progression budgétaire
                </span>
                <span className="text-text-secondary text-xs">
                  {progressPct}%
                </span>
              </div>
              <div
                className="h-2 rounded-full overflow-hidden"
                style={{ backgroundColor: "#282828" }}
              >
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${progressPct}%`,
                    backgroundColor:
                      budgetSpent > (event.budget || 0) ? "#E51332" : "var(--accent-primary)",
                  }}
                />
              </div>
              {budgetSpent > (event.budget || 0) && (
                <div
                  className="flex items-center gap-2 mt-2 text-xs"
                  style={{ color: "#E51332" }}
                >
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>
                    Budget dépassé de{" "}
                    {formatCurrencyCompact(budgetSpent - event.budget)} FCFA
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Tabs */}
          <div className="mt-6 mb-6">
            <div
              className="flex rounded-2xl p-1.5 overflow-x-auto scrollbar-hide"
              style={{
                backgroundColor: "#212121",
                border: "1px solid #282828",
                gap: "6px",
              }}
            >
              {[
                { id: "overview" as Tab, label: "Aperçu" },
                { id: "budget" as Tab, label: "Budget" },
                { id: "transactions" as Tab, label: "Transactions" },
              ].map(({ id: tabId, label }) => (
                <button
                  key={tabId}
                  onClick={() => setActiveTab(tabId)}
                  className="flex-shrink-0 py-3 px-4 rounded-xl text-xs font-medium whitespace-nowrap transition-all"
                  style={
                    activeTab === tabId
                      ? {
                          backgroundColor: "var(--accent-primary)",
                          color: "#fff",
                          boxShadow: "0 2px 8px rgba(255,107,0,0.3)",
                        }
                      : { backgroundColor: "transparent", color: "#808080" }
                  }
                  aria-label={`Onglet ${label}`}
                  role="tab"
                  aria-selected={activeTab === tabId}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Tab: Overview */}
          {activeTab === "overview" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setActiveTab("budget")}
                  className="p-4 rounded-xl text-left transition-all active:scale-95 w-full"
                  style={{
                    backgroundColor: "#212121",
                    border: "1px solid #282828",
                  }}
                  aria-label="Gérer le budget"
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center mb-2"
                    style={{ backgroundColor: "color-mix(in srgb, var(--accent-primary) 12%, transparent)" }}
                  >
                    <Tag className="w-5 h-5" style={{ color: "var(--accent-primary)" }} />
                  </div>
                  <p className="text-text-primary text-sm font-semibold">
                    Gérer le budget
                  </p>
                  <p className="text-text-tertiary text-xs mt-1">
                    {budgetItems.length} postes
                  </p>
                </button>
                <button
                  onClick={() => setActiveTab("transactions")}
                  className="p-4 rounded-xl text-left transition-all active:scale-95 w-full"
                  style={{
                    backgroundColor: "#212121",
                    border: "1px solid #282828",
                  }}
                  aria-label="Voir les transactions"
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center mb-2"
                    style={{ backgroundColor: "#1DB95420" }}
                  >
                    <ArrowDown
                      className="w-5 h-5"
                      style={{ color: "#1DB954" }}
                    />
                  </div>
                  <p className="text-text-primary text-sm font-semibold">
                    Transactions
                  </p>
                  <p className="text-text-tertiary text-xs mt-1">
                    {eventTxs.length} liée{eventTxs.length > 1 ? "s" : ""}
                  </p>
                </button>
              </div>

              {budgetItems.length > 0 && (
                <div
                  className="rounded-xl p-4"
                  style={{ backgroundColor: "#212121" }}
                >
                  <p className="text-text-tertiary text-xs font-medium mb-3">
                    Répartition du budget
                  </p>
                  <div className="space-y-2">
                    {budgetItems.slice(0, 3).map((item: any) => {
                      const pct =
                        item.allocated > 0
                          ? Math.min(
                              100,
                              Math.round(
                                ((item.spent || 0) / item.allocated) * 100,
                              ),
                            )
                          : 0;
                      return (
                        <div key={item.id}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-text-secondary truncate">
                              {item.label}
                            </span>
                            <span className="text-text-tertiary">
                              {formatCurrencyCompact(item.spent || 0)}/
                              {formatCurrencyCompact(item.allocated)} F
                            </span>
                          </div>
                          <div
                            className="h-1.5 rounded-full overflow-hidden"
                            style={{ backgroundColor: "#282828" }}
                          >
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${pct}%`,
                                backgroundColor:
                                  pct >= 100 ? "#E51332" : "var(--accent-primary)",
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                    {budgetItems.length > 3 && (
                      <p className="text-text-tertiary text-xs text-center mt-2">
                        + {budgetItems.length - 3} autres postes
                      </p>
                    )}
                  </div>
                </div>
              )}

              {eventTxs.length > 0 && (
                <div
                  className="rounded-xl p-4"
                  style={{ backgroundColor: "#212121" }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-text-tertiary text-xs font-medium">
                      Dernières transactions
                    </p>
                    <button
                      onClick={() => setActiveTab("transactions")}
                      className="text-xs"
                      style={{ color: "var(--accent-primary)" }}
                    >
                      Tout voir
                    </button>
                  </div>
                  {eventTxs
                    .sort(
                      (a: any, b: any) =>
                        new Date(b.date || b.created_at).getTime() -
                        new Date(a.date || a.created_at).getTime(),
                    )
                    .slice(0, 3)
                    .map((tx: any) => (
                      <div
                        key={tx.id}
                        className="flex items-center gap-3 py-2 border-b last:border-0"
                        style={{ borderColor: "#282828" }}
                      >
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                          style={{
                            backgroundColor:
                              tx.type === "INCOME" ? "#1DB95420" : "#E5133220",
                          }}
                        >
                          {tx.type === "INCOME" ? (
                            <ArrowUp
                              className="w-4 h-4"
                              style={{ color: "#1DB954" }}
                            />
                          ) : (
                            <ArrowDown
                              className="w-4 h-4"
                              style={{ color: "#E51332" }}
                            />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-text-primary text-sm font-medium truncate">
                            {tx.description}
                          </p>
                          <p className="text-text-tertiary text-xs">
                            {formatDate(tx.date || tx.created_at)}
                          </p>
                        </div>
                        <span
                          className="text-sm font-bold"
                          style={{
                            color: tx.type === "INCOME" ? "#1DB954" : "#E51332",
                          }}
                        >
                          {tx.type === "INCOME" ? "+" : "-"}
                          {formatCurrencyCompact(tx.amount)} F
                        </span>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}

          {/* Tab: Budget */}
          {activeTab === "budget" && (
            <div className="space-y-3">
              {budgetItems.length === 0 ? (
                <div
                  className="text-center py-10 rounded-xl"
                  style={{ backgroundColor: "#212121" }}
                >
                  <Tag className="w-8 h-8 mx-auto mb-3 text-text-tertiary opacity-40" />
                  <p className="text-text-tertiary text-sm">
                    Aucun poste budgétaire
                  </p>
                  <p className="text-text-tertiary text-xs mt-1">
                    Ajoutez des postes depuis la création de l'événement
                  </p>
                </div>
              ) : (
                budgetItems.map((item: any) => {
                  const pct =
                    item.allocated > 0
                      ? Math.min(
                          100,
                          Math.round(
                            ((item.spent || 0) / item.allocated) * 100,
                          ),
                        )
                      : 0;
                  const isExceeded = (item.spent || 0) > item.allocated;
                  const remainingItem = item.allocated - (item.spent || 0);
                  return (
                    <div
                      key={item.id}
                      className="rounded-xl p-4"
                      style={{
                        backgroundColor: "#212121",
                        border: isExceeded
                          ? "1px solid #E5133240"
                          : "1px solid #282828",
                      }}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-text-primary text-sm font-medium">
                            {item.label}
                          </p>
                          <p className="text-text-tertiary text-xs mt-0.5">
                            {item.fundedBy === "main"
                              ? "Caisse principale"
                              : item.fundedBy}
                          </p>
                        </div>
                        <div className="text-right ml-3">
                          <p className="text-text-primary text-sm font-bold">
                            {formatCurrencyCompact(item.allocated)} F
                          </p>
                          <p
                            className={`text-xs ${isExceeded ? "text-[#E51332]" : "text-text-tertiary"}`}
                          >
                            {formatCurrencyCompact(item.spent || 0)} F dépensé
                          </p>
                        </div>
                      </div>

                      <div
                        className="h-1.5 rounded-full overflow-hidden mb-3"
                        style={{ backgroundColor: "#282828" }}
                      >
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: isExceeded
                              ? "#E51332"
                              : pct >= 75
                                ? "#FFB800"
                                : "#1DB954",
                          }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        <span className="text-text-tertiary">
                          Reste:{" "}
                          <span
                            style={{
                              color: remainingItem >= 0 ? "#1DB954" : "#E51332",
                            }}
                          >
                            {formatCurrencyCompact(Math.max(0, remainingItem))}{" "}
                            F
                          </span>
                        </span>
                        {security.hasPermission(
                          user.role as any,
                          "transaction:create",
                        ) && (
                          <button
                            onClick={() => {
                              setSelectedBudgetItemId(item.id);
                              setShowAddExpense(true);
                              setExpenseError("");
                            }}
                            className="px-3 py-1.5 rounded-lg font-medium"
                            style={{
                              backgroundColor: "color-mix(in srgb, var(--accent-primary) 12%, transparent)",
                              color: "var(--accent-primary)",
                            }}
                          >
                            <Plus className="w-3 h-3 inline mr-1" /> Dépenser
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* Tab: Transactions */}
          {activeTab === "transactions" && (
            <div className="space-y-2">
              {security.hasPermission(
                user.role as any,
                "transaction:create",
              ) && (
                <button
                  onClick={() =>
                    navigate("/transaction/new", {
                      state: { eventId: event.id },
                    })
                  }
                  className="w-full py-3 rounded-xl font-medium text-sm flex items-center justify-center gap-2 mb-3 transition-all active:scale-95"
                  style={{
                    backgroundColor: "#212121",
                    border: "1px dashed color-mix(in srgb, var(--accent-primary) 25%, transparent)",
                    color: "var(--accent-primary)",
                  }}
                >
                  <Plus className="w-4 h-4" /> Ajouter une transaction
                </button>
              )}
              {eventTxs.length === 0 ? (
                <div
                  className="text-center py-10 rounded-xl"
                  style={{ backgroundColor: "#212121" }}
                >
                  <p className="text-text-tertiary text-sm">
                    Aucune transaction liée
                  </p>
                  <p className="text-text-tertiary text-xs mt-1">
                    Les dépenses seront enregistrées ici
                  </p>
                </div>
              ) : (
                eventTxs
                  .sort(
                    (a: any, b: any) =>
                      new Date(b.date || b.created_at).getTime() -
                      new Date(a.date || a.created_at).getTime(),
                  )
                  .map((tx: any) => (
                    <div
                      key={tx.id}
                      className="rounded-xl p-3 flex items-center gap-3"
                      style={{ backgroundColor: "#212121" }}
                    >
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{
                          backgroundColor:
                            tx.type === "INCOME" ? "#1DB95420" : "#E5133220",
                        }}
                      >
                        {tx.type === "INCOME" ? (
                          <ArrowUp
                            className="w-4 h-4"
                            style={{ color: "#1DB954" }}
                          />
                        ) : (
                          <ArrowDown
                            className="w-4 h-4"
                            style={{ color: "#E51332" }}
                          />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-text-primary text-sm font-medium truncate">
                          {tx.description}
                        </p>
                        <p className="text-text-tertiary text-xs">
                          {formatDate(tx.date || tx.created_at)}
                        </p>
                      </div>
                      <span
                        className="text-sm font-bold"
                        style={{
                          color: tx.type === "INCOME" ? "#1DB954" : "#E51332",
                        }}
                      >
                        {tx.type === "INCOME" ? "+" : "-"}
                        {formatCurrencyCompact(tx.amount)} F
                      </span>
                    </div>
                  ))
              )}
            </div>
          )}

          {/* Delete button */}
          {security.hasRole(
            user.role as any,
            "event",
            "delete",
          ) && (
            <button
              onClick={() => setShowDelete(true)}
              className="w-full py-3 rounded-full font-medium text-sm flex items-center justify-center gap-2 mt-5 mb-4"
              style={{ backgroundColor: "#212121", color: "#E51332" }}
              aria-label="Supprimer l'événement"
            >
              <Trash2 className="w-4 h-4" /> Supprimer l'événement
            </button>
          )}

          {security.hasPermission(
            user.role as any,
            "event:update",
          ) && (
            <button
              onClick={() => navigate(`/event/${event.id}/edit`)}
              className="w-full py-3 rounded-full font-medium text-sm flex items-center justify-center gap-2 mb-4"
              style={{ backgroundColor: "#212121", color: "var(--accent-primary)" }}
              aria-label="Modifier l'événement"
            >
              <Edit3 className="w-4 h-4" /> Modifier l'événement
            </button>
          )}
        </div>

        <BottomNav />

        {/* Add Expense Modal */}
        {showAddExpense && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
            <div
              className="absolute inset-0 bg-black/70"
              onClick={() => setShowAddExpense(false)}
            />
            <div
              className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl"
              style={{ backgroundColor: "#181818" }}
            >
              <div className="p-5">
                <h3 className="text-text-primary font-bold text-lg mb-4">
                  Dépenser depuis le budget
                </h3>

                {expenseError && (
                  <div
                    className="mb-4 p-3 rounded-xl text-sm"
                    style={{ backgroundColor: "#E5133220", color: "#E51332" }}
                  >
                    {expenseError}
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <label className="text-text-tertiary text-xs mb-1.5 block">
                      Poste budgétaire
                    </label>
                    <select
                      value={selectedBudgetItemId || ""}
                      onChange={(e) => setSelectedBudgetItemId(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl text-text-primary text-sm"
                      style={{
                        backgroundColor: "#212121",
                        border: "1px solid #282828",
                      }}
                    >
                      <option value="">Sélectionner un poste...</option>
                      {budgetItems.map((item: any) => (
                        <option key={item.id} value={item.id}>
                          {item.label} — Reste:{" "}
                          {formatCurrencyCompact(
                            item.allocated - (item.spent || 0),
                          )}{" "}
                          F
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-text-tertiary text-xs mb-1.5 block">
                      Montant (FCFA)
                    </label>
                    <input
                      type="number"
                      value={expenseAmount}
                      onChange={(e) => setExpenseAmount(e.target.value)}
                      placeholder="0"
                      className="w-full px-4 py-3 rounded-xl text-text-primary text-sm"
                      style={{
                        backgroundColor: "#212121",
                        border: "1px solid #282828",
                      }}
                    />
                    {selectedBudgetItemId &&
                      (() => {
                        const item = budgetItems.find(
                          (i: any) => i.id === selectedBudgetItemId,
                        );
                        if (!item) return null;
                        const remaining = item.allocated - (item.spent || 0);
                        const entered = parseFloat(expenseAmount) || 0;
                        const overBudget = entered > remaining / 100;
                        return (
                          <p
                            className={`text-xs mt-1 ${overBudget ? "text-[#E51332]" : "text-text-tertiary"}`}
                          >
                            Reste disponible: {formatCurrencyCompact(remaining)}{" "}
                            F{overBudget && " ⚠️ Montant insuffisant"}
                          </p>
                        );
                      })()}
                  </div>

                  <div>
                    <label className="text-text-tertiary text-xs mb-1.5 block">
                      Description
                    </label>
                    <input
                      type="text"
                      value={expenseDescription}
                      onChange={(e) => setExpenseDescription(e.target.value)}
                      placeholder="Ex: Achat de chaises"
                      className="w-full px-4 py-3 rounded-xl text-text-primary text-sm"
                      style={{
                        backgroundColor: "#212121",
                        border: "1px solid #282828",
                      }}
                    />
                  </div>
                </div>

                <div className="flex gap-3 mt-5">
                  <button
                    onClick={() => setShowAddExpense(false)}
                    className="flex-1 py-3 rounded-full font-medium text-sm"
                    style={{ backgroundColor: "#212121", color: "#B3B3B3" }}
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleAddExpense}
                    className="flex-1 py-3 rounded-full font-semibold text-white transition-all active:scale-95"
                    style={{ backgroundColor: "var(--accent-primary)" }}
                  >
                    Enregistrer
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation */}
        {showDelete && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center px-5"
            onClick={() => setShowDelete(false)}
          >
            <div className="absolute inset-0 bg-black/70" />
            <div
              className="relative w-full max-w-sm rounded-2xl p-5 text-center"
              style={{ backgroundColor: "#181818" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ backgroundColor: "#E5133220" }}
              >
                <Trash2 className="w-6 h-6 text-[#E51332]" />
              </div>
              <h3 className="text-text-primary font-bold text-lg mb-2">
                Supprimer cet événement ?
              </h3>
              <p className="text-text-tertiary text-sm mb-1">
                Cette action est irréversible.
              </p>
              {eventTxs.length > 0 && (
                <p className="text-text-tertiary text-xs mb-4">
                  {eventTxs.length} transaction{eventTxs.length > 1 ? "s" : ""}{" "}
                  liée{eventTxs.length > 1 ? "es" : ""} seront également
                  supprimées.
                </p>
              )}
              <button
                onClick={handleDelete}
                className="w-full py-3.5 rounded-full font-semibold text-white mb-3"
                style={{ backgroundColor: "#E51332" }}
              >
                Supprimer
              </button>
              <button
                onClick={() => setShowDelete(false)}
                className="w-full py-3 rounded-full font-medium text-sm text-text-tertiary"
                style={{ backgroundColor: "#212121" }}
              >
                Annuler
              </button>
            </div>
          </div>
        )}
      </IonContent>
    </IonPage>
  );
}
