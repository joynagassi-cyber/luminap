/**
 * TransactionDetail v2 — Détail de transaction, redesign premium.
 *
 * Design : fond sombre, montant en très grand avec couleur selon le type,
 * badges de catégorie/événement, détails dans une carte, actions d'approbation
 * et rejet, modales intégrées.
 * Tous les tokens CSS `var(--*)`, zéro couleur en dur.
 *
 * Logique métier inchangée : approbation, rejet, suppression, contre-transaction,
 * maker-checker, justificatifs, verrou de période.
 */

import { useState, useRef } from "react";
import { ListSkeleton } from "@/components/Skeleton";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { useNavigate, useParams } from "react-router-dom";
import { useCurrentUser, isPowerSyncReadyNow } from "@/lib/dataLayer";
import {
  useTransactions,
  useCategories,
  useOrgUnits,
  useEvents,
  updateTransactionPS,
  deleteTransactionPS,
  approveTransactionPS,
  reverseTransactionPS,
} from "@/lib/dataLayer";
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
} from "lucide-react";
import BottomNav from "@/components/BottomNav";
import TopHeader from "@/components/TopHeader";
import JustificatifsSection from "@/components/JustificatifsSection";
import { purgeReceiptsForTransaction } from "@/lib/receipts";
import { useCanAccessMulti } from "@/hooks/useCanAccessMulti";
import { useSubmitGuard } from "@/hooks/useSubmitGuard";
import { useMakerChecker } from "@/hooks/useMakerChecker";
import { canApprove as canApproveRule } from "@/lib/makerChecker";
import { toast } from "@/components/ui/use-toast";
import { notification } from "@/capabilities/notification";
import { showError } from "@/utils/toast";
import { captureClientError } from "@/lib/clientErrors";
import { isPeriodLockedError, periodLockMessage } from "@/lib/periodLock";
import {
  IonPage,
  IonContent,
} from "@ionic/react";
import {
  Section,
  InfoCard,
  ListItem,
  ActionCard,
} from "@/design/components/PageShell";

export default function TransactionDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = useCurrentUser();

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

  const canApproveMulti = useCanAccessMulti(user?.id, user?.org?.id, "transaction", "approve", undefined, user?.role as any);
  const canRejectMulti = useCanAccessMulti(user?.id, user?.org?.id, "transaction", "reject", undefined, user?.role as any);
  const canDeleteMulti = useCanAccessMulti(user?.id, user?.org?.id, "transaction", "delete", undefined, user?.role as any);
  const canReverseMulti = useCanAccessMulti(user?.id, user?.org?.id, "transaction", "reverse", undefined, user?.role as any);

  const rejectModalRef = useRef<HTMLDivElement>(null);
  const reverseModalRef = useRef<HTMLDivElement>(null);
  useFocusTrap(rejectModalRef, showRejectModal);
  useFocusTrap(reverseModalRef, showReverseModal);

  const guard = useSubmitGuard();

  const runWrite = (fn: () => Promise<void>) =>
    guard.run(async () => {
      try {
        await fn();
      } catch (e) {
        if (isPeriodLockedError(e)) {
          showError(periodLockMessage(e, "Période comptable clôturée."));
          return;
        }
        captureClientError(e, { route: "/transaction/:id" });
        showError("Action impossible pour le moment. Réessayez.");
      }
    });

  const makerChecker = useMakerChecker();

  const tx = transactions.find((t: any) => t.id === id);

  if (!tx && !isPowerSyncReadyNow()) {
    return (
      <IonPage>
        <IonContent fullscreen className="bg-canvas">
          <div className="min-h-dvh flex flex-col items-center justify-center py-12 px-6">
            <div className="w-12 h-12 rounded-full border-4 border-border border-t-accent-primary animate-spin" />
            <p className="mt-4 text-text-tertiary text-sm">Chargement…</p>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  if (!tx) {
    return (
      <IonPage>
        <IonContent fullscreen className="bg-canvas">
          <div className="min-h-dvh flex flex-col items-center justify-center py-12 px-6 text-center">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 mx-auto" style={{ backgroundColor: "var(--surface)" }}>
              <X className="w-8 h-8 text-text-tertiary" />
            </div>
            <h2 className="text-text-primary font-bold text-xl mb-2">Transaction introuvable</h2>
            <p className="text-text-tertiary text-sm mb-6">
              Cette transaction n'existe plus ou a été supprimée.
            </p>
            <button
              type="button"
              onClick={() => navigate("/")}
              className="w-full sm:w-auto py-3.5 px-6 rounded-xl font-medium text-sm transition-all"
              style={{
                background: "linear-gradient(135deg, var(--accent-primary), var(--accent-dark))",
                color: "var(--on-accent)",
              }}
            >
              Retour à l'accueil
            </button>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  const isIncome = tx.type === "INCOME";

  const approveDecision = canApproveRule({
    transaction: { createdById: (tx as any).createdById ?? (tx as any).created_by_id },
    actorId: user?.id ?? "",
    actorPermissions: canApproveMulti.allowed ? ["transaction:approve"] : [],
    enabled: makerChecker.enabled,
  });
  const selfApprovalBlocked = approveDecision.reason === "self-approval";
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

  const handleApprove = () => {
    if (!canApproveMulti.allowed) return;
    if (selfApprovalBlocked) {
      toast({
        title: "Approbation impossible",
        description: "L'auteur ne peut pas approuver sa propre dépense.",
        variant: "destructive",
      });
      return;
    }
    return runWrite(async () => {
      await approveTransactionPS(tx.id, user?.id || "");
      await notification.sendNotification({
        title: "Transaction approuvée",
        message: `${tx.description || tx.id} a été approuvée.`,
        targetRole: "TREASURIER",
        extraData: { source: "transaction-detail", txId: tx.id },
      });
      navigate(-1);
    });
  };

  const handleRejectConfirm = () => {
    if (!canRejectMulti.allowed) return;
    if (!rejectComment.trim()) return;
    return runWrite(async () => {
      await updateTransactionPS(tx.id, { status: "REJECTED", comment: rejectComment.trim() });
      await notification.sendNotification({
        title: "Transaction rejetée",
        message: `${tx.description || tx.id} a été rejetée : ${rejectComment.trim()}`,
        targetRole: "TREASURIER",
        extraData: { source: "transaction-detail", txId: tx.id, reason: rejectComment.trim() },
      });
      setShowRejectModal(false);
      setRejectComment("");
      navigate(-1);
    });
  };

  const handleDelete = () => {
    if (!canDeleteMulti.allowed) return;
    return runWrite(async () => {
      await purgeReceiptsForTransaction(tx.id);
      await deleteTransactionPS(tx.id);
      await notification.sendNotification({
        title: "Transaction supprimée",
        message: `${tx.description || tx.id} a été supprimée.`,
        targetRole: "TREASURIER",
        extraData: { source: "transaction-detail", txId: tx.id },
      });
      navigate(-1);
    });
  };

  const handleReverse = () => {
    if (!reverseReason.trim()) return;
    if (!canReverseMulti.allowed) return;
    return runWrite(async () => {
      await reverseTransactionPS(tx.id, user?.id || "", reverseReason.trim());
      await notification.sendNotification({
        title: "Transaction inversée",
        message: `${tx.description || tx.id} a été inversée : ${reverseReason.trim()}`,
        targetRole: "TREASURIER",
        extraData: { source: "transaction-detail", txId: tx.id, reversalReason: reverseReason.trim() },
      });
      setShowReverseModal(false);
      setReverseReason("");
      navigate(-1);
    });
  };

  const reversal = (tx as any).reversalOfId
    ? transactions.find(
        (t: any) => t.reversal_of_id === tx.id || t.reversalOfId === tx.id,
      )
    : null;

  return (
    <IonPage>
      <IonContent fullscreen className="bg-canvas">
        <div className="min-h-dvh flex flex-col">
          <TopHeader
            title="Transaction"
            subtitle={tx.description || "Détails de la transaction"}
            onBack={() => navigate(-1)}
          />
          <div className="flex-1 px-6 pt-2 pb-safe-calc">
            <div className="max-w-lg mx-auto">
              {/* Montant en héros */}
              <div className="text-center mb-8">
                <div
                  className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4"
                  style={{
                    backgroundColor: isIncome ? "color-mix(in srgb, var(--in) 15%, transparent)" : "color-mix(in srgb, var(--out) 15%, transparent)",
                  }}
                >
                  {isIncome ? (
                    <Check className="w-9 h-9" style={{ color: "var(--in)" }} />
                  ) : (
                    <X className="w-9 h-9" style={{ color: "var(--out)" }} />
                  )}
                </div>
                <p
                  className={`text-3xl font-black tabular-nums leading-none ${isIncome ? "text-income" : "text-expense"}`}
                >
                  {isIncome ? "+" : "−"}
                  {formatCurrencyCompact(tx.amount)} F
                </p>
                <p className="text-text-tertiary text-sm mt-2">
                  {formatDate(tx.date)}
                </p>
              </div>

              {/* Description + badges */}
              <InfoCard className="mb-6">
                <p className="text-text-primary font-medium text-base mb-3">
                  {tx.description}
                </p>
                <div className="flex flex-wrap gap-2">
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
                      style={{ backgroundColor: "color-mix(in srgb, var(--data-planified) 12%, transparent)", color: "var(--data-planified)" }}
                    >
                      {orgUnit.name}
                    </span>
                  )}
                  {event && (
                    <span
                      className="text-xs px-2.5 py-1 rounded-full"
                      style={{ backgroundColor: "color-mix(in srgb, var(--data-advance) 12%, transparent)", color: "var(--data-advance)" }}
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
              </InfoCard>

              {/* Détails */}
              <Section title="Détails">
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
                      <span className="text-text-tertiary text-sm">Commentaire</span>
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
                      <span className="text-text-tertiary text-sm">Approuvé le</span>
                      <span className="text-text-primary text-sm font-medium">
                        {formatDate((tx as any).approved_at)}
                      </span>
                    </div>
                  )}
                </div>
              </Section>

              {/* Actions */}
              <div className="space-y-2 mb-6">
                {tx.status === "PENDING" && (
                  <>
                    {canApproveMulti.allowed && (
                      <>
                        <button
                          onClick={handleApprove}
                          disabled={guard.submitting || selfApprovalBlocked}
                          data-testid="approve-button"
                          className="w-full py-4 rounded-full font-semibold text-on-accent text-sm transition-all active:scale-95 disabled:opacity-50"
                          style={{ backgroundColor: "var(--in)" }}
                        >
                          Approuver
                        </button>
                        {selfApprovalBlocked && (
                          <p
                            data-testid="self-approval-notice"
                            role="note"
                            className="text-xs px-1"
                            style={{ color: "var(--out)" }}
                          >
                            L'auteur ne peut pas approuver sa propre dépense.
                          </p>
                        )}
                      </>
                    )}
                    {canRejectMulti.allowed && (
                      <button
                        onClick={() => setShowRejectModal(true)}
                        className="w-full py-4 rounded-full font-semibold text-sm transition-all active:scale-95"
                        style={{
                          backgroundColor: "var(--surface)",
                          color: "var(--out)",
                          border: "1px solid color-mix(in srgb, var(--out) 20%, transparent)",
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
                      color: "var(--warn)",
                      border: "1px solid color-mix(in srgb, var(--warn) 20%, transparent)",
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
                      color: "var(--data-planified)",
                      border: "1px solid color-mix(in srgb, var(--data-planified) 20%, transparent)",
                    }}
                  >
                    Modifier
                  </button>
                )}
                {(tx.status === "DRAFT" || tx.status === "PENDING") && canDeleteMulti.allowed && (
                  <button
                    onClick={handleDelete}
                    disabled={guard.submitting}
                    className="w-full py-4 rounded-full font-semibold text-sm transition-all active:scale-95"
                    style={{
                      backgroundColor: "var(--surface)",
                      color: "var(--out)",
                      border: "1px solid color-mix(in srgb, var(--out) 20%, transparent)",
                    }}
                  >
                    Supprimer
                  </button>
                )}
              </div>

              {/* Contre-transaction */}
              {reversal && (
                <InfoCard
                  className="mb-6"
                  style={{
                    border: "1px solid color-mix(in srgb, var(--warn) 20%, transparent)",
                  }}
                >
                  <p className="text-text-tertiary text-xs mb-2">Contre-transaction</p>
                  <p className="text-text-primary text-sm font-medium">{reversal.description}</p>
                  <p className="text-text-tertiary text-xs mt-1">{formatDate(reversal.date)}</p>
                </InfoCard>
              )}

              {/* Justificatifs */}
              <JustificatifsSection transactionId={tx.id} />
            </div>
          </div>
          <BottomNav />

          {/* Modal: Reject */}
          {showRejectModal && (
            <div
              ref={rejectModalRef}
              role="dialog"
              aria-modal="true"
              className="fixed inset-0 z-overlay flex items-center justify-center p-4 outline-none"
              style={{ backgroundColor: "var(--scrim)" }}
            >
              <div
                className="w-full max-w-sm rounded-2xl p-5"
                style={{ backgroundColor: "var(--surface)" }}
              >
                <h3 className="text-text-primary font-semibold text-lg mb-4">Rejeter la transaction</h3>
                <textarea
                  value={rejectComment}
                  onChange={(e) => setRejectComment(e.target.value)}
                  placeholder="Raison du rejet (optionnel)"
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl text-sm mb-4 resize-none"
                  style={{
                    backgroundColor: "var(--surface-hover)",
                    color: "var(--text-primary)",
                    border: "1px solid var(--surface-active)",
                  }}
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleRejectConfirm}
                    disabled={guard.submitting}
                    className="flex-1 py-3 rounded-full font-semibold text-on-accent text-sm"
                    style={{ backgroundColor: "var(--out)" }}
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

          {/* Modal: Reverse */}
          {showReverseModal && (
            <div
              ref={reverseModalRef}
              role="dialog"
              aria-modal="true"
              className="fixed inset-0 z-overlay flex items-center justify-center p-4 outline-none"
              style={{ backgroundColor: "var(--scrim)" }}
            >
              <div
                className="w-full max-w-sm rounded-2xl p-5"
                style={{ backgroundColor: "var(--surface)" }}
              >
                <h3 className="text-text-primary font-semibold text-lg mb-4">Contre-transagir</h3>
                <p className="text-text-tertiary text-sm mb-4">Raison de la contre-transaction</p>
                <textarea
                  value={reverseReason}
                  onChange={(e) => setReverseReason(e.target.value)}
                  placeholder="Ex: Erreur de montant"
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl text-sm mb-4 resize-none"
                  style={{
                    backgroundColor: "var(--surface-hover)",
                    color: "var(--text-primary)",
                    border: "1px solid var(--surface-active)",
                  }}
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleReverse}
                    disabled={guard.submitting}
                    className="flex-1 py-3 rounded-full font-semibold text-on-accent text-sm"
                    style={{ backgroundColor: "var(--warn)" }}
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
      </IonContent>
    </IonPage>
  );
}
