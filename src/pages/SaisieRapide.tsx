/**
 * Saisie Rapide — paiement rapide des cotisations d'un culte.
 *
 * Pour chaque membre NON_PAYE ou ABSENT du culte, l'administrateur
 * peut payer avec le montant par défaut (montantObligatoire) ou
 * saisir un montant supérieur (le surplus est comptabilisé comme don).
 *
 * Les membres qui ont de l'avance (montantEnAvance) : le paiement
 * consomme d'abord l'avance avant de créer une transaction.
 */
import { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
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
import { ArrowLeft, CheckCircle, Clock, Plus, X } from "lucide-react";
import TopHeader from "@/components/TopHeader";
import BottomNav from "@/components/BottomNav";
import {
  useEvents,
  useMembers,
  useCotisations,
  useTransactions,
  useCaisses,
  useCategories,
} from "@/lib/dataLayer";
import { useLocalStore } from "@/store/useLocalStore";
import { formatDate, formatCurrencyCompact } from "@/lib/utils";
import { isCulteVerrouille } from "@/lib/cotisation-logic";
import { policy } from "@/capabilities/policy";
import type { CotisationStatut } from "@/types";

export default function SaisieRapide() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: events } = useEvents();
  const { data: members } = useMembers();
  const { data: cotisations } = useCotisations();

  const markCotisationPaid = useLocalStore((s) => s.markCotisationPaid);

  const culte = useMemo(
    () => (events ?? []).find((e: any) => e.id === id),
    [events, id],
  );

  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [customMontants, setCustomMontants] = useState<Record<string, string>>({});

  const culteCots = useMemo(
    () =>
      (cotisations ?? [])
        .filter((c: any) => c.culte_id === id || c.culteId === id)
        .filter((c: any) => c.statut === "NON_PAYE" || c.statut === "ABSENT"),
    [cotisations, id],
  );

  const now = new Date().toISOString();

  const handlePay = async (cot: any, montantPaye: number) => {
    if (!id) return;
    const policyCheck = policy.cotisation.validateAmount(montantPaye);
    if (!policyCheck.ok) {
      setError(policyCheck.message ?? "Paiement refusé");
      return;
    }
    const memberId = cot.membre_id ?? cot.membreId;
    setBusy(memberId);
    setError(null);
    try {
      await markCotisationPaid(
        cot.id,
        montantPaye,
        now,
      );
      // L'UI se rafraîchit via les hooks useCotisations / useMembers
    } catch (e: any) {
      setError(e?.message ?? "Paiement refusé");
    } finally {
      setBusy(null);
    }
  };

  const handleAbsent = async (cot: any) => {
    const memberId = cot.membre_id ?? cot.membreId;
    setBusy(memberId);
    setError(null);
    try {
      const store = useLocalStore.getState();
      const result = store.markCotisationsAbsent(id!, [memberId]);
      // markCotisationsAbsent dans le store est asynchrone
      await result;
    } catch (e: any) {
      setError(e?.message ?? "Absence refusée");
    } finally {
      setBusy(null);
    }
  };

  if (!culte) {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonButtons slot="start">
              <IonBackButton defaultHref="/cotisations" />
            </IonButtons>
            <IonTitle>Saisie rapide</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent>
          <div className="p-4">
            <p className="text-text-tertiary">
              Culte introuvable.
            </p>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  const culteDate = culte.start_date ?? culte.startDate;
  const isLocked = culteDate ? isCulteVerrouille(culteDate) : false;

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/cotisations" />
          </IonButtons>
          <IonTitle>Saisie rapide — {culte.name}</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="bg-canvas">
        <div className="min-h-screen bg-canvas">
          <TopHeader title="Saisie rapide" />
          <div className="max-w-lg mx-auto px-5 pb-32 pt-24">
            {culteDate && (
              <p className="text-text-tertiary text-xs mb-3">
                Culte du {formatDate(culteDate)}
                {isLocked && (
                  <span className="ml-2 text-[#EF4444]">
                    (verrouillé : +30 jours)
                  </span>
                )}
              </p>
            )}

            {error && (
              <div
                className="mb-3 p-3 rounded-xl text-sm"
                style={{
                  backgroundColor: "#E5133220",
                  border: "1px solid #E5133240",
                  color: "#ff8fa3",
                }}
              >
                {error}
              </div>
            )}

            {culteCots.length === 0 ? (
              <div className="text-center py-10">
                <CheckCircle className="w-12 h-12 mx-auto mb-3 text-[#10B981]" />
                <p className="text-text-primary font-medium">
                  Toutes les cotisations sont traitées.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {culteCots.map((cot: any) => {
                  const memberId = cot.membre_id ?? cot.membreId;
                  const member = (members ?? []).find((m: any) => m.id === memberId);
                  const name = member
                    ? `${(member as any).last_name ?? ""} ${(member as any).first_name ?? ""}`.trim() || "Inconnu"
                    : "Inconnu";
                  const montantOblig =
                    cot.montantObligatoire ?? cot.montant_obligatoire ?? 0;
                  const customVal =
                    customMontants[cot.id] ?? String(montantOblig);
                  const customCents = Math.round(
                    parseFloat(customVal) * 100,
                  );
                  const useCustom =
                    Number.isFinite(customCents) &&
                    customCents > 0 &&
                    customCents !== montantOblig;

                  return (
                    <div
                      key={cot.id}
                      className="rounded-xl p-4"
                      style={{
                        backgroundColor: "#212121",
                        border: "1px solid #282828",
                      }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-text-primary text-sm font-medium">
                          {name}
                        </span>
                        <span className="text-text-tertiary text-xs">
                          {(montantOblig / 100).toFixed(0)} F
                        </span>
                      </div>

                      {/* Champ montant personnalisable */}
                      <div className="flex items-center gap-2 mb-3">
                        <IonInput
                          type="number"
                          value={customMontants[cot.id] ?? String(montantOblig / 100)}
                          onIonChange={(e: any) =>
                            setCustomMontants((prev) => ({
                              ...prev,
                              [cot.id]: e.detail.value,
                            }))
                          }
                          placeholder="Montant (F)"
                          min="0"
                          style={{
                            backgroundColor: "#181818",
                            border: "1px solid #282828",
                          }}
                        />
                        {useCustom && (
                          <span
                            className="text-[10px] px-1.5 py-0.5 rounded-full"
                            style={{
                              backgroundColor: "#3B82F620",
                              color: "#3B82F6",
                            }}
                          >
                            Surplus: {formatCurrencyCompact(customCents - montantOblig)} F
                          </span>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <IonButton
                          size="small"
                          fill="solid"
                          disabled={busy === memberId || isLocked}
                          onClick={() =>
                            handlePay(
                              cot,
                              useCustom ? customCents : montantOblig,
                            )
                          }
                        >
                          <CheckCircle className="w-3 h-3 mr-1" /> Payé
                        </IonButton>
                        <IonButton
                          size="small"
                          fill="outline"
                          color="medium"
                          disabled={busy === memberId}
                          onClick={() => handleAbsent(cot)}
                        >
                          <Clock className="w-3 h-3 mr-1" /> Absent
                        </IonButton>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="mt-4 flex gap-3">
              <IonButton
                fill="clear"
                onClick={() => navigate(`/culte/${id}`)}
                className="!min-height:auto !p-0"
              >
                <ArrowLeft className="w-4 h-4 mr-1" /> Détail du culte
              </IonButton>
              <IonButton
                fill="clear"
                onClick={() => navigate("/cotisations")}
                className="!min-height:auto !p-0"
              >
                Retour aux cultes
              </IonButton>
            </div>
          </div>
          <BottomNav />
        </div>
      </IonContent>
    </IonPage>
  );
}
