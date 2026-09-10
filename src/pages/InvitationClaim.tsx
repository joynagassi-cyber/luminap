/**
 * Invitation Claim Page — scan QR or enter code to join an organization
 *
 * Two-step flow:
 * 1. Scan QR / enter code
 * 2. Confirm → creates PENDING user locally
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  IonPage,
  IonHeader,
  IonContent,
  IonTitle,
  IonToolbar,
  IonButton,
  IonItem,
  IonLabel,
  IonInput,
  IonCard,
  IonCardHeader,
  IonCardContent,
  IonAlert,
  IonToast,
} from "@ionic/react";
import {
  QrCode,
  Keyboard,
  CheckCircle,
  XCircle,
  AlertCircle,
  UserPlus,
} from "lucide-react";
import TopHeader from "@/components/TopHeader";
import BottomNav from "@/components/BottomNav";
import { useCurrentUser } from "@/lib/dataLayer";
import {
  invitation,
  parseQRPayload,
  type ClaimPayload,
} from "@/capabilities/invitation";

export default function InvitationClaim() {
  const navigate = useNavigate();
  const user = useCurrentUser();

  const [mode, setMode] = useState<"code" | "scan">("code");
  const [codeInput, setCodeInput] = useState("");
  const [rawPayload, setRawPayload] = useState("");
  const [parsedPayload, setParsedPayload] = useState<ClaimPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [showAlert, setShowAlert] = useState(false);

  const handleCodeSubmit = async () => {
    const trimmed = codeInput.trim().toUpperCase();
    if (trimmed.length < 4) return;

    setLoading(true);
    try {
      // Try direct code lookup first (already synced)
      const invite = await invitation.getByCode(trimmed);
      if (invite) {
        const payload: ClaimPayload = {
          v: 1,
          orgId: invite.orgId,
          invitationId: invite.id,
          code: invite.code,
          role: invite.targetRole,
          scope: {
            type: invite.targetScopeType as "ORG" | "GROUP",
            ...(invite.targetScopeType === "GROUP" && invite.targetGroupId
              ? { groupId: invite.targetGroupId }
              : {}),
          },
          memberId: invite.targetMemberId,
          issuedAt: invite.issuedAt,
          expiresAt: invite.expiresAt,
        };
        setParsedPayload(payload);
        setMode("scan"); // reuse scan view for detail
      } else {
        setResult({
          ok: false,
          message: "Code introuvable. L'invité et l'émetteur n'ont jamais été synchronisés. Demandez à l'émetteur de vous envoyer le QR code.",
        });
      }
    } catch (err: any) {
      setResult({ ok: false, message: err?.message ?? "Erreur" });
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!parsedPayload) return;
    setLoading(true);
    try {
      const { userId, claimId } = await invitation.claimInvitation(
        parsedPayload,
        crypto.randomUUID(),
        user.id,
      );
      setResult({
        ok: true,
        message: `Bienvenue ! Votre compte a été créé (status: PENDING). Vous pourrez utiliser l'application immédiatement. La confirmation finale arrivera dès qu'une connexion sera disponible.`,
      });
    } catch (err: any) {
      setResult({
        ok: false,
        message: err?.message === "INVITATION_EXPIRED"
          ? "Cette invitation a expiré."
          : err?.message ?? "Erreur lors de la réclamation.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleScan = async (data: string) => {
    const payload = parseQRPayload(data);
    if (!payload) {
      setResult({ ok: false, message: "QR code invalide." });
      return;
    }
    setParsedPayload(payload);
    setResult(null);
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonButton fill="clear" onClick={() => navigate(-1)}>
              ← Retour
            </IonButton>
          </IonButtons>
          <IonTitle>Invitation</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        <div className="min-h-screen bg-canvas">
          <TopHeader title="" />
          <div className="max-w-lg mx-auto px-5 pb-32 pt-16">
            <div className="text-center mb-8">
              <UserPlus className="w-12 h-12 text-primary mx-auto mb-3" />
              <h1 className="text-xl font-bold text-text-primary">
                Rejoindre une organisation
              </h1>
              <p className="text-text-tertiary text-sm mt-1">
                Scannez un QR code ou entrez un code d'invitation
              </p>
            </div>

            {/* Mode toggle */}
            <div className="flex gap-2 mb-6">
              <IonButton
                expand="block"
                fill={mode === "code" ? "solid" : "outline"}
                onClick={() => setMode("code")}
                className="flex-1"
              >
                <Keyboard className="w-4 h-4 mr-2" />
                Code manuel
              </IonButton>
              <IonButton
                expand="block"
                fill={mode === "scan" ? "solid" : "outline"}
                onClick={() => setMode("scan")}
                className="flex-1"
              >
                <QrCode className="w-4 h-4 mr-2" />
                Scanner QR
              </IonButton>
            </div>

            {mode === "code" ? (
              <div className="space-y-4">
                <IonItem lines="none" className="bg-card rounded-xl">
                  <IonLabel position="floating">Code d'invitation</IonLabel>
                  <IonInput
                    value={codeInput}
                    onIonChange={(e) => setCodeInput(e.detail.value!)}
                    placeholder="LUM-XXXXXX"
                    capitalized
                    uppercase
                    className="text-center text-xl font-mono tracking-widest"
                    slot="input"
                  />
                </IonItem>
                <IonButton
                  expand="block"
                  color="primary"
                  onClick={handleCodeSubmit}
                  disabled={loading || codeInput.trim().length < 4}
                >
                  {loading ? "Recherche…" : "Rechercher"}
                </IonButton>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-card rounded-xl p-6 text-center">
                  <QrCode className="w-16 h-16 text-primary mx-auto mb-3" />
                  <p className="text-text-secondary text-sm">
                    Scanner un QR code
                  </p>
                  <p className="text-text-tertiary text-xs mt-1">
                    Fonctionnalité à implémenter avec le plugin caméra Capacitor
                  </p>
                </div>
                {/* Manual raw input fallback */}
                <IonItem lines="none" className="bg-card rounded-xl">
                  <IonLabel position="floating">JSON brut (débogage)</IonLabel>
                  <IonInput
                    value={rawPayload}
                    onIonChange={(e) => setRawPayload(e.detail.value!)}
                    placeholder='{"v":1,"orgId":"..."}'
                    className="text-xs font-mono"
                    slot="input"
                  />
                </IonItem>
                <IonButton
                  expand="block"
                  fill="outline"
                  onClick={() => handleScan(rawPayload)}
                  disabled={!rawPayload.trim()}
                >
                  Décoder le payload
                </IonButton>
              </div>
            )}

            {/* Payload detail */}
            {parsedPayload && (
              <IonCard className="mt-4 bg-card border-primary">
                <IonCardHeader>
                  <IonTitle className="text-sm">Détails de l'invitation</IonTitle>
                </IonCardHeader>
                <IonCardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-text-tertiary">Code</span>
                    <code className="font-mono font-bold">{parsedPayload.code}</code>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-tertiary">Rôle</span>
                    <span className="font-medium">{parsedPayload.role}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-tertiary">Portée</span>
                    <span className="font-medium">
                      {parsedPayload.scope.type === "ORG" ? "Organisation" : "Groupe"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-tertiary">Expire</span>
                    <span className="font-medium">
                      {new Date(parsedPayload.expiresAt).toLocaleDateString("fr-FR")}
                    </span>
                  </div>
                </IonCardContent>
                <IonCardContent className="pt-0">
                  <IonButton
                    expand="block"
                    color="primary"
                    onClick={handleConfirm}
                    disabled={loading}
                  >
                    {loading ? "Création…" : "Confirmer et rejoindre"}
                  </IonButton>
                </IonCardContent>
              </IonCard>
            )}

            {/* Result */}
            {result && (
              <div className={`mt-4 p-4 rounded-xl ${result.ok ? "bg-green-500/10 border border-green-500/30" : "bg-red-500/10 border border-red-500/30"}`}>
                <div className="flex items-start gap-3">
                  {result.ok ? (
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  )}
                  <div>
                    <p className={`text-sm ${result.ok ? "text-green-400" : "text-red-400"}`}>
                      {result.message}
                    </p>
                    {result.ok && (
                      <IonButton
                        size="small"
                        fill="outline"
                        color="light"
                        className="mt-2"
                        onClick={() => navigate("/dashboard")}
                      >
                        Accéder au tableau de bord
                      </IonButton>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Info box */}
            <div className="mt-6 bg-card rounded-xl p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-text-primary">Fonctionne hors-ligne</p>
                  <p className="text-xs text-text-tertiary mt-1">
                    Votre compte sera créé localement en statut PENDING. Les restrictions
                    financières seront levées dès que l'invitation sera confirmée par le serveur.
                  </p>
                </div>
              </div>
            </div>
          </div>
          <BottomNav />
        </div>
      </IonContent>
    </IonPage>
  );
}
