import { useNavigate, useParams } from "react-router-dom";
import {
  useMembers,
  useEvents,
  useCotisations,
} from "@/lib/dataLayer";
import { formatCurrencyCompact, formatDate, tint } from "@/lib/utils";
import { CheckCircle, Clock, User } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import TopHeader from "@/components/TopHeader";
import { Progress } from "@/components/ui/progress";
import {
  IonPage,
  IonHeader,
  IonContent,
  IonTitle,
  IonToolbar,
  IonButtons,
  IonBackButton,
} from "@ionic/react";

const COTISATION_STATUT_LABEL: Record<string, string> = {
  NON_PAYE: "Non paye",
  PAYE: "Paye",
  ABSENT: "Absent",
  EN_AVANCE: "En avance",
};

const COTISATION_STATUT_COLOR: Record<string, string> = {
  NON_PAYE: "#EF4444",
  PAYE: "#10B981",
  ABSENT: "#808080",
  EN_AVANCE: "#3B82F6",
};

export default function MembreDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: psMembers } = useMembers();
  const { data: psEvents } = useEvents();
  const { data: psCotisations } = useCotisations();

  const allMembers = psMembers ?? [];
  const events = psEvents ?? [];
  const cotisations = psCotisations ?? [];

  const member = allMembers.find((m: any) => m.id === id) ?? null;

  if (!member) {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonButtons slot="start">
              <IonBackButton defaultHref="/members" />
            </IonButtons>
            <IonTitle>Membre</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent fullscreen>
          <div className="min-h-screen" style={{ backgroundColor: "#121212" }}>
            <TopHeader title="" />
            <div className="max-w-lg mx-auto px-5 pb-32 pt-16">
              <div
                className="text-center py-10 rounded-xl"
                style={{ backgroundColor: "#1e1e1e" }}
              >
                <User className="w-10 h-10 mx-auto mb-3 text-text-tertiary opacity-30" />
                <p className="text-text-tertiary text-sm">Membre introuvable</p>
              </div>
            </div>
            <BottomNav />
          </div>
        </IonContent>
      </IonPage>
    );
  }

  const fullName = `${(member as any).first_name || ""} ${(member as any).last_name || ""}`.trim();
  const memberCotisations = cotisations.filter((c: any) => c.membre_id === member.id);
  const memberEvents = events.filter((e) => e.type === "CULTE");

  const payeCount = memberCotisations.filter(
    (c) => c.statut === "PAYE" || c.statut === "EN_AVANCE",
  ).length;
  const absentCount = memberCotisations.filter(
    (c) => c.statut === "ABSENT",
  ).length;
  const totalDons = (member as any).total_dons ?? (member as any).totalDons ?? 0;
  const totalCultes = memberEvents.length;
  const cadence =
    totalCultes > 0 ? Math.round((payeCount / totalCultes) * 100) : 0;

  // Inline getMembreHistorique logic adapted for PS snake_case rows
  const membreCots = memberCotisations as any[];
  const historique = membreCots
    .map((cot: any) => {
      const culteId = cot.culte_id || cot.culteId;
      const culte = events.find((e: any) => e.id === culteId);
      return { cotisation: cot, culte };
    })
    .filter(({ culte }: any) => culte !== undefined)
    .sort((a: any, b: any) => {
      const dateA = new Date(
        a.culte.start_date || a.culte.startDate,
      ).getTime();
      const dateB = new Date(
        b.culte.start_date || b.culte.startDate,
      ).getTime();
      return dateB - dateA;
    });

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/members" />
          </IonButtons>
          <IonTitle>Membre</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        <div className="min-h-screen" style={{ backgroundColor: "#121212" }}>
          <TopHeader title="Membre" />
          <div className="max-w-lg mx-auto px-5 pb-32 pt-16">
            {/* Header gradient card */}
            <div
              className="rounded-2xl p-5 mb-5 relative overflow-hidden"
              style={{
                background: "linear-gradient(135deg, #1e3a5f 0%, #121212 60%)",
                border: "1px solid #282828",
              }}
            >
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{
                    background: "linear-gradient(135deg, #3B82F6, #FF8533)",
                  }}
                >
                  <span className="text-white text-base font-bold">
                    {((member as any).first_name || "").charAt(0)}
                    {((member as any).last_name || "").charAt(0)}
                  </span>
                </div>
                <div>
                  <p className="text-white font-bold text-lg">{fullName}</p>
                  {(member as any).phone && (
                    <p className="text-text-tertiary text-xs">{(member as any).phone}</p>
                  )}
                </div>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-3 gap-2">
                <div
                  className="text-center p-2 rounded-xl"
                  style={{ backgroundColor: "#10B98115" }}
                >
                  <CheckCircle
                    className="w-4 h-4 mx-auto mb-1"
                    style={{ color: "#10B981" }}
                  />
                  <p className="text-white font-bold text-sm">{payeCount}</p>
                  <p className="text-text-tertiary text-xs">Cultes</p>
                </div>
                <div
                  className="text-center p-2 rounded-xl"
                  style={{ backgroundColor: "#80808015" }}
                >
                  <Clock
                    className="w-4 h-4 mx-auto mb-1"
                    style={{ color: "#808080" }}
                  />
                  <p className="text-white font-bold text-sm">{absentCount}</p>
                  <p className="text-text-tertiary text-xs">Absences</p>
                </div>
                <div
                  className="text-center p-2 rounded-xl"
                  style={{ backgroundColor: "color-mix(in srgb, var(--accent-primary) 8%,  transparent)" }}
                >
                  <p className="text-white font-bold text-sm">
                    {formatCurrencyCompact(totalDons)}
                  </p>
                  <p className="text-text-tertiary text-xs">Dons</p>
                </div>
              </div>

              {/* Cadence progress */}
              <div className="mt-4">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-text-tertiary text-xs">Cadence</span>
                  <span className="text-white text-xs font-bold">
                    {cadence}%
                  </span>
                </div>
                <Progress value={cadence} className="h-2" />
              </div>
            </div>

            {/* Cotisations history */}
            <div className="mb-4">
              <h2 className="text-text-primary font-bold text-sm mb-3">
                Historique des cotisations
              </h2>
              {historique.length === 0 ? (
                <div
                  className="rounded-xl p-6 text-center"
                  style={{ backgroundColor: "#1e1e1e" }}
                >
                  <Clock className="w-8 h-8 mx-auto mb-2 text-text-tertiary opacity-30" />
                  <p className="text-text-tertiary text-sm">
                    Aucune cotisation
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {historique.map(({ cotisation, culte }) => (
                    <div
                      key={cotisation.id}
                      className="rounded-xl p-3.5 flex items-center gap-3"
                      style={{
                        backgroundColor: "#1e1e1e",
                        border: "1px solid #282828",
                      }}
                    >
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{
                          backgroundColor: tint(
                            COTISATION_STATUT_COLOR[cotisation.statut] ||
                              "#808080",
                            12,
                          ),
                        }}
                      >
                        {cotisation.statut === "PAYE" ||
                        cotisation.statut === "EN_AVANCE" ? (
                          <CheckCircle
                            className="w-4 h-4"
                            style={{
                              color: COTISATION_STATUT_COLOR[cotisation.statut],
                            }}
                          />
                        ) : (
                          <Clock
                            className="w-4 h-4"
                            style={{
                              color: COTISATION_STATUT_COLOR[cotisation.statut],
                            }}
                          />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-text-primary text-sm font-medium truncate">
                            {culte?.name || "Culte"}
                          </p>
                          <span
                            className="text-xs px-1.5 py-0.5 rounded-full flex-shrink-0"
                            style={{
                              backgroundColor: tint(
                                COTISATION_STATUT_COLOR[cotisation.statut] ||
                                  "#808080",
                                12,
                              ),
                              color:
                                COTISATION_STATUT_COLOR[cotisation.statut] ||
                                "#808080",
                            }}
                          >
                            {COTISATION_STATUT_LABEL[cotisation.statut] ||
                              cotisation.statut}
                          </span>
                        </div>
                        <p className="text-text-tertiary text-xs">
                          {formatDate((culte as any)?.start_date || (culte as any)?.startDate || cotisation.createdAt)}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-text-primary text-sm font-bold">
                          {formatCurrencyCompact(cotisation.montantPaye)} F
                        </p>
                        {cotisation.montantPaye >
                          cotisation.montantObligatoire && (
                          <p className="text-xs" style={{ color: "var(--accent-primary)" }}>
                            +
                            {formatCurrencyCompact(
                              cotisation.montantPaye -
                                cotisation.montantObligatoire,
                            )}{" "}
                            don
                          </p>
                        )}
                        {cotisation.montantPaye <
                          cotisation.montantObligatoire &&
                          cotisation.statut === "NON_PAYE" && (
                            <p className="text-xs text-text-tertiary">
                              Due:{" "}
                              {formatCurrencyCompact(
                                cotisation.montantObligatoire,
                              )}{" "}
                              F
                            </p>
                          )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <BottomNav />
        </div>
      </IonContent>
    </IonPage>
  );
}
