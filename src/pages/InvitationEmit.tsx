/**
 * Invitation Emit Page — create and display invitation QR/code
 *
 * Flow: select role → select scope (org/group) → generate → display QR + code
 */

import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  IonPage,
  IonHeader,
  IonContent,
  IonTitle,
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonButton,
  IonItem,
  IonLabel,
  IonSelect,
  IonSelectOption,
  IonInput,
  IonAlert,
  IonCard,
  IonCardHeader,
  IonCardContent,
  IonBadge,
} from "@ionic/react";
import { QRCodeSVG } from "qrcode.react";
import {
  QrCode,
  Copy,
  Check,
  Users,
  Building2,
  Shield,
  FileDown,
} from "lucide-react";
import TopHeader from "@/components/TopHeader";
import BottomNav from "@/components/BottomNav";
import { useMembers } from "@/lib/dataLayer";
import { useCurrentUser } from "@/lib/dataLayer";
import {
  invitation,
  generateCode,
  buildQRPayload,
  exportInvitationToFile,
} from "@/capabilities/invitation";
import { getOrganizationId } from "@/lib/orgContext";
import type { Member } from "@/types";

const ROLES = [
  { value: "MEMBRE", label: "Membre" },
  { value: "RESPONSABLE_GROUPE", label: "Responsable de Groupe" },
  { value: "TREASURIER", label: "Trésorier" },
  { value: "SECRETAIRE", label: "Secrétaire" },
  { value: "ANCIEN", label: "Ancien" },
  { value: "PASTEUR_ASSOCIE", label: "Pasteur Associé" },
  { value: "PASTEUR_JEUNESSE", label: "Pasteur Jeunesse" },
] as const;

export default function InvitationEmit() {
  const navigate = useNavigate();
  const user = useCurrentUser();
  const { data: psMembers } = useMembers();
  const members = psMembers ?? [];

  const [step, setStep] = useState<"configure" | "qr">("configure");
  const [targetRole, setTargetRole] = useState("MEMBRE");
  const [scopeType, setScopeType] = useState<"ORG" | "GROUP">("ORG");
  const [targetGroupId, setTargetGroupId] = useState("");
  const [targetMemberId, setTargetMemberId] = useState("");
  const [expiresDays, setExpiresDays] = useState(7);
  const [maxUses, setMaxUses] = useState(1);

  const [generatedCode, setGeneratedCode] = useState("");
  const [generatedId, setGeneratedId] = useState("");
  const [showCopy, setShowCopy] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");

  const handleCreate = async () => {
    try {
      const expiresAt = new Date(
        Date.now() + expiresDays * 24 * 60 * 60 * 1000,
      ).toISOString();

      const id = await invitation.createInvitation({
        orgId: getOrganizationId(),
        targetRole,
        targetScopeType: scopeType,
        targetGroupId: scopeType === "GROUP" ? targetGroupId : undefined,
        targetMemberId: targetMemberId || undefined,
        issuedBy: user.id,
        expiresAt,
        maxUses,
      });

      const code = generateCode();
      const payload = buildQRPayload(
        {
          orgId: getOrganizationId(),
          targetRole,
          targetScopeType: scopeType,
          targetGroupId: scopeType === "GROUP" ? targetGroupId : undefined,
          targetMemberId: targetMemberId || undefined,
          issuedBy: user.id,
          expiresAt,
          maxUses: maxUses,
        },
        code,
      );

      setGeneratedCode(code);
      setGeneratedId(id);
      setStep("qr");
      setShowAlert(true);
      setAlertMessage("Invitation créée et sauvegardée. L'appareil de l'invité devra scanner le QR ou entrer le code.");
    } catch (err: any) {
      setAlertMessage(err?.message ?? "Erreur lors de la création");
      setShowAlert(true);
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(generatedCode).then(() => {
      setShowCopy(true);
      setTimeout(() => setShowCopy(false), 2000);
    });
  };

  /** 4ᵉ transport : exporter l'invitation en fichier JSON (transfert local). */
  const handleExportFile = async () => {
    try {
      const json = await exportInvitationToFile(generatedId);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `lumina-invitation-${generatedCode}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setAlertMessage(err?.message ?? "Export impossible");
      setShowAlert(true);
    }
  };

  const payload = useMemo(() => {
    if (!generatedId) return null;
    return {
      v: 1,
      orgId: getOrganizationId(),
      invitationId: generatedId,
      code: generatedCode,
      role: targetRole,
      scope: {
        type: scopeType,
        ...(scopeType === "GROUP" ? { groupId: targetGroupId } : {}),
      },
      memberId: targetMemberId || null,
      issuedAt: new Date().toISOString(),
      expiresAt: new Date(
        Date.now() + expiresDays * 24 * 60 * 60 * 1000,
      ).toISOString(),
    };
  }, [generatedId, generatedCode, targetRole, scopeType, targetGroupId, targetMemberId, expiresDays]);

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/settings" />
          </IonButtons>
          <IonTitle>Créer une invitation</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        <div className="min-h-screen bg-canvas">
          <TopHeader title="" />

          <div className="max-w-lg mx-auto px-5 pb-32 pt-16">
            {step === "configure" ? (
              <div className="space-y-6">
                {/* Role selection */}
                <IonItem lines="none" className="bg-card rounded-xl">
                  <IonLabel className="text-sm text-text-secondary mb-1">Rôle cible</IonLabel>
                  <IonSelect
                    value={targetRole}
                    onIonChange={(e) => setTargetRole(e.detail.value!)}
                    placeholder="Sélectionner un rôle"
                  >
                    {ROLES.map((r) => (
                      <IonSelectOption key={r.value} value={r.value}>
                        {r.label}
                      </IonSelectOption>
                    ))}
                  </IonSelect>
                </IonItem>

                {/* Scope selection */}
                <IonItem lines="none" className="bg-card rounded-xl">
                  <IonLabel className="text-sm text-text-secondary mb-1">Portée</IonLabel>
                  <div className="flex gap-2">
                    <IonButton
                      size="small"
                      fill={scopeType === "ORG" ? "solid" : "outline"}
                      onClick={() => setScopeType("ORG")}
                    >
                      <Building2 className="w-3 h-3 mr-1" /> Organisation
                    </IonButton>
                    <IonButton
                      size="small"
                      fill={scopeType === "GROUP" ? "solid" : "outline"}
                      onClick={() => setScopeType("GROUP")}
                    >
                      <Users className="w-3 h-3 mr-1" /> Groupe
                    </IonButton>
                  </div>
                </IonItem>

                {scopeType === "GROUP" && (
                  <IonItem lines="none" className="bg-card rounded-xl">
                    <IonLabel>Groupe cible</IonLabel>
                    <IonSelect
                      value={targetGroupId}
                      onIonChange={(e) => setTargetGroupId(e.detail.value!)}
                    >
                      <IonSelectOption value="">-- Aucun --</IonSelectOption>
                      {/* Groups would be loaded here */}
                    </IonSelect>
                  </IonItem>
                )}

                <IonItem lines="none" className="bg-card rounded-xl">
                  <IonLabel>
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      Membre existant (optionnel)
                    </div>
                    <p className="text-xs text-text-tertiary mt-1">
                      Si l'invité a déjà un compte membre, lier son invitation
                    </p>
                  </IonLabel>
                  <IonSelect
                    value={targetMemberId}
                    onIonChange={(e) => setTargetMemberId(e.detail.value!)}
                  >
                    <IonSelectOption value="">-- Nouveau membre --</IonSelectOption>
                    {members.map((m: any) => (
                      <IonSelectOption key={m.id} value={m.id}>
                        {m.firstName} {m.lastName}
                      </IonSelectOption>
                    ))}
                  </IonSelect>
                </IonItem>

                <IonItem lines="none" className="bg-card rounded-xl">
                  <IonLabel>Durée de validité</IonLabel>
                  <IonInput
                    type="number"
                    value={String(expiresDays)}
                    onIonChange={(e) => setExpiresDays(Number(e.detail.value!))}
                    slot="end"
                    className="w-16 text-center"
                  />
                  <IonLabel className="text-xs text-text-tertiary ml-1">jours</IonLabel>
                </IonItem>

                <IonItem lines="none" className="bg-card rounded-xl">
                  <IonLabel>Usages max</IonLabel>
                  <IonInput
                    type="number"
                    value={String(maxUses)}
                    onIonChange={(e) => setMaxUses(Number(e.detail.value!))}
                    slot="end"
                    className="w-16 text-center"
                  />
                </IonItem>

                <IonButton
                  expand="block"
                  color="primary"
                  onClick={handleCreate}
                  className="mt-4"
                >
                  <QrCode className="w-4 h-4 mr-2" />
                  Générer l'invitation
                </IonButton>
              </div>
            ) : (
              <div className="space-y-6 text-center">
                <IonCard className="bg-card border-none">
                  <IonCardHeader>
                    <IonTitle className="text-center">Scannez ce QR code</IonTitle>
                    <IonLabel className="text-center text-sm text-text-tertiary block mt-1">
                      Montrez ce code à la personne à inviter
                    </IonLabel>
                  </IonCardHeader>
                  <IonCardContent className="flex justify-center py-6">
                    {payload && (
                      <QRCodeSVG
                        value={JSON.stringify(payload)}
                        size={220}
                        bgColor="#ffffff"
                        fgColor="#000000"
                      />
                    )}
                  </IonCardContent>
                </IonCard>

                <div className="bg-card rounded-xl p-4">
                  <p className="text-text-tertiary text-sm mb-2">Code de substitution</p>
                  <div className="flex items-center justify-center gap-3">
                    <code className="text-2xl font-mono font-bold text-primary tracking-widest">
                      {generatedCode}
                    </code>
                    <IonButton size="small" fill="outline" onClick={handleCopyCode}>
                      {showCopy ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </IonButton>
                  </div>
                  <IonBadge color="medium" className="mt-3">
                    {targetRole} · {scopeType === "ORG" ? "Organisation" : "Groupe"}
                  </IonBadge>
                </div>

                <IonButton
                  expand="block"
                  fill="outline"
                  onClick={handleExportFile}
                  className="mt-3"
                >
                  <FileDown className="w-4 h-4 mr-2" />
                  Exporter en fichier JSON
                </IonButton>

                <IonButton expand="block" fill="outline" onClick={() => setStep("configure")}>
                  Créer une autre invitation
                </IonButton>
                <IonButton expand="block" color="medium" onClick={() => navigate(-1)}>
                  Retour
                </IonButton>

                <IonAlert
                  isOpen={showAlert}
                  onDidDismiss={() => setShowAlert(false)}
                  header="Invitation créée"
                  message={alertMessage}
                  buttons={["OK"]}
                />
              </div>
            )}
          </div>

          <BottomNav />
        </div>
      </IonContent>
    </IonPage>
  );
}
