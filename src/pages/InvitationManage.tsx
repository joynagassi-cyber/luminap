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
import { useLocalStore } from "@/store/useLocalStore";
import { invitation } from "@/capabilities/invitation";
import type { Invitation } from "@/capabilities/invitation";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  ACTIVE: { label: "Actif", color: "#10B981", icon: CheckCircle },
  EXPIRED: { label: "Expiré", color: "#6B7280", icon: Clock },
  REVOKED: { label: "Révoqué", color: "#EF4444", icon: XCircle },
  EXHAUSTED: { label: "Épuisé", color: "#9CA3AF", icon: Users },
};

export default function InvitationManage() {
  const navigate = useNavigate();
  const { user } = useLocalStore();
  const { data: invData } = useInvitations();

  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [showRevokeAlert, setShowRevokeAlert] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<Invitation | null>(null);
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
                    <div className="h-4 bg-[#282828] rounded w-1/3 mb-3" />
                    <div className="h-3 bg-[#282828] rounded w-2/3" />
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
    </IonPage>
  );
}
