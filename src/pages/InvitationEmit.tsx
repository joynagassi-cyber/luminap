/**
 * Invitation Emit Page — create and display invitation QR/code
 *
 * Flow: select role → select scope (org/group) → generate → display QR + code
 */

import { useState, useMemo, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
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
  KeyRound,
} from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { useKeyboardAvoidance } from "@/hooks/useKeyboardAvoidance";
import { useMembers, useGroups } from "@/lib/dataLayer";
import { useCurrentUser } from "@/lib/dataLayer";
import {
  invitation,
  exportInvitationToFile,
} from "@/capabilities/invitation";
import { CAPABILITIES, capabilityGrantPayload } from "@/lib/capabilities";
import { getOrganizationId } from "@/lib/orgContext";
import { downloadBlob } from "@/lib/download";
import { notification } from "@/capabilities/notification";
import type { Grant } from "@/types/federation";
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
  const keyboardHeight = useKeyboardAvoidance();
  const location = useLocation();
  const user = useCurrentUser();
  const { data: psMembers } = useMembers();
  const { data: psGroups } = useGroups();
  const members = psMembers ?? [];

  // Organisation ciblée : `?org=<id>` (ex. venue de la page Fédération après
  // avoir créé une organisation opérationnelle) ; sinon l'organisation courante.
  // DOIT être déclaré AVANT `groups` (line ci-dessous) — sinon TDZ.
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
  // B.3 — scope granulaire : l'admin peut préciser une ressource cible libre
  // (ex. "event", "report") + son id, plutôt que de se limiter à ORG|GROUP.
  const [targetScopeResource, setTargetScopeResource] = useState("");
  const [targetScopeId, setTargetScopeId] = useState("");
  // Capacités supplémentaires accordées par l'invitation (grants). Le rôle
  // cible porte déjà ses permissions ; ces capacités AJOUTENT des droits
  // précis, matérialisés côté serveur par `settle_invitation_claim`
  // (insertion dans `grants`, subject_type='user'). Sans ce sélecteur, le
  // champ était figé à `[]` : l'admin ne pouvait pas « configurer les
  // autorisations » transportées par le code/QR (demande produit).
  const [selectedCapabilities, setSelectedCapabilities] = useState<string[]>([]);

  const toggleCapability = (id: string) =>
    setSelectedCapabilities((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    );

  /** Grants transportés par l'invitation, dérivés des capacités cochées. */
  const grantsPayload: Grant[] = useMemo(
    () =>
      selectedCapabilities.flatMap((capId) => {
        const cap = CAPABILITIES.find((c) => c.id === capId);
        if (!cap) return [];
        return capabilityGrantPayload(cap).map((p) => ({
          subjectType: "user" as const,
          subjectId: "", // résolu côté serveur au claim (auth.uid())
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
  // Timestamps de l'invitation courante — conservés pour le payload affiché
  // (le QR recalcule sinon expiresAt au render, et le claimant peut être
  // rejeté côté serveur alors que le scan local n'était pas expiré).
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

      // Le code affiché DOIT être celui persisté : on le récupère de
      // `createInvitation` au lieu de régénérer un code aléatoire (qui ne
      // correspondait à aucune invitation en base).
      const { id, code } = await invitation.createInvitation({
        orgId: targetOrgId,
        targetRole,
        targetScopeType: scopeType,
        targetGroupId: scopeType === "GROUP" ? targetGroupId : undefined,
        targetMemberId: targetMemberId || undefined,
        issuedBy: user.id,
        expiresAt: expiresAtMs,
        maxUses,
        // B.3 — scope granulaire (Vague 3) : le trigger le matérialise au claim
        targetScopeResource: targetScopeResource || undefined,
        targetScopeId: targetScopeId || undefined,
        // Capacités configurées par l'admin : transportées dans le QR/fichier
        // ET persistées dans `grants_payload` → appliquées au claim.
        grantsPayload: grantsPayload.length ? grantsPayload : undefined,
      });

      setCreatedAt(new Date().toISOString());
      setExpiresAt(expiresAtMs);
      setGeneratedCode(code);
      setGeneratedId(id);
      setStep("qr");
      setShowAlert(true);
      setAlertMessage("Invitation créée et sauvegardée. L'appareil de l'invité devra scanner le QR ou entrer le code.");

      // Notify the inviter's org (in-app UI + OneSignal tags for server targeting)
      notification.sendNotification({
        title: "Invitation émise",
        message: `Invitation ${code} pour le rôle ${targetRole}`,
        targetRole: "ADMIN",
        extraData: { invitationId: id, code, targetRole },
      }).catch(() => {});
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

  /** 4ᵉ transport : exporter l'invitation en fichier JSON (transfert local). */
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
        // B.3 — scope granulaire transporté (harmonisé sur AccessScope.id) :
        // sans ces champs, une invitation scopée (event/report/ressource libre)
        // perdait sa cible côté QR et le claim retombait sur ORG.
        ...(targetScopeResource ? { resource: targetScopeResource } : {}),
        ...(targetScopeId ? { id: targetScopeId } : {}),
      },
      memberId: targetMemberId || null,
      // Capacités configurées par l'admin, transportées dans le QR/fichier
      // (le claim les matérialise côté serveur).
      grants: grantsPayload,
      tags: [],
      issuedAt: createdAt,
      // Réutilise la valeur PERSISTÉE (pas recalculée au render) — sinon le
      // claimant peut être rejeté côté serveur alors que le scan local
      // n'était pas expiré (le trigger compare contre invitations.expires_at).
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
            <IonButton fill="clear" onClick={() => navigate("/invitation/manage")}>
              Gérer
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
      <h1 className="sr-only">Émettre une invitation</h1>
        {/* M9 — TopHeader supprimé : la barre IonHeader (back + « Gérer »)
            porte déjà le contexte ; un 2ᵉ chrome 64px en double coquin. */}
        <div data-screen-state="ready" className="min-h-dvh">
          <div
            className="max-w-lg mx-auto px-5 pb-safe-calc pt-safe-calc"
            style={{
              paddingBottom: keyboardHeight > 0 ? `${keyboardHeight}px` : undefined,
            }}
          >
            {step === "configure" ? (
              <div className="space-y-6">
                {/* Role selection */}
                <IonItem lines="none" className="bg-card rounded-xl">
                  <IonLabel className="text-sm text-text-secondary mb-1">Rôle cible</IonLabel>
                  <IonSelect
                    value={targetRole}
                    onIonChange={(e) => setTargetRole(e.detail.value!)}
                    placeholder="Sélectionner un rôle"
                    interface="popover"
                    aria-label="Sélectionner un rôle"
                    style={{ "--placeholder-color": "var(--text-tertiary)" } as React.CSSProperties}
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
                      aria-label="Groupe"
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
                    aria-label="Membre"
                  >
                    <IonSelectOption value="">-- Nouveau membre --</IonSelectOption>
                    {members.map((m: any) => (
                      <IonSelectOption key={m.id} value={m.id}>
                        {m.firstName} {m.lastName}
                      </IonSelectOption>
                    ))}
                  </IonSelect>
                </IonItem>

                {/* Capacités (autorisations) configurées par l'admin :
                    transportées par le code/QR et appliquées au claim. */}
                <div
                  className="rounded-xl p-4"
                  style={{
                    backgroundColor: "var(--surface)",
                    border: "1px solid var(--border)",
                  }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <KeyRound className="w-4 h-4" style={{ color: "var(--accent-primary)" }} />
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
                            className="mt-1"
                            aria-label={cap.label}
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
                  <IonLabel>Durée de validité</IonLabel>
                  <IonInput
                    type="number"
                    value={String(expiresDays)}
                    onIonInput={(e) => setExpiresDays(Number(e.detail.value!))}
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
                    onIonInput={(e) => setMaxUses(Number(e.detail.value!))}
                    slot="end"
                    className="w-16 text-center"
                  />
                </IonItem>

                <IonButton
                  expand="block"
                  color="primary"
                  onClick={handleCreate}
                  className="mt-4"
                  disabled={busy || (scopeType === "GROUP" && !targetGroupId)}
                >
                  <QrCode className="w-4 h-4 mr-2" />
                  {busy ? "Génération..." : "Générer l'invitation"}
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
                      /* fond blanc fixe + modules noirs : vérité de
                         scannage. Un `bgColor` lié au thème
                         (`var(--text-primary)`) rendait le QR noir-sur-noir
                         en thème clair (#1a1a1a) → illisible par la caméra.
                         Contraste et polarité FIXES, indépendants du thème. */
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
                  </IonCardContent>
                </IonCard>

                <div className="bg-card rounded-xl p-4">
                  <p className="text-text-tertiary text-sm mb-2">Code de substitution</p>
                  <div className="flex items-center justify-center gap-3">
                    <code className="text-2xl font-mono font-bold text-primary tracking-widest">
                      {generatedCode}
                    </code>
                    <IonButton size="small" fill="outline" onClick={handleCopyCode} aria-label="Copier le code">
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
