/**
 * TransferOwnership — « Transférer la propriété » (PR14, route
 * `/admin/transfer-ownership`).
 *
 * Parcours guidé en 4 temps pour passer l'organisation à un autre
 * administrateur sans jamais la laisser orpheline :
 *   1. choisir la cible (membre ACTIF dont le rôle peut gérer les accès) ;
 *   2. revue des conséquences (avertissements FR) ;
 *   3. confirmation par saisie du nom de la cible (type-to-confirm) ;
 *   4. résultat (succès / étape fautive).
 *
 * La DÉCISION et l'ORDRE des étapes vivent dans `src/lib/ownershipTransfer.ts`
 * (pur, testable) ; cette page ne fait que les afficher et déclencher
 * l'application via les helpers d'écriture existants.
 *
 * Accès réservé aux administrateurs : gate canonique `admin:roles`
 * (`useCanAccessMulti`), la même décision unique que `/admin/roles`.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { IonPage, IonContent } from "@ionic/react";
import { ArrowLeft, Crown, Shield, TriangleAlert } from "lucide-react";

import TopHeader from "@/components/TopHeader";
import BottomNav from "@/components/BottomNav";
import EmptyState from "@/components/EmptyState";
import { ListSkeleton } from "@/components/Skeleton";
import { ScreenState } from "@/components/RouteStates";
import { useCurrentUser, isPowerSyncReadyNow } from "@/lib/dataLayer";
import { getOrganizationId } from "@/lib/orgContext";
import { useCanAccessMulti } from "@/hooks/useCanAccessMulti";
import { captureClientError } from "@/lib/clientErrors";
import { writeAudit } from "@/lib/audit";
import { showError, showSuccess } from "@/utils/toast";
import {
  applyOwnershipTransfer,
  assertTransferAllowed,
  candidateLabel,
  defaultTransferPorts,
  loadOwnershipCandidates,
  loadOwnerOfRecord,
  OwnershipTransferError,
  planKeepsAnAdmin,
  type TransferCandidate,
  type TransferPlan,
} from "@/lib/ownershipTransfer";
import type { Role } from "@/types";

type Step = "choose" | "review" | "confirm" | "result";

interface TransferOutcome {
  ok: boolean;
  message: string;
}

export default function TransferOwnership() {
  const user = useCurrentUser();
  const orgId = getOrganizationId() || user?.org?.id || "";
  const { allowed: isAdmin } = useCanAccessMulti(
    user?.id,
    orgId,
    "admin",
    "roles",
    undefined,
    user?.role as Role | undefined,
  );

  const [candidates, setCandidates] = useState<TransferCandidate[]>([]);
  const [candidatesLoaded, setCandidatesLoaded] = useState(false);
  const [ownerOfRecord, setOwnerOfRecord] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [step, setStep] = useState<Step>("choose");
  const [confirmText, setConfirmText] = useState("");
  const [applying, setApplying] = useState(false);
  const [outcome, setOutcome] = useState<TransferOutcome | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [rows, owner] = await Promise.all([
          loadOwnershipCandidates(orgId),
          loadOwnerOfRecord(orgId),
        ]);
        if (!cancelled) {
          setCandidates(rows);
          setOwnerOfRecord(owner);
        }
      } catch (err) {
        captureClientError(err, {
          message: "Chargement des membres pour le transfert de propriété échoué",
          route: "/admin/transfer-ownership",
        });
        if (!cancelled) setCandidates([]);
      } finally {
        // Drapeau posé dans `finally` : l'état vide n'est annoncé qu'une fois
        // la lecture terminée, même si elle échoue (R52).
        if (!cancelled) setCandidatesLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [orgId]);

  const eligible = useMemo(
    () => candidates.filter((c) => c.id !== user?.id),
    [candidates, user?.id],
  );

  const selected = candidates.find((c) => c.id === selectedId) ?? null;

  const plan: TransferPlan | null = useMemo(() => {
    if (!selected) return null;
    const result = assertTransferAllowedSafe(
      {
        orgId,
        currentOwnerId: user?.id ?? "",
        currentOwnerRole: user?.role ?? null,
        targetId: selected.id,
      },
      candidates,
    );
    return result;
  }, [selected, candidates, orgId, user?.id, user?.role]);

  const confirmTarget = selected ? candidateLabel(selected) : "";
  const canConfirm =
    confirmText.trim() === confirmTarget && confirmTarget.trim().length > 0;

  const handleApply = useCallback(async () => {
    if (!plan || applying) return;
    setApplying(true);
    try {
      const result = await applyOwnershipTransfer(
        plan,
        defaultTransferPorts(orgId),
      );
      if (result.ok) {
        await writeAudit({
          orgId,
          transactionId: null,
          userId: user?.id ?? "",
          actorRoleAtTime: (user?.role as string) ?? null,
          action: "UPDATE",
          entityType: "Organization",
          entityId: orgId,
          beforeState: { ownerProfileId: plan.previousOwnerId },
          afterState: { ownerProfileId: plan.targetId },
          comment: `Transfert de propriété vers ${confirmTarget}`,
        });
        setOutcome({
          ok: true,
          message: `La propriété a été transférée à ${confirmTarget}.`,
        });
        showSuccess("Propriété transférée.");
      } else {
        setOutcome({
          ok: false,
          message: (result as { message: string }).message,
        });
        showError("Le transfert n'a pas abouti.");
      }
      setStep("result");
    } catch (err) {
      captureClientError(err, {
        message: "Transfert de propriété échoué",
        route: "/admin/transfer-ownership",
      });
      const message =
        err instanceof OwnershipTransferError
          ? err.message
          : "Le transfert n'a pas pu être appliqué. Réessayez.";
      setOutcome({ ok: false, message });
      setStep("result");
    } finally {
      setApplying(false);
    }
  }, [plan, applying, orgId, user?.id, user?.role, confirmTarget]);

  if (!isAdmin) {
    return (
      <IonPage>
        <IonContent className="bg-canvas">
          <div className="min-h-dvh">
            <TopHeader title="Transférer la propriété" />
            <div className="max-w-lg mx-auto px-5 pb-safe-calc pt-safe-calc">
              <ScreenState state="forbidden">
                <div
                  className="p-6 rounded-xl text-center"
                  style={{ backgroundColor: "var(--surface)" }}
                >
                  <Shield className="w-10 h-10 text-text-tertiary mx-auto mb-3" />
                  <p className="text-text-primary font-semibold mb-1">
                    Accès réservé aux administrateurs
                  </p>
                  <p className="text-text-tertiary text-sm">
                    Seul un administrateur de cette organisation peut transférer
                    la propriété.
                  </p>
                </div>
              </ScreenState>
            </div>
            <BottomNav />
          </div>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <IonContent className="bg-canvas">
        <div className="min-h-dvh">
          <TopHeader title="Transférer la propriété" />
          <div className="max-w-lg mx-auto px-5 pb-safe-calc pt-safe-calc">
            <button
              type="button"
              onClick={() => setStep("choose")}
              className="flex items-center gap-2 text-text-secondary text-sm mb-4 active:opacity-70"
              style={{ background: "none", border: "none", height: 44 }}
              aria-label="Revenir au choix de la personne"
            >
              <ArrowLeft className="w-4 h-4" /> Recommencer
            </button>

            <h1 className="text-text-primary font-bold text-xl mb-1">
              Transférer la propriété
            </h1>
            <p className="text-text-tertiary text-xs mb-5">
              Désignez un autre administrateur pour que l&apos;organisation ne
              reste jamais sans responsable.
            </p>
            {candidatesLoaded && ownerOfRecord && ownerOfRecord !== user?.id && (
              <p
                className="text-text-tertiary text-xs mb-5 -mt-3"
                data-testid="transfer.current-owner"
              >
                Propriétaire de référence actuel :{" "}
                <span className="text-text-secondary font-medium">
                  {candidates.find((c) => c.id === ownerOfRecord)?.name ??
                    ownerOfRecord}
                </span>
              </p>
            )}

            {step === "choose" && (
              <>
                {!isPowerSyncReadyNow() && !candidatesLoaded ? (
                  <ListSkeleton count={3} />
                ) : eligible.length === 0 ? (
                  <ScreenState state="empty">
                    <EmptyState
                      icon={<Crown className="w-6 h-6" />}
                      title="Aucun membre éligible"
                      description="Le transfert exige une autre personne active dont le rôle permet de gérer les accès (Administrateur ou Pasteur Principal)."
                    />
                  </ScreenState>
                ) : (
                  <ScreenState state="ready">
                    <fieldset className="space-y-2 mb-5">
                      <legend className="sr-only">
                        Choisir la nouvelle propriétaire
                      </legend>
                      {eligible.map((c) => (
                        <label
                          key={c.id}
                          className="flex items-center gap-3 p-4 rounded-xl cursor-pointer"
                          style={{
                            backgroundColor: "var(--surface)",
                            border: `1px solid ${
                              selectedId === c.id
                                ? "var(--accent-primary)"
                                : "var(--border)"
                            }`,
                          }}
                        >
                          <input
                            type="radio"
                            name="transfer-target"
                            value={c.id}
                            checked={selectedId === c.id}
                            onChange={() => setSelectedId(c.id)}
                            aria-label={candidateLabel(c)}
                          />
                          <span className="min-w-0">
                            <span className="block text-text-primary text-sm font-semibold truncate">
                              {candidateLabel(c)}
                            </span>
                            <span className="block text-text-tertiary text-xs">
                              {c.isAdmin
                                ? "Déjà administrateur"
                                : "Sera promu administrateur"}
                            </span>
                          </span>
                        </label>
                      ))}
                    </fieldset>
                    <button
                      type="button"
                      onClick={() => setStep("review")}
                      disabled={!selected}
                      className="w-full py-3 rounded-full font-semibold text-on-accent text-sm disabled:opacity-50"
                      style={{ backgroundColor: "var(--accent-primary)" }}
                    >
                      Continuer
                    </button>
                  </ScreenState>
                )}
              </>
            )}

            {step === "review" && selected && (
              <ScreenState state="ready">
                <div
                  className="rounded-xl p-4 mb-4"
                  style={{
                    backgroundColor: "var(--surface)",
                    border: "1px solid var(--border)",
                  }}
                >
                  <p className="text-text-primary text-sm font-semibold mb-2">
                    Ce qui va se passer
                  </p>
                  <ol className="space-y-2 list-decimal list-inside">
                    {(plan?.steps ?? []).map((s) => (
                      <li key={s.kind} className="text-text-secondary text-sm">
                        {s.label}
                      </li>
                    ))}
                  </ol>
                </div>

                <div
                  className="rounded-xl p-4 mb-4"
                  style={{
                    backgroundColor:
                      "color-mix(in srgb, var(--data-pending) 12%, transparent)",
                    border: "1px solid var(--border)",
                  }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <TriangleAlert
                      className="w-4 h-4"
                      style={{ color: "var(--data-pending)" }}
                    />
                    <span className="text-text-primary text-sm font-semibold">
                      À savoir
                    </span>
                  </div>
                  <ul className="space-y-1 text-text-secondary text-xs">
                    <li>
                      La nouvelle personne pourra administrer l&apos;organisation
                      et gérer les accès.
                    </li>
                    <li>
                      L&apos;ancien propriétaire conserve ses données : seul son
                      rôle peut changer.
                    </li>
                    <li>
                      Vérifiez que la personne choisie accepte cette
                      responsabilité avant de continuer.
                    </li>
                  </ul>
                </div>

                <button
                  type="button"
                  onClick={() => setStep("confirm")}
                  className="w-full py-3 rounded-full font-semibold text-on-accent text-sm"
                  style={{ backgroundColor: "var(--accent-primary)" }}
                >
                  Continuer vers la confirmation
                </button>
              </ScreenState>
            )}

            {step === "confirm" && selected && (
              <ScreenState state="ready">
                <p className="text-text-secondary text-sm mb-2">
                  Pour confirmer, saisissez le nom de la personne :
                </p>
                <p className="text-text-primary text-sm font-semibold mb-3">
                  {confirmTarget}
                </p>
                <label className="sr-only" htmlFor="transfer-confirm">
                  Saisir le nom pour confirmer
                </label>
                <input
                  id="transfer-confirm"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder={confirmTarget}
                  className="w-full rounded-xl px-4 py-3 mb-4 text-sm"
                  style={{
                    backgroundColor: "var(--card)",
                    color: "var(--text-primary)",
                    border: "1px solid var(--border)",
                  }}
                />
                <button
                  type="button"
                  onClick={() => void handleApply()}
                  disabled={!canConfirm || applying || !plan}
                  className="w-full py-3 rounded-full font-semibold text-on-accent text-sm disabled:opacity-50"
                  style={{ backgroundColor: "var(--data-expense)" }}
                >
                  {applying ? "Transfert en cours…" : "Transférer la propriété"}
                </button>
              </ScreenState>
            )}

            {step === "result" && outcome && (
              <ScreenState state={outcome.ok ? "success" : "error"}>
                <div
                  className="rounded-xl p-5"
                  style={{
                    backgroundColor: "var(--surface)",
                    border: "1px solid var(--border)",
                  }}
                >
                  <p className="text-text-primary font-semibold mb-1">
                    {outcome.ok ? "Transfert réussi" : "Transfert interrompu"}
                  </p>
                  <p className="text-text-secondary text-sm">{outcome.message}</p>
                  {!outcome.ok && (
                    <p className="text-text-tertiary text-xs mt-2">
                      L&apos;organisation conserve toujours au moins un
                      administrateur : aucune action manuelle n&apos;est
                      nécessaire.
                    </p>
                  )}
                </div>
              </ScreenState>
            )}
          </div>
          <BottomNav />
        </div>
      </IonContent>
    </IonPage>
  );
}

/**
 * Enveloppe non-lançante de `assertTransferAllowed` pour l'affichage : renvoie
 * le plan, ou `null` si le transfert est refusé. Un refus est un résultat
 * ATTENDU (motif métier) et n'est pas un incident : seules les erreurs
 * INATTENDUES sont instrumentées (règle R88, jamais d'avalement silencieux).
 */
function assertTransferAllowedSafe(
  current: Parameters<typeof assertTransferAllowed>[0],
  candidates: readonly TransferCandidate[],
): TransferPlan | null {
  try {
    const plan = assertTransferAllowed(current, candidates);
    return planKeepsAnAdmin(
      plan,
      candidates.filter((c) => c.isAdmin).map((c) => c.id),
    )
      ? plan
      : null;
  } catch (err) {
    if (!(err instanceof OwnershipTransferError)) {
      captureClientError(err, {
        message: "Planification du transfert de propriété échouée",
        route: "/admin/transfer-ownership",
      });
    }
    return null;
  }
}
