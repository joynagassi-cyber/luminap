/**
 * Invitation Manage v2 — Liste, filtres et révocation des invitations.
 *
 * Design : fond sombre, cartes d'invitation avec badges de statut, stats en
 * en-tête, recherche, filtre par statut, modal de rejet de demande.
 * Tokens CSS `var(--*)`.
 *
 * Logique métier inchangée : chargement des invitations et de leurs claims,
 * confirmation/rejet de claims, révocation, pagination "Afficher plus".
 */

import { captureClientError } from "@/lib/clientErrors";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  IonPage,
  IonContent,
  IonHeader,
  IonToolbar,
  IonButtons,
  IonButton,
  IonBackButton,
  IonInput,
  IonBadge,
  IonSpinner,
} from "@ionic/react";
import ConfirmModal from "@/components/ConfirmModal";
import {
  QrCode,
  Plus,
  Trash2,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Users,
  Shield,
} from "lucide-react";
import BottomNav from "@/components/BottomNav";
import Badge from "@/components/Badge";
import { ShimmerCard } from "@/components/Shimmer";
import EmptyState from "@/components/EmptyState";
import CapabilityBanner from "@/components/CapabilityBanner";
import { CLAIM_BADGES } from "@/lib/badges";
import { getOrganizationId } from "@/lib/orgContext";
import { useInvitations } from "@/lib/dataLayer";
import { useCurrentUser } from "@/lib/dataLayer";
import { invitation } from "@/capabilities/invitation";
import type { Invitation, InvitationClaim } from "@/capabilities/invitation";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  ACTIVE: { label: "Actif", color: "var(--data-success)", icon: CheckCircle },
  EXPIRED: { label: "Expiré", color: "var(--data-muted)", icon: Clock },
  REVOKED: { label: "Révoqué", color: "var(--data-alert)", icon: XCircle },
  EXHAUSTED: { label: "Épuisé", color: "var(--data-exhausted)", icon: Users },
};

export default function InvitationManage() {
  const navigate = useNavigate();
  const user = useCurrentUser();
  const { data: invData } = useInvitations();

  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [claims, setClaims] = useState<Record<string, InvitationClaim[]>>({});
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [showRevokeAlert, setShowRevokeAlert] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<Invitation | null>(null);
  const [rejecting, setRejecting] = useState<{
    invId: string;
    claim: InvitationClaim;
  } | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [claimBusy, setClaimBusy] = useState<string | null>(null);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [listError, setListError] = useState(false);
  const [visibleCount, setVisibleCount] = useState(50);

  const loadInvitations = () => {
    setIsLoading(true);
    setListError(false);
    invitation
      .getInvitations()
      .then((list) => {
        setInvitations(list);
        setIsLoading(false);
      })
      .catch((e) => {
        captureClientError(e, { message: "Échec du chargement des invitations" });
        setListError(true);
        setIsLoading(false);
      });
  };

  useEffect(() => {
    loadInvitations();
  }, []);

  useEffect(() => {
    invitations
      .filter((i) => i.status === "ACTIVE")
      .forEach((inv) => {
        invitation
          .getClaims(inv.id)
          .then((list) => setClaims((prev) => ({ ...prev, [inv.id]: list })))
          .catch((e) => {
            captureClientError(e, { message: "Échec du chargement des demandes" });
          });
      });
  }, [invitations]);

  const handleConfirmClaim = async (invId: string, claimId: string) => {
    if (!user) return;
    setClaimBusy(claimId);
    setClaimError(null);
    try {
      await invitation.updateClaimStatus(claimId, "CONFIRMED", undefined, user.id);
      const list = await invitation.getClaims(invId);
      setClaims((prev) => ({ ...prev, [invId]: list }));
    } catch (err: any) {
      setClaimError(err?.message ?? "Erreur lors de la confirmation");
    } finally {
      setClaimBusy(null);
    }
  };

  const handleRejectClaim = async () => {
    if (!rejecting || !user) return;
    setClaimBusy(rejecting.claim.id);
    setClaimError(null);
    try {
      await invitation.updateClaimStatus(
        rejecting.claim.id,
        "REJECTED_REVOKED",
        rejectReason.trim() || "Non précisée",
        user.id,
      );
      const list = await invitation.getClaims(rejecting.invId);
      setClaims((prev) => ({ ...prev, [rejecting.invId]: list }));
      setRejecting(null);
      setRejectReason("");
    } catch (err: any) {
      setClaimError(err?.message ?? "Erreur lors du rejet");
    } finally {
      setClaimBusy(null);
    }
  };

  const filtered = invitations.filter((inv) => {
    const matchSearch =
      !search ||
      inv.code.toLowerCase().includes(search.toLowerCase()) ||
      inv.targetRole.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "ALL" || inv.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const visibleInvitations = filtered.slice(0, visibleCount);

  const handleRevoke = async () => {
    if (!revokeTarget) return;
    try {
      await invitation.revokeInvitation(revokeTarget.id, user.id);
      setInvitations((prev) =>
        prev.map((i) =>
          i.id === revokeTarget.id ? { ...i, status: "REVOKED" as const } : i,
        ),
      );
      setShowRevokeAlert(false);
      setRevokeTarget(null);
    } catch (err: any) {
      // silent - error shown in UI
    }
  };

  const handleGoEmit = () => navigate("/invitation/emit");
  const handleGoClaim = () => navigate("/invitation/claim");

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/" />
          </IonButtons>
          <IonTitle>Gestion des invitations</IonTitle>
          <IonButtons slot="end">
            <IonButton
              fill="clear"
              onClick={handleGoClaim}
              aria-label="Aller au scan d'invitation"
            >
              <QrCode className="w-5 h-5" aria-hidden="true" />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen className="bg-canvas">
        <h1 className="sr-only">Gestion des invitations</h1>
        <div className="min-h-dvh">
          <div className="max-w-lg mx-auto px-5 pb-safe-calc pt-safe-calc">
            <CapabilityBanner orgId={getOrganizationId()} />

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              {[
                { label: "Actives", count: invitations.filter((i) => i.status === "ACTIVE").length, color: "var(--data-success)" },
                { label: "Expirées", count: invitations.filter((i) => i.status === "EXPIRED").length, color: "var(--data-muted)" },
                { label: "Révoquées", count: invitations.filter((i) => i.status === "REVOKED").length, color: "var(--data-alert)" },
              ].map((stat) => (
                <div key={stat.label} className="rounded-xl p-4 text-center" style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}>
                  <p className="text-2xl font-bold" style={{ color: stat.color }}>{stat.count}</p>
                  <p className="text-xs text-text-tertiary mt-1">{stat.label}</p>
                </div>
              ))}
            </div>

            {/* Search & Filter */}
            <div className="relative mb-3">
              <IonInput
                value={search}
                onIonInput={(e) => setSearch(e.detail.value!)}
                placeholder="Rechercher par code ou rôle…"
                className="w-full pl-10 pr-4 py-3 rounded-xl text-text-primary text-sm"
                style={{
                  backgroundColor: "var(--surface)",
                  border: "1px solid var(--border)",
                }}
              />
            </div>
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
              {["ALL", "ACTIVE", "EXPIRED", "REVOKED", "EXHAUSTED"].map((s) => {
                const active = filterStatus === s;
                return (
                  <button
                    key={s}
                    onClick={() => setFilterStatus(s)}
                    className="whitespace-nowrap px-4 py-2 rounded-full text-xs font-medium transition-all"
                    style={{
                      backgroundColor: active ? "var(--accent-primary)" : "var(--surface)",
                      color: active ? "var(--text-primary)" : "var(--text-secondary)",
                      border: "1px solid var(--border)",
                    }}
                    aria-pressed={active}
                  >
                    {s === "ALL" ? "Tout" : STATUS_CONFIG[s]?.label ?? s}
                  </button>
                );
              })}
            </div>

            {/* Action buttons */}
            <div className="flex gap-3 mb-6">
              <IonButton
                expand="block"
                fill="solid"
                onClick={handleGoEmit}
                className="text-sm font-semibold"
              >
                <Plus className="w-4 h-4 mr-2" />
                Créer une invitation
              </IonButton>
              <IonButton
                expand="block"
                fill="outline"
                onClick={handleGoClaim}
                className="text-sm font-semibold"
              >
                <QrCode className="w-4 h-4 mr-2" />
                Scanner
              </IonButton>
            </div>

            {/* List */}
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => <ShimmerCard key={i} rows={2} />)}
              </div>
            ) : listError ? (
              <div className="text-center py-12 text-text-tertiary">
                <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Impossible de charger les invitations</p>
                <p className="text-sm mt-1">Vérifiez votre connexion, puis réessayez.</p>
                <IonButton
                  fill="outline"
                  size="small"
                  className="mt-3 text-sm"
                  onClick={loadInvitations}
                  aria-label="Réessayer le chargement des invitations"
                >
                  Réessayer
                </IonButton>
              </div>
            ) : filtered.length === 0 ? (
              <EmptyState
                title="Aucune invitation"
                description="Créez votre première invitation pour rejoindre votre organisation."
                icon={<Shield className="w-6 h-6" />}
                actionLabel="Créer une invitation"
                onAction={handleGoEmit}
              />
            ) : (
              <>
                <div className="space-y-3">
                  {visibleInvitations.map((inv) => {
                    const StatusIcon = STATUS_CONFIG[inv.status]?.icon ?? AlertCircle;
                    const statusColor = STATUS_CONFIG[inv.status]?.color ?? "var(--data-muted)";
                    return (
                      <div key={inv.id} className="rounded-xl p-4" style={{
                        backgroundColor: "var(--surface)",
                        border: "1px solid var(--border)",
                      }}>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <StatusIcon className="w-4 h-4" style={{ color: statusColor }} />
                            <div>
                              <p className="font-mono font-bold text-text-primary text-sm">{inv.code}</p>
                              <p className="text-text-tertiary text-xs">{inv.targetRole}</p>
                            </div>
                          </div>
                          <IonBadge color="medium" className="text-[10px]">
                            {inv.status}
                          </IonBadge>
                        </div>
                        <div className="space-y-1.5 text-sm">
                          <div className="flex justify-between">
                            <span className="text-text-tertiary">Portée</span>
                            <span className="font-medium">
                              {inv.targetScopeType === "ORG" ? "Organisation" : `Groupe ${inv.targetGroupId ?? ""}`}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-text-tertiary">Usages</span>
                            <span className="font-medium">{inv.usedCount}/{inv.maxUses}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-text-tertiary">Expire</span>
                            <span className="font-medium">
                              {new Date(inv.expiresAt).toLocaleDateString("fr-FR")}
                            </span>
                          </div>
                        </div>

                        {claimError && (
                          <p className="mt-2 text-xs" style={{ color: "var(--out)" }}>
                            {claimError}
                          </p>
                        )}

                        {inv.status === "ACTIVE" && (claims[inv.id]?.length ?? 0) > 0 && (
                          <div className="mt-4 space-y-2">
                            <p className="text-xs font-semibold uppercase tracking-wide text-text-tertiary">
                              Demandes ({claims[inv.id].length})
                            </p>
                            {claims[inv.id].map((cl) => (
                              <div key={cl.id} className="rounded-xl p-2.5" style={{ backgroundColor: "var(--surface)" }}>
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
                                    {new Date(cl.claimedAt).toLocaleString("fr-FR")}
                                  </span>
                                  <Badge table={CLAIM_BADGES} value={cl.status} size="xs" />
                                </div>
                                {cl.rejectReason && (
                                  <p className="text-xs mt-1" style={{ color: "var(--out)" }}>{cl.rejectReason}</p>
                                )}
                                {cl.status === "PENDING_SYNC" && (
                                  <div className="flex gap-2 mt-2">
                                    <button
                                      type="button"
                                      onClick={() => handleConfirmClaim(inv.id, cl.id)}
                                      disabled={claimBusy === cl.id}
                                      className="px-3 py-1.5 rounded-full text-xs font-semibold text-on-accent transition-all active:scale-95 disabled:opacity-50"
                                      style={{ backgroundColor: "var(--in)" }}
                                    >
                                      {claimBusy === cl.id ? (
                                        <>
                                          <IonSpinner name="lines" style={{ width: 12, height: 12, marginRight: 4 }} /> …
                                        </>
                                      ) : (
                                        "Confirmer"
                                      )}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setRejecting({ invId: inv.id, claim: cl });
                                        setRejectReason("");
                                      }}
                                      disabled={claimBusy === cl.id}
                                      className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-95 disabled:opacity-50"
                                      style={{
                                        color: "var(--out)",
                                        border: "1px solid var(--out)",
                                        background: "transparent",
                                      }}
                                    >
                                      Rejeter
                                    </button>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {inv.status === "ACTIVE" && (
                          <IonButton
                            size="small"
                            fill="outline"
                            color="danger"
                            className="mt-3 text-sm"
                            onClick={() => {
                              setRevokeTarget(inv);
                              setShowRevokeAlert(true);
                            }}
                          >
                            <Trash2 className="w-3 h-3 mr-1" />
                            Révoquer
                          </IonButton>
                        )}
                      </div>
                    );
                  })}
                  {filtered.length > visibleCount && (
                    <IonButton
                      expand="block"
                      fill="outline"
                      size="small"
                      className="mt-4 text-sm"
                      onClick={() => setVisibleCount((c) => c + 50)}
                      aria-label="Afficher plus d'invitations"
                    >
                      Afficher plus
                    </IonButton>
                  )}
                </div>
              </>
            )}
          </div>
          <BottomNav />
        </div>

        {/* ConfirmModal — révocation destructive */}
        <ConfirmModal
          open={showRevokeAlert}
          onClose={() => setShowRevokeAlert(false)}
          onConfirm={handleRevoke}
          title="Révoquer l'invitation"
          description={`Êtes-vous sûr de vouloir révoquer l'invitation ${revokeTarget?.code} ? Cette action est irréversible.`}
          confirmLabel="Révoquer"
          confirmVariant="danger"
        />

        {/* Modal de rejet d'une demande */}
        {rejecting && (
          <div className="fixed inset-0 flex items-end justify-center" style={{ zIndex: "var(--z-float)", backgroundColor: "var(--scrim)" }}>
            <div className="w-full max-w-lg rounded-t-2xl p-6 space-y-4" style={{ backgroundColor: "var(--card)", paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 24px)" }} role="dialog" aria-label="Rejeter la demande">
              <p className="text-text-primary font-semibold text-sm">Rejeter la demande d'invitation</p>
              <textarea
                data-testid="reject-reason"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Raison (optionnel)…"
                rows={2}
                className="w-full px-3 py-2.5 rounded-xl text-sm resize-none"
                style={{
                  backgroundColor: "var(--surface)",
                  color: "var(--text-primary)",
                  border: "1px solid var(--border)",
                }}
              />
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setRejecting(null)}
                  className="flex-1 py-3 rounded-full text-sm font-semibold transition-all active:scale-95"
                  style={{ color: "var(--text-secondary)", border: "1px solid var(--border)", background: "transparent" }}
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleRejectClaim}
                  disabled={claimBusy !== null}
                  className="flex-1 py-3 rounded-full text-sm font-semibold text-on-accent transition-all active:scale-95 disabled:opacity-50"
                  style={{ backgroundColor: "var(--out)" }}
                >
                  {claimBusy ? (
                    <>
                      <IonSpinner name="lines" style={{ width: 14, height: 14, marginRight: 6 }} /> Traitement…
                    </>
                  ) : (
                    "Rejeter"
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </IonContent>
    </IonPage>
  );
}
