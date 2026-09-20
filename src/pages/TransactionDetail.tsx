import { useState, useEffect, useRef } from "react";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { useNavigate, useParams } from "react-router-dom";
import { useCurrentUser } from "@/lib/dataLayer";
import {
  useTransactions,
  useCategories,
  useOrgUnits,
  useEvents,
  updateTransactionPS,
  deleteTransactionPS,
  approveTransactionPS,
  reverseTransactionPS,
  useDocuments,
} from "@/lib/dataLayer";
import { getDocumentUrl } from "@/lib/storageService";
import {
  formatCurrencyCompact,
  formatDate,
  getStatusLabel,
  getStatusColor,
} from "@/lib/utils";
import {
  ArrowLeft,
  Check,
  X,
  Edit2,
  Trash2,
  AlertCircle,
  RotateCcw,
  Download,
} from "lucide-react";
import BottomNav from "@/components/BottomNav";
import TopHeader from "@/components/TopHeader";
import { security } from "@/capabilities/security";
import {
  IonPage,
  IonHeader,
  IonContent,
  IonTitle,
  IonToolbar,
  IonButtons,
  IonBackButton,
} from "@ionic/react";

export default function TransactionDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = useCurrentUser();

  // PowerSync with fallback
  const { data: psTransactions } = useTransactions();
  const { data: psEvents } = useEvents();
  const { data: psOrgUnits } = useOrgUnits();
  const { data: psCategories } = useCategories();

  const transactions = psTransactions ?? [];
  const events = psEvents ?? [];
  const orgUnits = psOrgUnits ?? [];
  const categories = psCategories ?? [];

  const [showActions, setShowActions] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectComment, setRejectComment] = useState("");
  const [showReverseModal, setShowReverseModal] = useState(false);
  const [reverseReason, setReverseReason] = useState("");

  const rejectModalRef = useRef<HTMLDivElement>(null);
  const reverseModalRef = useRef<HTMLDivElement>(null);
  useFocusTrap(rejectModalRef, showRejectModal);
  useFocusTrap(reverseModalRef, showReverseModal);

  // Preuves de dépense (photos dans le bucket `expense_proofs`).
  const { data: docData } = useDocuments();
  const proofs = (docData ?? []).filter(
    (d) => d.entity_id === id && d.entity_type === "EXPENSE_PROOF",
  );
  const [proofUrls, setProofUrls] = useState<Record<string, string>>({});
  useEffect(() => {
    proofs.forEach(async (d) => {
      try {
        const u = await getDocumentUrl("expense_proofs", d.file_path);
        setProofUrls((p) => ({ ...p, [d.id]: u }));
      } catch {
        /* hors ligne — l'aperçu reste indisponible, le bouton Télécharger aussi */
      }
    });
  }, [proofs.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const tx = transactions.find((t: any) => t.id === id);
  if (!tx) {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonButtons slot="start">
              <IonBackButton defaultHref="/" />
            </IonButtons>
            <IonTitle>Transaction</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent fullscreen className="bg-canvas">
          <div className="min-h-screen bg-canvas flex items-center justify-center">
            <p className="text-text-tertiary">Transaction introuvable</p>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  const isIncome = tx.type === "INCOME";
  const category =
    (tx as any).category ||
    categories.find(
      (c: any) => c.id === (tx as any).category_id || c.id === (tx as any).categoryId,
    );
  const orgUnit =
    (tx as any).orgUnit ||
    orgUnits.find((o: any) => o.id === (tx as any).org_unit_id || o.id === (tx as any).orgUnitId);
  const event =
    (tx as any).event ||
    events.find((e: any) => e.id === (tx as any).event_id || e.id === (tx as any).eventId);

  const handleApprove = async () => {
    if (!security.hasPermission(user.role as any, "transaction:approve")) {
      return;
    }
    await approveTransactionPS(tx.id, user?.id || "");
    navigate(-1);
  };

  const handleRejectConfirm = async () => {
    if (!security.hasPermission(user?.role as any, "transaction:approve")) {
      return;
    }
    if (!rejectComment.trim()) return;
    await updateTransactionPS(tx.id, { status: "REJECTED", comment: rejectComment.trim() });
    setShowRejectModal(false);
    setRejectComment("");
    navigate(-1);
  };

  const handleDelete = async () => {
    if (!security.hasPermission(user.role as any, "transaction:delete")) {
      return;
    }
    await deleteTransactionPS(tx.id);
    navigate(-1);
  };

  const handleReverse = async () => {
    if (!reverseReason.trim()) return;
    if (!security.hasPermission(user.role as any, "transaction:approve")) {
      return;
    }
    await reverseTransactionPS(tx.id, user?.id || "", reverseReason.trim());
    setShowReverseModal(false);
    setReverseReason("");
    navigate(-1);
  };

  // Find reversal transaction if exists
  const reversal = (tx as any).reversalOfId
    ? transactions.find(
        (t: any) => t.reversal_of_id === tx.id || t.reversalOfId === tx.id,
      )
    : null;

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/" />
          </IonButtons>
          <IonTitle>Transaction</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen className="bg-canvas">
        <div className="min-h-screen bg-canvas">
          <TopHeader title="Transaction" />
          <div className="max-w-lg mx-auto px-5 pb-32 pt-16">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-text-secondary text-sm mb-6"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Retour</span>
            </button>

            {/* Amount */}
            <div className="text-center mb-8">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{
                  backgroundColor: isIncome ? "#1DB95420" : "#E5133220",
                }}
              >
                {isIncome ? (
                  <Check className="w-8 h-8" style={{ color: "#1DB954" }} />
                ) : (
                  <X className="w-8 h-8" style={{ color: "#E51332" }} />
                )}
              </div>
              <p
                className={`text-4xl font-black tabular-nums ${isIncome ? "text-income" : "text-expense"}`}
              >
                {isIncome ? "+" : "-"}
                {formatCurrencyCompact(tx.amount)} F
              </p>
              <p className="text-text-tertiary text-sm mt-2">
                {formatDate(tx.date)}
              </p>
            </div>

            {/* Description */}
            <div
              className="rounded-xl p-4 mb-4"
              style={{ backgroundColor: "var(--surface)" }}
            >
              <p className="text-text-primary font-medium text-base">
                {tx.description}
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                {category && (
                  <span
                    className="text-xs px-2.5 py-1 rounded-full"
                    style={{ backgroundColor: "color-mix(in srgb, var(--accent-primary) 12%, transparent)", color: "var(--accent-primary)" }}
                  >
                    {category.label_fr || category.label}
                  </span>
                )}
                {orgUnit && (
                  <span
                    className="text-xs px-2.5 py-1 rounded-full"
                    style={{ backgroundColor: "#3B82F620", color: "#3B82F6" }}
                  >
                    {orgUnit.name}
                  </span>
                )}
                {event && (
                  <span
                    className="text-xs px-2.5 py-1 rounded-full"
                    style={{ backgroundColor: "#8B5CF620", color: "#8B5CF6" }}
                  >
                    {event.name}
                  </span>
                )}
                <span
                  className="text-xs px-2.5 py-1 rounded-full"
                  style={{
                    backgroundColor: getStatusColor(tx.status as any) + "20",
                    color: getStatusColor(tx.status as any),
                  }}
                >
                  {getStatusLabel(tx.status as any)}
                </span>
              </div>
            </div>

            {/* Details */}
            <div
              className="rounded-xl p-4 mb-6"
              style={{ backgroundColor: "var(--surface)" }}
            >
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-text-tertiary text-sm">Type</span>
                  <span className="text-text-primary text-sm font-medium">
                    {tx.type === "INCOME" ? "Entrée" : "Sortie"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-tertiary text-sm">Caisse</span>
                  <span className="text-text-primary text-sm font-medium">
                    {(tx as any).source_caisse_id || (tx as any).sourceCaisseId || "Principale"}
                  </span>
                </div>
                {tx.comment && (
                  <div className="flex justify-between">
                    <span className="text-text-tertiary text-sm">
                      Commentaire
                    </span>
                    <span className="text-text-primary text-sm font-medium text-right max-w-[60%]">
                      {tx.comment}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-text-tertiary text-sm">Créé le</span>
                  <span className="text-text-primary text-sm font-medium">
                    {formatDate((tx as any).created_at || (tx as any).createdAt)}
                  </span>
                </div>
                {(tx as any).approved_at && (
                  <div className="flex justify-between">
                    <span className="text-text-tertiary text-sm">
                      Approuvé le
                    </span>
                    <span className="text-text-primary text-sm font-medium">
                      {formatDate((tx as any).approved_at)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-2 mb-6">
              {tx.status === "PENDING" && (
                <>
                  {security.hasRole(user.role as any, "transaction", "approve") && (
                    <button
                      onClick={handleApprove}
                      className="w-full py-4 rounded-full font-semibold text-white text-sm transition-all active:scale-95"
                      style={{ backgroundColor: "#1DB954" }}
                    >
                      Approuver
                    </button>
                  )}
                  {security.hasRole(user.role as any, "transaction", "reject") && (
                    <button
                      onClick={() => setShowRejectModal(true)}
                      className="w-full py-4 rounded-full font-semibold text-sm transition-all active:scale-95"
                      style={{
                        backgroundColor: "var(--surface)",
                        color: "#E51332",
                        border: "1px solid #E5133230",
                      }}
                    >
                      Rejeter
                    </button>
                  )}
                </>
              )}
              {tx.status === "APPROVED" && (
                <button
                  onClick={() => setShowReverseModal(true)}
                  className="w-full py-4 rounded-full font-semibold text-sm transition-all active:scale-95"
                  style={{
                    backgroundColor: "var(--surface)",
                    color: "#FFB800",
                    border: "1px solid #FFB80030",
                  }}
                >
                  Contre-transagir
                </button>
              )}
              {(tx.status === "DRAFT" || tx.status === "PENDING") && (
                <button
                  onClick={() => navigate(`/transaction/${id}/edit`)}
                  className="w-full py-4 rounded-full font-semibold text-sm transition-all active:scale-95"
                  style={{
                    backgroundColor: "var(--surface)",
                    color: "#3B82F6",
                    border: "1px solid #3B82F630",
                  }}
                >
                  Modifier
                </button>
              )}
              {(tx.status === "DRAFT" || tx.status === "PENDING") &&
                security.hasRole(user.role as any, "transaction", "delete") && (
                  <button
                    onClick={handleDelete}
                    className="w-full py-4 rounded-full font-semibold text-sm transition-all active:scale-95"
                    style={{
                      backgroundColor: "var(--surface)",
                      color: "#E51332",
                      border: "1px solid #E5133230",
                    }}
                  >
                    Supprimer
                  </button>
                )}
            </div>

            {/* Reversal */}
            {reversal && (
              <div
                className="rounded-xl p-4 mb-6"
                style={{
                  backgroundColor: "var(--surface)",
                  border: "1px solid #FFB80030",
                }}
              >
                <p className="text-text-tertiary text-xs mb-2">
                  Contre-transaction
                </p>
                <p className="text-text-primary text-sm font-medium">
                  {reversal.description}
                </p>
                <p className="text-text-tertiary text-xs mt-1">
                  {formatDate(reversal.date)}
                </p>
              </div>
            )}

            {/* Preuve de la dépense */}
            {(tx as any).type === "EXPENSE" && (
              <div
                className="rounded-xl p-4 mb-6"
                style={{
                  backgroundColor: "var(--surface)",
                  border: "1px solid var(--border)",
                }}
              >
                <p className="text-text-tertiary text-xs mb-2 font-medium">
                  Preuve de la dépense
                </p>
                {proofs.length === 0 ? (
                  <p className="text-text-tertiary text-xs">
                    Aucune preuve fournie
                  </p>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {proofs.map((d) =>
                      proofUrls[d.id] ? (
                        <a
                          key={d.id}
                          href={proofUrls[d.id]}
                          target="_blank"
                          rel="noreferrer"
                          className="relative rounded-lg overflow-hidden block"
                          style={{
                            height: "7rem",
                            border: "1px solid var(--border)",
                          }}
                          aria-label={`Voir la preuve : ${d.title}`}
                        >
                          <img
                            src={proofUrls[d.id]}
                            alt={d.title}
                            className="w-full h-full object-cover"
                          />
                        </a>
                      ) : (
                        <div
                          key={d.id}
                          className="rounded-lg overflow-hidden flex items-center justify-center"
                          style={{
                            height: "7rem",
                            border: "1px solid var(--border)",
                            backgroundColor: "var(--surface)",
                          }}
                          aria-label={`Preuve indisponible hors ligne : ${d.title}`}
                        >
                          <Download className="w-5 h-5 text-text-tertiary" />
                        </div>
                      ),
                    )}
                  </div>
                )}
                {proofs.length > 0 && (
                  <div className="flex gap-2 mt-3">
                    {proofs.map((d) => (
                      <button
                        key={d.id}
                        onClick={async () => {
                          try {
                            const u =
                              proofUrls[d.id] ||
                              (await getDocumentUrl("expense_proofs", d.file_path));
                            window.open(u, "_blank");
                          } catch {
                            /* hors ligne */
                          }
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs"
                        style={{
                          backgroundColor: "var(--surface-hover)",
                          color: "var(--text-primary)",
                        }}
                      >
                        <Download className="w-3.5 h-3.5" />
                        Télécharger
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Reject Modal */}
            {showRejectModal && (
              <div
                ref={rejectModalRef}
                role="dialog"
                aria-modal="true"
                className="fixed inset-0 z-50 flex items-center justify-center p-4 outline-none"
                style={{ backgroundColor: "rgba(0,0,0,0.8)" }}
              >
                <div
                  className="w-full max-w-sm rounded-2xl p-5"
                  style={{ backgroundColor: "var(--surface)" }}
                >
                  <h3 className="text-text-primary font-semibold text-lg mb-4">
                    Rejeter la transaction
                  </h3>
                  <textarea
                    value={rejectComment}
                    onChange={(e) => setRejectComment(e.target.value)}
                    placeholder="Raison du rejet (optionnel)"
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl text-sm  mb-4 resize-none"
                    style={{
                      backgroundColor: "var(--surface-hover)",
                      color: "var(--text-primary)",
                      border: "1px solid #383838",
                    }}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleRejectConfirm}
                      className="flex-1 py-3 rounded-full font-semibold text-white text-sm"
                      style={{ backgroundColor: "#E51332" }}
                    >
                      Rejeter
                    </button>
                    <button
                      onClick={() => setShowRejectModal(false)}
                      className="px-4 py-3 rounded-full font-medium text-sm"
                      style={{ backgroundColor: "var(--surface-hover)" }}
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Reverse Modal */}
            {showReverseModal && (
              <div
                ref={reverseModalRef}
                role="dialog"
                aria-modal="true"
                className="fixed inset-0 z-50 flex items-center justify-center p-4 outline-none"
                style={{ backgroundColor: "rgba(0,0,0,0.8)" }}
              >
                <div
                  className="w-full max-w-sm rounded-2xl p-5"
                  style={{ backgroundColor: "var(--surface)" }}
                >
                  <h3 className="text-text-primary font-semibold text-lg mb-4">
                    Contre-transagir
                  </h3>
                  <p className="text-text-tertiary text-sm mb-4">
                    Raison de la contre-transaction
                  </p>
                  <textarea
                    value={reverseReason}
                    onChange={(e) => setReverseReason(e.target.value)}
                    placeholder="Ex: Erreur de montant"
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl text-sm  mb-4 resize-none"
                    style={{
                      backgroundColor: "var(--surface-hover)",
                      color: "var(--text-primary)",
                      border: "1px solid #383838",
                    }}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleReverse}
                      className="flex-1 py-3 rounded-full font-semibold text-white text-sm"
                      style={{ backgroundColor: "#FFB800" }}
                    >
                      Confirmer
                    </button>
                    <button
                      onClick={() => setShowReverseModal(false)}
                      className="px-4 py-3 rounded-full font-medium text-sm"
                      style={{ backgroundColor: "var(--surface-hover)" }}
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
          <BottomNav />
        </div>
      </IonContent>
    </IonPage>
  );
}
