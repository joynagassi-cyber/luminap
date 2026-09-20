/**
 * Invitation Manage Page — list, filter, and revoke invitations
 */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  IonPage,
  IonHeader,
  IonContent,
  IonTitle,
  IonToolbar,
  IonButton,
  IonButtons,
  IonItem,
  IonLabel,
  IonList,
  IonCard,
  IonCardHeader,
  IonCardContent,
  IonBadge,
  IonAlert,
  IonInput,
  IonSearchbar,
} from "@ionic/react";
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
import TopHeader from "@/components/TopHeader";
import BottomNav from "@/components/BottomNav";
import { useInvitations } from "@/lib/dataLayer";
import { useCurrentUser } from "@/lib/dataLayer";
import { invitation } from "@/capabilities/invitation";
import type {
  Invitation,
  InvitationClaim,
} from "@/capabilities/invitation";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  ACTIVE: { label: "Actif", color: "#10B981", icon: CheckCircle },
  EXPIRED: { label: "Expiré", color: "#6B7280", icon: Clock },
  REVOKED: { label: "Révoqué", color: "#EF4444", icon: XCircle },
  EXHAUSTED: { label: "Épuisé", color: "#9CA3AF", icon: Users },
};

const CLAIM_CONFIG: Record<string, { label: string; color: string }> = {
  PENDING_SYNC: { label: "En attente", color: "#FFB800" },
  CONFIRMED: { label: "Confirmée", color: "#1DB954" },
  REJECTED_DUPLICATE: { label: "Rejetée (doublon)", color: "#E51332" },
  REJECTED_EXPIRED: { label: "Rejetée (expirée)", color: "#E51332" },
  REJECTED_EXHAUSTED: { label: "Rejetée (épuisée)", color: "#E51332" },
  REJECTED_REVOKED: { label: "Rejetée", color: "#E51332" },
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

  useEffect(() => {
    invitation
      .getInvitations()
      .then((list) => {
        setInvitations(list);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, []);

  // Load the claims (demandes) of every ACTIVE invitation.
  useEffect(() => {
    invitations
      .filter((i) => i.status === "ACTIVE")
      .forEach((inv) => {
        invitation
          .getClaims(inv.id)
          .then((list) => setClaims((prev) => ({ ...prev, [inv.id]: list })))
          .catch(() => {});
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

  const handleRevoke = async () => {
    if (!revokeTarget) return;
    try {
      await invitation.revokeInvitation(revokeTarget.id, user.id);
      setInvitations((prev) =>
        prev.map((i) => (i.id === revokeTarget.id ? { ...i, status: "REVOKED" as const } : i)),
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
            <IonButton fill="clear" onClick={() => navigate(-1)}>
              ← Retour
            </IonButton>
          </IonButtons>
          <IonTitle>Gestion des invitations</IonTitle>
          <IonButtons slot="end">
            <IonButton fill="clear" onClick={handleGoClaim}>
              <QrCode className="w-5 h-5" />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        <div className="min-h-screen bg-canvas">
          <TopHeader title="" />
          <div className="max-w-lg mx-auto px-5 pb-32 pt-16">
            {/* Stats */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              {[
                { label: "Actives", count: invitations.filter((i) => i.status === "ACTIVE").length, color: "#10B981" },
                { label: "Expirées", count: invitations.filter((i) => i.status === "EXPIRED").length, color: "#6B7280" },
                { label: "Révoquées", count: invitations.filter((i) => i.status === "REVOKED").length, color: "#EF4444" },
              ].map((stat) => (
                <div key={stat.label} className="bg-card rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold" style={{ color: stat.color }}>{stat.count}</p>
                  <p className="text-xs text-text-tertiary">{stat.label}</p>
                </div>
              ))}
            </div>

            {/* Search & Filter */}
            <IonSearchbar
              value={search}
              onIonInput={(e) => setSearch(e.detail.value!)}
              placeholder="Rechercher par code ou rôle…"
              className="mb-3"
            />
            <div className="flex gap-2 mb-4 overflow-x-auto">
              {["ALL", "ACTIVE", "EXPIRED", "REVOKED", "EXHAUSTED"].map((s) => (
                <IonButton
                  key={s}
                  size="small"
                  fill={filterStatus === s ? "solid" : "outline"}
                  onClick={() => setFilterStatus(s)}
                >
                  {s === "ALL" ? "Tout" : STATUS_CONFIG[s]?.label ?? s}
                </IonButton>
              ))}
            </div>

            {/* Action buttons */}
            <div className="flex gap-3 mb-6">
              <IonButton expand="block" color="primary" onClick={handleGoEmit}>
                <Plus className="w-4 h-4 mr-2" />
                Créer une invitation
              </IonButton>
              <IonButton expand="block" fill="outline" onClick={handleGoClaim}>
                <QrCode className="w-4 h-4 mr-2" />
                Scanner
              </IonButton>
            </div>

            {/* List */}
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-card rounded-xl p-4 animate-pulse">
                    <div className="h-4 bg-[var(--surface-hover)] rounded w-1/3 mb-3" />
                    <div className="h-3 bg-[var(--surface-hover)] rounded w-2/3" />
                  </div>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12 text-text-tertiary">
                <Shield className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>Aucune invitation</p>
                <p className="text-sm">Créez votre première invitation</p>
              </div>
            ) : (
              <IonList lines="none" className="space-y-3">
                {filtered.map((inv) => {
                  const StatusIcon = STATUS_CONFIG[inv.status]?.icon ?? AlertCircle;
                  const statusColor = STATUS_CONFIG[inv.status]?.color ?? "#6B7280";
                  return (
                    <IonCard key={inv.id} className="bg-card border-none">
                      <IonCardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <StatusIcon className="w-4 h-4" style={{ color: statusColor }} />
                            <code className="font-mono font-bold text-primary">{inv.code}</code>
                          </div>
                          <IonBadge color="medium">{inv.status}</IonBadge>
                        </div>
                      </IonCardHeader>
                      <IonCardContent className="pt-0">
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-text-tertiary">Rôle</span>
                            <span className="font-medium">{inv.targetRole}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-text-tertiary">Portée</span>
                            <span className="font-medium">
                              {inv.targetScopeType === "ORG" ? "Organisation" : `Groupe ${inv.targetGroupId ?? ""}`}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-text-tertiary">Usages</span>
                            <span className="font-medium">
                              {inv.usedCount}/{inv.maxUses}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-text-tertiary">Expire</span>
                            <span className="font-medium">
                              {new Date(inv.expiresAt).toLocaleDateString("fr-FR")}
                            </span>
                          </div>
                        </div>

                        {claimError && (
                          <p className="mt-2 text-xs" style={{ color: "#ff8fa3" }}>
                            {claimError}
                          </p>
                        )}

                        {inv.status === "ACTIVE" &&
                          (claims[inv.id]?.length ?? 0) > 0 && (
                            <div className="mt-3 space-y-2">
                              <p className="text-xs font-semibold uppercase tracking-wide text-text-tertiary">
                                Demandes ({claims[inv.id].length})
                              </p>
                              {claims[inv.id].map((cl) => {
                                const cfg =
                                  CLAIM_CONFIG[cl.status] ?? CLAIM_CONFIG.PENDING_SYNC;
                                return (
                                  <div
                                    key={cl.id}
                                    className="rounded-lg p-2.5"
                                    style={{ backgroundColor: "#1a1a1a" }}
                                  >
                                    <div className="flex items-center justify-between">
                                      <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
                                        {new Date(cl.claimedAt).toLocaleString("fr-FR")}
                                      </span>
                                      <span
                                        className="text-[11px] px-1.5 py-0.5 rounded-full font-medium"
                                        style={{
                                          backgroundColor: `${cfg.color}20`,
                                          color: cfg.color,
                                        }}
                                      >
                                        {cfg.label}
                                      </span>
                                    </div>
                                    {cl.rejectReason && (
                                      <p className="text-xs mt-1" style={{ color: "#ff8fa3" }}>
                                        {cl.rejectReason}
                                      </p>
                                    )}
                                    {cl.status === "PENDING_SYNC" && (
                                      <div className="flex gap-2 mt-2">
                                        <button
                                          type="button"
                                          data-testid={`claim-confirm-${cl.id}`}
                                          onClick={() => handleConfirmClaim(inv.id, cl.id)}
                                          disabled={claimBusy === cl.id}
                                          className="px-3 py-1.5 rounded-full text-xs font-semibold text-white transition-all active:scale-95 disabled:opacity-50"
                                          style={{ backgroundColor: "#1DB954" }}
                                        >
                                          {claimBusy === cl.id ? "..." : "Confirmer"}
                                        </button>
                                        <button
                                          type="button"
                                          data-testid={`claim-reject-${cl.id}`}
                                          onClick={() => {
                                            setRejecting({ invId: inv.id, claim: cl });
                                            setRejectReason("");
                                          }}
                                          disabled={claimBusy === cl.id}
                                          className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-95 disabled:opacity-50"
                                          style={{
                                            color: "#E51332",
                                            border: "1px solid #E51332",
                                            background: "transparent",
                                          }}
                                        >
                                          Rejeter
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}

                        {inv.status === "ACTIVE" && (
                          <IonButton
                            size="small"
                            fill="outline"
                            color="danger"
                            className="mt-3"
                            onClick={() => {
                              setRevokeTarget(inv);
                              setShowRevokeAlert(true);
                            }}
                          >
                            <Trash2 className="w-3 h-3 mr-1" />
                            Révoquer
                          </IonButton>
                        )}
                      </IonCardContent>
                    </IonCard>
                  );
                })}
              </IonList>
            )}
          </div>
          <BottomNav />
        </div>
      </IonContent>

      <IonAlert
        isOpen={showRevokeAlert}
        onDidDismiss={() => setShowRevokeAlert(false)}
        header="Révoquer l'invitation"
        message={`Êtes-vous sûr de vouloir révoquer l'invitation ${revokeTarget?.code} ? Cette action est irréversible.`}
        buttons={[
          { text: "Annuler", role: "cancel" },
          {
            text: "Révoquer",
            role: "confirm",
            handler: handleRevoke,
            cssClass: "ion-color-danger",
          },
        ]}
      />

      {/* Modal de rejet d'une demande (raison + confirmation, sans prompt) */}
      {rejecting && (
        <div className="fixed inset-0 flex items-end justify-center" style={{ zIndex: 50, backgroundColor: "rgba(0,0,0,0.7)" }}>
          <div
            className="w-full max-w-lg rounded-t-2xl p-6 space-y-4"
            style={{ backgroundColor: "var(--card)" }}
            role="dialog"
            aria-label="Rejeter la demande"
          >
            <p className="text-text-primary font-semibold text-sm">
              Rejeter la demande d&apos;invitation
            </p>
            <textarea
              data-testid="reject-reason"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Raison (optionnel)…"
              rows={2}
              className="w-full px-3 py-2.5 rounded-xl text-sm resize-none"
              style={{
                backgroundColor: "#1a1a1a",
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
                data-testid="reject-confirm"
                onClick={handleRejectClaim}
                disabled={claimBusy !== null}
                className="flex-1 py-3 rounded-full text-sm font-semibold text-white transition-all active:scale-95 disabled:opacity-50"
                style={{ backgroundColor: "#E51332" }}
              >
                {claimBusy ? "Traitement…" : "Rejeter"}
              </button>
            </div>
          </div>
        </div>
      )}
    </IonPage>
  );
}
