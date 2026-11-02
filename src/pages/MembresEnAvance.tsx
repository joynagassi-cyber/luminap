/**
 * MembresEnAvance v2 — Membres avec solde créditeur, redesign premium.
 *
 * Design : fond sombre, bandeau total avec dégradé, liste de membres avec
 * avatar initiales et montant en avance. Tokens CSS `var(--*)`.
 *
 * Logique métier inchangée : filtre montant_en_avance > 0 et statut ACTIVE,
 * tri décroissant, navigation vers détail membre.
 */

import { useMembers, isPowerSyncReadyNow } from "@/lib/dataLayer";
import { useNavigate } from "react-router-dom";
import { formatCurrencyCompact } from "@/lib/utils";
import { ArrowLeft, TrendingUp } from "lucide-react";
import TopHeader from "@/components/TopHeader";
import BottomNav from "@/components/BottomNav";
import EmptyState from "@/components/EmptyState";
import { MembresEnAvanceSkeleton } from "@/components/PageSkeletons";
import { IonPage, IonContent } from "@ionic/react";
import { ListItem } from "@/design/components/PageShell";

type AvanceEntry = {
  membre: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string | null;
  };
  montant: number;
};

export default function MembresEnAvance() {
  const navigate = useNavigate();
  const { data: psData } = useMembers();

  const membresEnAvance: AvanceEntry[] = (psData ?? [])
    .filter((m: any) => m.montant_en_avance > 0 && m.status === "ACTIVE")
    .map((m: any) => ({
      membre: {
        id: m.id,
        firstName: m.first_name,
        lastName: m.last_name,
        phone: m.phone,
      },
      montant: m.montant_en_avance,
    }))
    .sort((a, b) => b.montant - a.montant);

  const totalEnAvance = membresEnAvance.reduce((sum, m) => sum + m.montant, 0);

  return (
    <IonPage>
      <IonContent fullscreen className="bg-canvas">
        <div className="min-h-dvh">
          <TopHeader title="En avance" onBack={() => navigate("/members")} />

          <div className="max-w-lg mx-auto px-5 pb-safe-calc pt-safe-calc">
            {/* Total banner */}
            <div
              className="rounded-2xl p-5 mb-6"
              style={{
                background:
                  "linear-gradient(135deg, var(--surface) 0%, var(--canvas) 100%)",
                border: "1px solid color-mix(in srgb, var(--accent-primary) 19%, transparent)",
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4" style={{ color: "var(--accent-primary)" }} />
                <span className="text-text-tertiary text-xs font-medium uppercase tracking-wider">
                  Total en avance
                </span>
              </div>
              <p className="text-2xl font-black" style={{ color: "var(--accent-primary)" }}>
                {formatCurrencyCompact(totalEnAvance)}
                <span className="text-text-tertiary text-base font-medium ml-1">
                  FCFA
                </span>
              </p>
              <p className="text-text-tertiary text-xs mt-1">
                {membresEnAvance.length} membre{membresEnAvance.length > 1 ? "s" : ""}
              </p>
            </div>

            {/* Members list */}
            {!isPowerSyncReadyNow() ? (
              <MembresEnAvanceSkeleton />
            ) : membresEnAvance.length === 0 ? (
              <EmptyState
                title="Aucun membre en avance"
                description="Tous les membres sont à jour"
                icon={<TrendingUp className="w-6 h-6" />}
              />
            ) : (
              <div className="space-y-2">
                {membresEnAvance.map(({ membre, montant }) => (
                  <button
                    key={membre.id}
                    onClick={() => navigate(`/membre/${membre.id}`)}
                    className="w-full rounded-xl p-4 flex items-center gap-3 text-left active:scale-[0.98] transition-transform"
                    style={{
                      backgroundColor: "var(--surface)",
                      border: "1px solid var(--border)",
                    }}
                  >
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: "color-mix(in srgb, var(--accent-primary) 12%, transparent)" }}
                    >
                      <span
                        className="text-sm font-bold"
                        style={{ color: "var(--accent-primary)" }}
                      >
                        {membre.firstName.charAt(0)}{membre.lastName.charAt(0)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-text-primary text-sm font-semibold truncate">
                        {membre.firstName} {membre.lastName}
                      </p>
                      {membre.phone && (
                        <p className="text-text-tertiary text-xs">
                          {membre.phone}
                        </p>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p
                        className="text-sm font-bold"
                        style={{ color: "var(--data-planified)" }}
                      >
                        {formatCurrencyCompact(montant)} F
                      </p>
                      <p className="text-text-tertiary text-xs">en avance</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
          <BottomNav />
        </div>
      </IonContent>
    </IonPage>
  );
}
