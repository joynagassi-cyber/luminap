/**
 * GroupCotisation — gère la cotisation propre d'un groupe.
 *
 * Chaque groupe peut créer sa propre cotisation (indépendante de la
 * cotisation principale de l'organisation) avec son propre montant,
 * ses propres membres (via group_memberships) et son suivi individuel.
 *
 * Règle métier : le montant est TOUJOURS choisi par l'administrateur —
 * aucun montant n'est imposé par défaut.
 */
import { useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import {
  useGroups,
  useGroupMemberships,
  useMembers,
  useCotisations,
  useEvents,
  useCurrentUser,
} from "@/lib/dataLayer";
import {
  createCotisationSession,
  collectCotisation,
  markCotisationAbsent,
} from "@/capabilities/cotisation";
import { policy } from "@/capabilities/policy";
import { getOrganizationId } from "@/lib/orgContext";
import { formatCurrencyCompact, formatDate } from "@/lib/utils";
import { Plus, Check, Clock, X, Coins } from "lucide-react";
import {
  IonPage,
  IonHeader,
  IonContent,
  IonTitle,
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonButton,
  IonInput,
} from "@ionic/react";

export default function GroupCotisation() {
  const { id } = useParams<{ id: string }>();
  const user = useCurrentUser();
  const orgId = getOrganizationId();

  const { data: groups } = useGroups();
  const { data: memberships } = useGroupMemberships();
  const { data: members } = useMembers();
  const { data: events } = useEvents();
  const { data: cotisations } = useCotisations();

  const group = useMemo(
    () => (groups ?? []).find((g: any) => g.id === id),
    [groups, id],
  );

  const groupMembers = useMemo(() => {
    const ids = (memberships ?? [])
      .filter((m: any) => m.group_id === id || m.groupId === id)
      .map((m: any) => m.member_id ?? m.memberId);
    return (members ?? []).filter((m: any) => ids.includes(m.id));
  }, [memberships, members, id]);

  // Sessions créées pour ce groupe (events.type=CULTE où budget_items
  // contient source: "group" et groupId = id).
  const groupSessions = useMemo(() => {
    return (events ?? [])
      .filter((e: any) => e.type === "CULTE")
      .filter((e: any) => {
        try {
          const bi = e.budget_items ? JSON.parse(e.budget_items) : [];
          return bi.some((b: any) => b.source === "group" && b.groupId === id);
        } catch {
          return false;
        }
      });
  }, [events, id]);

  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  // Form fields
  const [sessionName, setSessionName] = useState("");
  const [sessionDate, setSessionDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [sessionMontant, setSessionMontant] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const selected = groupSessions.find((s: any) => s.id === selectedSession);
  const sessionCots = useMemo(
    () =>
      (cotisations ?? []).filter(
        (c: any) =>
          c.culte_id === selected?.id || c.culteId === selected?.id,
      ),
    [cotisations, selected],
  );

  const handleCreateSession = async () => {
    setFormError(null);
    setBusy(true);
    const fcfa = parseFloat(sessionMontant);
    if (!Number.isFinite(fcfa) || fcfa <= 0) {
      setFormError("Le montant de cotisation est requis (en FCFA).");
      setBusy(false);
      return;
    }
    const montantCents = Math.round(fcfa * 100);
    const amountCheck = policy.cotisation.validateAmount(montantCents);
    if (!amountCheck.ok) {
      setFormError(amountCheck.message ?? "Montant invalide");
      setBusy(false);
      return;
    }
    try {
      const result = await createCotisationSession(
        { type: "GROUP", groupId: id, label: group?.name ?? "Groupe" },
        {
          name: sessionName.trim() || "Cotisation groupe",
          startDate: sessionDate,
          montantCotisationCents: montantCents,
          orgId,
          actorId: user?.id ?? "local-user",
        },
      );
      setSelectedSession(result.event.id);
      setShowForm(false);
      setSessionName("");
      setSessionMontant("");
    } catch (e: any) {
      setFormError(e?.message ?? "Erreur lors de la création");
    } finally {
      setBusy(false);
    }
  };

  const handlePay = async (cot: any, montantCents: number) => {
    const amountCheck = policy.cotisation.validateAmount(montantCents);
    if (!amountCheck.ok) {
      setFormError(amountCheck.message ?? "Paiement refusé");
      return;
    }
    setBusy(true);
    setFormError(null);
    try {
      await collectCotisation(
        cot.id,
        montantCents,
        new Date().toISOString(),
        user?.id ?? "local-user",
      );
      await new Promise((r) => setTimeout(r, 500));
    } catch (e: any) {
      setFormError(e?.message ?? "Paiement refusé");
    } finally {
      setBusy(false);
    }
  };

  const handleAbsent = async (cot: any) => {
    setBusy(true);
    setFormError(null);
    try {
      await markCotisationAbsent(cot.id, user?.id ?? "local-user");
      await new Promise((r) => setTimeout(r, 500));
    } catch (e: any) {
      setFormError(e?.message ?? "Erreur");
    } finally {
      setBusy(false);
    }
  };

  const stats = useMemo(() => {
    const cots = sessionCots;
    return {
      total: cots.length,
      paye: cots.filter(
        (c: any) => c.statut === "PAYE" || c.statut === "EN_AVANCE",
      ).length,
      nonPaye: cots.filter((c: any) => c.statut === "NON_PAYE").length,
      totalCollecte: cots.reduce(
        (s: number, c: any) => s + (c.montantPaye ?? 0),
        0,
      ),
      attendu: cots.reduce(
        (s: number, c: any) => s + (c.montantObligatoire ?? 0),
        0,
      ),
    };
  }, [sessionCots]);

  if (!group) {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonButtons slot="start">
              <IonBackButton defaultHref={`/groups/${id}`} />
            </IonButtons>
            <IonTitle>Cotisation groupe</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent className="bg-canvas">
          <div className="p-5">
            <p className="text-text-tertiary">Groupe introuvable.</p>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref={`/groups/${id}`} />
          </IonButtons>
          <IonTitle>Cotisation — {group.name}</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="bg-canvas" fullscreen>
        <div className="max-w-lg mx-auto px-5 pb-32 pt-4">
          <p className="text-text-tertiary text-xs mb-4">
            {groupMembers.length} membre(s) dans ce groupe
          </p>

          {formError && (
            <div
              className="mb-4 p-3 rounded-xl text-sm"
              style={{ backgroundColor: "#E5133220", color: "#ff8fa3" }}
            >
              {formError}
            </div>
          )}

          {/* Sessions existantes */}
          {groupSessions.length > 0 && (
            <div className="mb-5">
              <p className="text-text-primary text-xs font-semibold mb-2 uppercase tracking-wide">
                Sessions de cotisation
              </p>
              <div className="space-y-2">
                {groupSessions.map((s: any) => {
                  const sCots = (cotisations ?? []).filter(
                    (c: any) => c.culte_id === s.id,
                  );
                  const sPaid = sCots.filter(
                    (c: any) =>
                      c.statut === "PAYE" || c.statut === "EN_AVANCE",
                  ).length;
                  const isActive = selectedSession === s.id;
                  return (
                    <button
                      key={s.id}
                      onClick={() =>
                        setSelectedSession(isActive ? null : s.id)
                      }
                      className="w-full flex items-center justify-between p-3.5 rounded-xl transition-all active:scale-95 text-left"
                      style={{
                        backgroundColor: isActive ? "#2a2a2a" : "#212121",
                        border: `1px solid ${isActive ? "var(--accent-primary)" : "#282828"}`,
                      }}
                    >
                      <div>
                        <p className="text-text-primary text-sm font-medium">
                          {s.name}
                        </p>
                        <p className="text-text-tertiary text-xs">
                          {formatDate(s.start_date ?? s.startDate)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-text-primary text-xs">
                          {sPaid}/{sCots.length} payés
                        </p>
                        <p className="text-text-tertiary text-xs">
                          {(
                            sCots.reduce(
                              (t: number, c: any) => t + (c.montantPaye ?? 0),
                              0,
                            ) / 100
                          ).toFixed(0)}{" "}
                          F
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Détail de la session sélectionnée */}
          {selected && (
            <div className="mb-5">
              <div
                className="rounded-xl p-4 mb-3"
                style={{ backgroundColor: "#212121" }}
              >
                <div className="flex items-center justify-between mb-3">
                  <p className="text-text-primary text-sm font-medium">
                    {selected.name}
                  </p>
                  <span
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: "#3B82F620", color: "#3B82F6" }}
                  >
                    {stats.paye}/{stats.total} payés
                  </span>
                </div>
                <div className="flex gap-4 text-xs">
                  <div>
                    <p className="text-text-tertiary">Collecté</p>
                    <p className="text-[#1DB954] font-bold text-sm">
                      {formatCurrencyCompact(stats.totalCollecte)} F
                    </p>
                  </div>
                  <div>
                    <p className="text-text-tertiary">Attendu</p>
                    <p className="text-text-primary font-bold text-sm">
                      {formatCurrencyCompact(stats.attendu)} F
                    </p>
                  </div>
                  <div>
                    <p className="text-text-tertiary">En retard</p>
                    <p className="text-[#FFB800] font-bold text-sm">
                      {stats.nonPaye}
                    </p>
                  </div>
                </div>
              </div>

              {sessionCots.map((cot: any) => {
                const memberId = cot.membre_id ?? cot.membreId;
                const member = (members ?? []).find((m: any) => m.id === memberId);
                const name = member
                  ? `${member.last_name ?? member.lastName ?? ""} ${member.first_name ?? member.firstName ?? ""}`.trim() ||
                    "Inconnu"
                  : "Inconnu";
                const oblig = cot.montantObligatoire ?? cot.montant_obligatoire ?? 0;
                const isPaid =
                  cot.statut === "PAYE" || cot.statut === "EN_AVANCE";
                const isAbsent = cot.statut === "ABSENT";

                return (
                  <div
                    key={cot.id}
                    className="rounded-xl p-3.5 mb-2 flex items-center gap-3"
                    style={{
                      backgroundColor: isPaid
                        ? "#1DB95410"
                        : isAbsent
                          ? "#80808010"
                          : "#212121",
                      border: `1px solid ${isPaid ? "#1DB95430" : isAbsent ? "#80808030" : "#282828"}`,
                    }}
                  >
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{
                        backgroundColor: isPaid ? "#1DB95420" : "#2a2a2a",
                      }}
                    >
                      <span
                        className="text-xs font-bold"
                        style={{
                          color: isPaid ? "#1DB954" : "var(--accent-primary)",
                        }}
                      >
                        {name.charAt(0)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-text-primary text-sm font-medium truncate">
                        {name}
                      </p>
                      <p className="text-text-tertiary text-xs">
                        {(oblig / 100).toFixed(0)} F
                        {isPaid &&
                          ` · payé ${((cot.montantPaye ?? 0) / 100).toFixed(0)} F`}
                        {isAbsent && " · absent"}
                      </p>
                    </div>
                    {!isPaid && !isAbsent && (
                      <div className="flex gap-1">
                        <IonButton
                          size="small"
                          fill="solid"
                          style={{ backgroundColor: "#1DB954" }}
                          disabled={busy}
                          onClick={() => handlePay(cot, oblig)}
                        >
                          Payé
                        </IonButton>
                        <IonButton
                          size="small"
                          fill="outline"
                          color="medium"
                          disabled={busy}
                          onClick={() => handleAbsent(cot)}
                        >
                          Absent
                        </IonButton>
                      </div>
                    )}
                    {isPaid && <Check className="w-4 h-4 text-[#1DB954]" />}
                    {isAbsent && (
                      <Clock className="w-4 h-4 text-text-tertiary" />
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Bouton nouvelle session */}
          {!showForm ? (
            <IonButton
              expand="block"
              onClick={() => setShowForm(true)}
              style={{ backgroundColor: "var(--accent-primary)" }}
            >
              <Plus className="w-4 h-4 mr-1" /> Nouvelle cotisation
            </IonButton>
          ) : (
            <div
              className="rounded-xl p-4 space-y-3"
              style={{
                backgroundColor: "#212121",
                border: "1px solid var(--accent-primary)",
              }}
            >
              <div className="flex items-center justify-between">
                <p className="text-text-primary text-sm font-medium">
                  Nouvelle cotisation — {group.name}
                </p>
                <button
                  onClick={() => setShowForm(false)}
                  className="text-text-tertiary"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <IonInput
                type="text"
                value={sessionName}
                onIonChange={(e: any) => setSessionName(e.detail.value ?? "")}
                placeholder="Nom de la session (ex: Cagnotte janvier)"
                style={{
                  backgroundColor: "#181818",
                  border: "1px solid #282828",
                }}
              />

              <IonInput
                type="date"
                value={sessionDate}
                onIonChange={(e: any) => setSessionDate(e.detail.value ?? "")}
                style={{
                  backgroundColor: "#181818",
                  border: "1px solid #282828",
                }}
              />

              <div>
                <label className="text-text-tertiary text-xs mb-1.5 block">
                  Montant obligatoire (FCFA) *
                </label>
                <IonInput
                  type="number"
                  value={sessionMontant}
                  onIonChange={(e: any) =>
                    setSessionMontant(e.detail.value ?? "")
                  }
                  placeholder="Ex: 2000"
                  min="0"
                  style={{
                    backgroundColor: "#181818",
                    border: "1px solid #282828",
                  }}
                />
                <p className="text-text-tertiary text-xs mt-1">
                  {groupMembers.length} membre(s) actif(s) — une cotisation
                  sera créée pour chacun
                </p>
              </div>

              <IonButton
                expand="block"
                onClick={handleCreateSession}
                disabled={busy}
                style={{ backgroundColor: "var(--accent-primary)" }}
              >
                {busy ? "Création..." : "Créer la session"}
              </IonButton>
            </div>
          )}

          <p className="text-text-tertiary text-xs mt-4">
            <Coins className="w-3 h-3 inline mr-1" />
            Cotisations propres au groupe — le montant reste choisi par vous.
          </p>
        </div>
      </IonContent>
    </IonPage>
  );
}
