import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  useAuditEntries,
  useTransactions,
  useGroups,
  useMembers,
  useEvents,
} from "@/lib/dataLayer";
import {
  ArrowLeft,
  Clock,
  CheckCircle,
  XCircle,
  Trash2,
  Edit2,
  FileText,
  Users,
  Shield,
  ChevronRight,
} from "lucide-react";
import BottomNav from "@/components/BottomNav";
import TopHeader from "@/components/TopHeader";
import { formatDateTime, formatDate } from "@/lib/utils";
import {
  IonPage,
  IonHeader,
  IonContent,
  IonTitle,
  IonToolbar,
} from "@ionic/react";

const ACTION_META: Record<
  string,
  { icon: typeof Clock; color: string; label: string }
> = {
  CREATE: { icon: CheckCircle, color: "#1DB954", label: "Créé" },
  UPDATE: { icon: Edit2, color: "#3B82F6", label: "Modifié" },
  DELETE: { icon: Trash2, color: "#E51332", label: "Supprimé" },
  APPROVE: { icon: CheckCircle, color: "#1DB954", label: "Approuvé" },
  REJECT: { icon: XCircle, color: "#E51332", label: "Rejeté" },
  ARCHIVE: { icon: FileText, color: "#B3B3B3", label: "Archivé" },
  RESTORE: { icon: CheckCircle, color: "#1DB954", label: "Rétabli" },
  REVISE: { icon: Edit2, color: "#FFB800", label: "Révisé" },
  CANCEL: { icon: XCircle, color: "#E51332", label: "Annulé" },
};

const ENTITY_LABELS: Record<string, string> = {
  Transaction: "Transaction",
  Event: "Événement",
  Group: "Groupe",
  Member: "Membre",
  FormDefinition: "Formulaire",
  FormSubmission: "Formulaire",
  CustomFieldDefinition: "Champ personnalisé",
  EventBudget: "Budget",
  BudgetLine: "Poste budgétaire",
  GroupMembership: "Adhésion",
  Versement: "Versement",
  Account: "Compte",
};

const FILTERS = [
  "Tout",
  "Transaction",
  "Groupe",
  "Membre",
  "Événement",
  "Budget",
  "Formulaire",
];

export default function TracePage() {
  const navigate = useNavigate();
  // PowerSync with fallback
  const { data: auditEntries } = useAuditEntries();
  const { data: transactions } = useTransactions();
  const { data: groups } = useGroups();
  const { data: members } = useMembers();
  const { data: events } = useEvents();

  const [filter, setFilter] = useState("Tout");
  const [search, setSearch] = useState("");

  const entityMap: Record<string, { label: string; type: string }> = {
    Transaction: { label: "Transaction", type: "Transaction" },
    Event: { label: "Événement", type: "Événement" },
    Group: { label: "Groupe", type: "Groupe" },
    Member: { label: "Membre", type: "Membre" },
    FormDefinition: { label: "Formulaire", type: "Formulaire" },
    FormSubmission: { label: "Formulaire", type: "Formulaire" },
    CustomFieldDefinition: { label: "Champ", type: "Formulaire" },
    EventBudget: { label: "Budget", type: "Budget" },
    BudgetLine: { label: "Poste budgétaire", type: "Budget" },
    GroupMembership: { label: "Adhésion", type: "Groupe" },
    Versement: { label: "Versement", type: "Transaction" },
    Account: { label: "Compte", type: "Groupe" },
  };

  const getEntityLabel = (entry: any) => {
    const entityType = entry.entity_type || entry.entityType;
    return ENTITY_LABELS[entityType] || entityType || "Entité";
  };

  const filteredEntries = auditEntries.filter((entry: any) => {
    const entityType = entry.entity_type || entry.entityType;
    if (filter !== "Tout" && !entityType?.includes(filter)) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        (entry.comment || "").toLowerCase().includes(q) ||
        (entityType || "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Trace</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="bg-canvas">
        <div className="min-h-screen bg-canvas">
          <TopHeader title="Trace d'activité" />
          <div className="max-w-lg mx-auto px-5 pb-32 pt-16">
            {/* Search */}
            <div className="relative mb-4">
              <input
                type="text"
                placeholder="Rechercher..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full px-4 py-3 rounded-xl text-sm "
                style={{
                  backgroundColor: "#212121",
                  color: "#fff",
                  border: "1px solid #282828",
                }}
              />
            </div>

            {/* Filter chips */}
            <div className="flex flex-wrap gap-2 mb-5">
              {FILTERS.map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
                  style={{
                    backgroundColor: filter === f ? "var(--accent-primary)" : "#212121",
                    color: filter === f ? "#fff" : "#B3B3B3",
                  }}
                >
                  {f}
                </button>
              ))}
            </div>

            {/* Entries */}
            <div className="space-y-2 mb-6">
              {filteredEntries.length === 0 ? (
                <div
                  className="text-center py-10 rounded-xl"
                  style={{ backgroundColor: "#1e1e1e" }}
                >
                  <p className="text-text-tertiary text-sm">
                    Aucune entrée trouvée
                  </p>
                </div>
              ) : (
                filteredEntries.map((entry: any) => {
                  const meta = ACTION_META[entry.action] || ACTION_META.UPDATE;
                  const EntityLabel = meta.icon;
                  return (
                    <div
                      key={entry.id}
                      className="rounded-xl p-4 flex items-center gap-3"
                      style={{
                        backgroundColor: "#212121",
                        border: "1px solid #282828",
                      }}
                    >
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: meta.color + "20" }}
                      >
                        <EntityLabel
                          className="w-5 h-5"
                          style={{ color: meta.color }}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-text-primary text-sm font-medium">
                          {meta.label} {getEntityLabel(entry)}
                        </p>
                        <p className="text-text-tertiary text-xs mt-0.5">
                          {formatDateTime(entry.created_at)}
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-text-tertiary" />
                    </div>
                  );
                })
              )}
            </div>
          </div>
          <BottomNav />
        </div>
      </IonContent>
    </IonPage>
  );
}
