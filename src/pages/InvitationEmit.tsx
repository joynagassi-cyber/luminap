/**
 * Invitation Emit v2 — Création et affichage d'une invitation (QR + code).
 *
 * Flow : sélection du rôle → portée (org/groupe) → génération → affichage QR + code.
 * Design : fond sombre, cartes sur surface, badges de statut, QR sur fond blanc fixe.
 * Tokens CSS `var(--*)`, zéro couleur en dur.
 *
 * Logique métier inchangée : création d'invitation, capacités/grants, portée
 * granulaire, export JSON, copie du code, payload v2.
 */

import { useState, useMemo, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  IonPage,
  IonContent,
  IonHeader,
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonItem,
  IonLabel,
  IonSelect,
  IonSelectOption,
  IonInput,
  IonButton,
  IonAlert,
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
  KeyRound,
} from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { useKeyboardAvoidance } from "@/hooks/useKeyboardAvoidance";
import { useMembers, useGroups, useCurrentUser } from "@/lib/dataLayer";
import {
  invitation,
  exportInvitationToFile,
} from "@/capabilities/invitation";
import { CAPABILITIES, capabilityGrantPayload } from "@/lib/capabilities";
import { getOrganizationId } from "@/lib/orgContext";
import { downloadBlob } from "@/lib/download";
import { notification } from "@/capabilities/notification";
import type { Grant } from "@/types/federation";
import TopHeader from "@/components/TopHeader";

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
  const keyboardHeight = useKeyboardAvoidance();
  const location = useLocation();
  const user = useCurrentUser();
  const { data: psMembers } = useMembers();
  const { data: psGroups } = useGroups();
  const members = psMembers ?? [];

  const orgParam = new URLSearchParams(location.search).get("org");
  const targetOrgId = orgParam ?? getOrganizationId();
  const groups = (psGroups ?? []).filter((g: any) => g.org_id === targetOrgId);

  const [step, setStep] = useState<"configure" | "qr">("configure");
  const [targetRole, setTargetRole] = useState("MEMBRE");
  const [scopeType, setScopeType] = useState<"ORG" | "GROUP">("ORG");
  const [targetGroupId, setTargetGroupId] = useState("");
  const [targetMemberId, setTargetMemberId] = useState("");
  const [expiresDays, setExpiresDays] = useState(7);
  const [maxUses, setMaxUses] = useState(1);
  const [targetScopeResource, setTargetScopeResource] = useState("");
  const [targetScopeId, setTargetScopeId] = useState("");
  const [selectedCapabilities, setSelectedCapabilities] = useState<string[]>([]);

  const toggleCapability = (id: string) =>
    setSelectedCapabilities((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    );

  const grantsPayload: Grant[] = useMemo(
    () =>
      selectedCapabilities.flatMap((capId) => {
        const cap = CAPABILITIES.find((c) => c.id === capId);
        if (!cap) return [];
        return capabilityGrantPayload(cap).map((p) => ({
          subjectType: "user" as const,
          subjectId: "",
          resource: p.resource,
          action: p.action,
          grantedBy: "",
          grantedAt: "",
          revokedAt: null,
        }));
      }),
    [selectedCapabilities],
  );

  const [generatedCode, setGeneratedCode] = useState("");
  const [generatedId, setGeneratedId] = useState("");
  const [showCopy, setShowCopy] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [createdAt, setCreatedAt] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);

  const handleCreate = async () => {
    if (busy) return;
    if (scopeType === "GROUP" && !targetGroupId) return;
    setBusy(true);
    try {
      const expiresAtMs = new Date(
        Date.now() + expiresDays * 24 * 60 * 60 * 1000,
      ).toISOString();

      const { id, code } = await invitation.createInvitation({
        orgId: targetOrgId,
        targetRole,
        targetScopeType: scopeType,
        targetGroupId: scopeType === "GROUP" ? targetGroupId : undefined,
        targetMemberId: targetMemberId || undefined,
        issuedBy: user.id,
        expiresAt: expiresAtMs,
        maxUses,
        targetScopeResource: targetScopeResource || undefined,
        targetScopeId: targetScopeId || undefined,
        grantsPayload: grantsPayload.length ? grantsPayload : undefined,
      });

      setCreatedAt(new Date().toISOString());
      setExpiresAt(expiresAtMs);
      setGeneratedCode(code);
      setGeneratedId(id);
      setStep("qr");
      setShowAlert(true);
      setAlertMessage(
        "Invitation créée et sauvegardée. L'appareil de l'invité devra scanner le QR ou entrer le code.",
      );

      notification
        .sendNotification({
          title: "Invitation émise",
          message: `Invitation ${code} pour le rôle ${targetRole}`,
          targetRole: "ADMIN",
          extraData: { invitationId: id, code, targetRole },
        })
        .catch(() => {});
    } catch (err: any) {
      setAlertMessage(err?.message ?? "Erreur lors de la création");
      setShowAlert(true);
    } finally {
      setBusy(false);
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(generatedCode).then(() => {
      setShowCopy(true);
      setTimeout(() => setShowCopy(false), 2000);
    });
  };

  const handleExportFile = async () => {
    try {
      const json = await exportInvitationToFile(generatedId);
      const blob = new Blob([json], { type: "application/json" });
      downloadBlob(blob, `lumina-invitation-${generatedCode}.json`);
    } catch (err: any) {
      setAlertMessage(err?.message ?? "Export impossible");
      setShowAlert(true);
    }
  };

  const payload = useMemo(() => {
    if (!generatedId || !createdAt || !expiresAt) return null;
    return {
      v: 2,
      orgId: targetOrgId,
      invitationId: generatedId,
      code: generatedCode,
      role: targetRole,
      scope: {
        type: scopeType,
        ...(scopeType === "GROUP" ? { groupId: targetGroupId } : {}),
        ...(targetScopeResource ? { resource: targetScopeResource } : {}),
        ...(targetScopeId ? { id: targetScopeId } : {}),
      },
      memberId: targetMemberId || null,
      grants: grantsPayload,
      tags: [],
      issuedAt: createdAt,
      expiresAt,
    };
  }, [
    generatedId,
    generatedCode,
    targetOrgId,
    targetRole,
    scopeType,
    targetGroupId,
    targetMemberId,
    targetScopeResource,
    targetScopeId,
    grantsPayload,
    createdAt,
    expiresAt,
  ]);

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/settings" />
          </IonButtons>
          <IonTitle>Créer une invitation</IonTitle>
          <IonButtons slot="end">
            <IonButton
              fill="clear"
              onClick={() => navigate("/invitation/manage")}
              aria-label="Gérer les invitations"
            >
              Gérer
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen className="bg-canvas">
        <h1 className="sr-only">Émettre une invitation</h1>
        <div data-screen-state="ready" className="min-h-dvh">
          <div
            className="max-w-lg mx-auto px-5 pb-safe-calc pt-safe-calc"
            style={{
              paddingBottom:
                keyboardHeight > 0 ? `${keyboardHeight}px` : undefined,
            }}
          >
            {step === "configure" ? (
              <div className="space-y-6">
                {/* Role selection */}
                <IonItem lines="none" className="bg-card rounded-xl">
                  <IonLabel className="text-sm text-text-secondary mb-1 block">
                    Rôle cible
                  </IonLabel>
                  <IonSelect
                    value={targetRole}
                    onIonChange={(e) => setTargetRole(e.detail.value!)}
                    placeholder="Sélectionner un rôle"
                    interface="popover"
                    aria-label="Sélectionner un rôle"
                    style={{
                      "--placeholder-color": "var(--text-tertiary)",
                    } as React.CSSProperties}
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
                  <IonLabel className="text-sm text-text-secondary mb-1 block">
                    Portée
                  </IonLabel>
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
                    <IonLabel className="text-sm text-text-secondary mb-1 block">
                      Groupe cible
                    </IonLabel>
                    <IonSelect
                      value={targetGroupId}
                      onIonChange={(e) => setTargetGroupId(e.detail.value!)}
                      aria-label="Groupe"
                      interface="popover"
                    >
                      <IonSelectOption value="">-- Aucun --</IonSelectOption>
                      {groups.map((g: any) => (
                        <IonSelectOption key={g.id} value={g.id}>
                          {g.name}
                        </IonSelectOption>
                      ))}
                    </IonSelect>
                  </IonItem>
                )}

                <IonItem lines="none" className="bg-card rounded-xl">
                  <IonLabel className="text-sm text-text-secondary mb-1 block">
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
                    aria-label="Membre"
                    interface="popover"
                  >
                    <IonSelectOption value="">-- Nouveau membre --</IonSelectOption>
                    {members.map((m: any) => (
                      <IonSelectOption key={m.id} value={m.id}>
                        {m.firstName} {m.lastName}
                      </IonSelectOption>
                    ))}
                  </IonSelect>
                </IonItem>

                {/* Capacités (autorisations) configurées par l'admin */}
                <div
                  className="rounded-xl p-5 mb-1"
                  style={{
                    backgroundColor: "var(--surface)",
                    border: "1px solid var(--border)",
                  }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <KeyRound
                      className="w-4 h-4"
                      style={{ color: "var(--accent-primary)" }}
                    />
                    <span className="text-sm text-text-secondary font-medium">
                      Autorisations supplémentaires
                    </span>
                  </div>
                  <p className="text-xs text-text-tertiary mb-3">
                    Le rôle cible porte déjà ses droits. Cochez des capacités
                    pour en accorder davantage à l'invité (appliquées à la
                    réclamation).
                  </p>
                  <div className="space-y-2">
                    {CAPABILITIES.map((cap) => {
                      const checked = selectedCapabilities.includes(cap.id);
                      return (
                        <label
                          key={cap.id}
                          className="flex items-start gap-3 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleCapability(cap.id)}
                            className="mt-0.5 rounded"
                            aria-label={cap.label}
                            style={{
                              accentColor: "var(--accent-primary)",
                            }}
                          />
                          <span>
                            <span className="text-sm text-text-primary block">
                              {cap.label}
                            </span>
                            <span className="text-xs text-text-tertiary block">
                              {cap.description}
                            </span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <IonItem lines="none" className="bg-card rounded-xl">
                  <IonLabel className="text-sm text-text-secondary mb-1 block">
                    Durée de validité
                  </IonLabel>
                  <IonInput
                    type="number"
                    value={String(expiresDays)}
                    onIonInput={(e) =>
                      setExpiresDays(Number(e.detail.value!))
                    }
                    slot="end"
                    className="w-16 text-center"
                  />
                  <IonLabel className="text-xs text-text-tertiary ml-1">
                    jours
                  </IonLabel>
                </IonItem>

                <IonItem lines="none" className="bg-card rounded-xl">
                  <IonLabel className="text-sm text-text-secondary mb-1 block">
                    Usages max
                  </IonLabel>
                  <IonInput
                    type="number"
                    value={String(maxUses)}
                    onIonInput={(e) => setMaxUses(Number(e.detail.value!))}
                    slot="end"
                    className="w-16 text-center"
                  />
                </IonItem>

                <IonButton
                  expand="block"
                  fill="solid"
                  onClick={handleCreate}
                  className="mt-5 text-sm font-semibold"
                  disabled={busy || (scopeType === "GROUP" && !targetGroupId)}
                >
                  <QrCode className="w-4 h-4 mr-2" />
                  {busy ? "Génération…" : "Générer l'invitation"}
                </IonButton>
              </div>
            ) : (
              <div className="space-y-6 text-center">
                <div className="bg-card rounded-xl p-6">
                  <p className="text-text-secondary text-xs uppercase tracking-wider font-semibold mb-2">
                    Scannez ce QR code
                  </p>
                  <p className="text-text-primary font-bold text-lg mb-4">
                    Invitation créée
                  </p>
                  {payload && (
                    <div style={{ backgroundColor: "#fff" }} className="inline-block">
                      <QRCodeSVG
                        value={JSON.stringify(payload)}
                        size={220}
                        bgColor="#ffffff"
                        fgColor="#000000"
                        level="M"
                      />
                    </div>
                  )}
                  <p className="text-text-tertiary text-sm mt-4">
                    Montrez ce code à la personne à inviter
                  </p>
                </div>

                <div className="bg-card rounded-xl p-4">
                  <p className="text-text-tertiary text-xs uppercase tracking-wider font-semibold mb-2">
                    Code de substitution
                  </p>
                  <div className="flex items-center justify-center gap-3">
                    <code className="text-xl font-mono font-bold text-text-primary tracking-widest">
                      {generatedCode}
                    </code>
                    <IonButton
                      size="small"
                      fill="outline"
                      onClick={handleCopyCode}
                      aria-label="Copier le code"
                    >
                      {showCopy ? <Check className="w-4 h-4" /> : (
                        <Copy className="w-4 h-4" />
                      )}
                    </IonButton>
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <span className="text-xs text-text-tertiary">
                      {targetRole}
                    </span>
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{
                        backgroundColor: "color-mix(in srgb, var(--accent-primary) 12%, transparent)",
                        color: "var(--accent-primary)",
                      }}
                    >
                      {scopeType === "ORG" ? "Organisation" : "Groupe"}
                    </span>
                  </div>
                </div>

                <IonButton
                  expand="block"
                  fill="outline"
                  onClick={handleExportFile}
                  className="mt-3 text-sm"
                >
                  <FileDown className="w-4 h-4 mr-2" />
                  Exporter en fichier JSON
                </IonButton>

                <div className="flex gap-2">
                  <IonButton
                    expand="block"
                    fill="outline"
                    onClick={() => setStep("configure")}
                    className="flex-1 text-sm"
                  >
                    Créer une autre invitation
                  </IonButton>
                  <IonButton
                    expand="block"
                    fill="outline"
                    onClick={() => navigate(-1)}
                    className="flex-1 text-sm"
                  >
                    Retour
                  </IonButton>
                </div>

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
