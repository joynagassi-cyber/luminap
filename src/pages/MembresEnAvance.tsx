import { useMembers } from "@/lib/dataLayer";
import { useNavigate } from "react-router-dom";
import { formatCurrencyCompact } from "@/lib/utils";
import { ArrowLeft, TrendingUp } from "lucide-react";
import TopHeader from "@/components/TopHeader";
import BottomNav from "@/components/BottomNav";
import {
  IonPage,
  IonHeader,
  IonContent,
  IonTitle,
  IonToolbar,
} from "@ionic/react";

type AvanceEntry = { membre: { id: string; firstName: string; lastName: string; phone: string | null }; montant: number };

export default function MembresEnAvance() {
  const navigate = useNavigate();
  const { data: psData } = useMembers();

  // Members with positive montant_en_avance, sorted descending by amount.
  // PSMember uses snake_case columns; keep the existing camelCase fallback pattern.
  const membresEnAvance: AvanceEntry[] = (psData ?? [])
    .filter((m) => m.montant_en_avance > 0 && m.status === "ACTIVE")
    .map((m) => ({
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
      <IonHeader>
        <IonToolbar>
          <IonTitle>MembresEnAvance</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="bg-canvas">
        <div className="min-h-screen" style={{ backgroundColor: "#121212" }}>
          <TopHeader title="En avance" />
          <div className="max-w-lg mx-auto px-5 pb-32 pt-16">
            {/* Back button */}
            <button
              onClick={() => navigate("/members")}
              className="flex items-center gap-2 text-text-secondary text-sm mb-5"
              style={{ color: "#B3B3B3" }}
            >
              <ArrowLeft className="w-4 h-4" /> Retour
            </button>

            {/* Total banner */}
            <div
              className="rounded-2xl p-5 mb-5"
              style={{
                background: "linear-gradient(135deg, #1a1a2e 0%, #121212 100%)",
                border: "1px solid #FF6B0030",
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4" style={{ color: "#FF6B00" }} />
                <span className="text-text-tertiary text-xs font-medium uppercase tracking-wider">
                  Total en avance
                </span>
              </div>
              <p className="text-3xl font-black" style={{ color: "#FF6B00" }}>
                {formatCurrencyCompact(totalEnAvance)}
                <span className="text-text-tertiary text-base font-medium ml-1">
                  FCFA
                </span>
              </p>
              <p className="text-text-tertiary text-xs mt-1">
                {membresEnAvance.length} membre
                {membresEnAvance.length > 1 ? "s" : ""}
              </p>
            </div>

            {/* Members list */}
            {membresEnAvance.length === 0 ? (
              <div
                className="rounded-xl p-8 text-center"
                style={{ backgroundColor: "#1e1e1e" }}
              >
                <TrendingUp className="w-10 h-10 mx-auto mb-3 text-text-tertiary opacity-30" />
                <p className="text-text-tertiary text-sm">
                  Aucun membre en avance
                </p>
                <p className="text-text-tertiary text-xs mt-1">
                  Tous les membres sont à jour
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {membresEnAvance.map(({ membre, montant }) => (
                  <button
                    key={membre.id}
                    onClick={() => navigate(`/membre/${membre.id}`)}
                    className="w-full rounded-xl p-4 flex items-center gap-3 text-left active:scale-[0.98] transition-transform"
                    style={{
                      backgroundColor: "#1e1e1e",
                      border: "1px solid #282828",
                    }}
                  >
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: "#FF6B0020" }}
                    >
                      <span
                        className="text-sm font-bold"
                        style={{ color: "#FF6B00" }}
                      >
                        {membre.firstName.charAt(0)}
                        {membre.lastName.charAt(0)}
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
                        style={{ color: "#3B82F6" }}
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
