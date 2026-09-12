import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronRight,
  ShieldCheck,
  UserPlus,
  Info,
} from "lucide-react";
import {
  IonPage,
  IonHeader,
  IonContent,
  IonTitle,
  IonToolbar,
} from "@ionic/react";
import {
  loadOnboardingState,
  saveOnboardingState,
  type OnboardingState,
} from "@/lib/onboardingState";

const SCREENS = [
  {
    id: "welcome",
    title: "Gérez vos finances simplement",
    subtitle: "Bienvenue sur Lumina",
    description:
      "Suivez vos revenus, dépenses et versements — offline, sécurisé et accessible à tous.",
    illustration: (
      <svg
        viewBox="0 0 280 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full"
      >
        <rect
          x="30"
          y="20"
          width="220"
          height="160"
          rx="16"
          fill="#1E1E1E"
          stroke="#282828"
          strokeWidth="1"
        />
        <rect x="50" y="40" width="180" height="8" rx="4" fill="var(--accent-primary)" />
        <rect x="50" y="60" width="120" height="6" rx="3" fill="#282828" />
        <rect x="50" y="80" width="70" height="40" rx="8" fill="#1DB95420" />
        <rect x="130" y="80" width="100" height="40" rx="8" fill="#282828" />
        <rect x="50" y="135" width="180" height="6" rx="3" fill="#282828" />
        <rect x="50" y="150" width="130" height="6" rx="3" fill="#282828" />
        <circle cx="220" cy="44" r="3" fill="#E51332" />
        <circle cx="210" cy="44" r="3" fill="#FFB800" />
        <circle cx="200" cy="44" r="3" fill="#1DB954" />
        <rect x="60" y="90" width="20" height="20" rx="4" fill="#1DB954" />
        <rect
          x="72"
          y="96"
          width="30"
          height="4"
          rx="2"
          fill="#1DB954"
          opacity="0.6"
        />
        <rect
          x="72"
          y="104"
          width="20"
          height="4"
          rx="2"
          fill="#1DB954"
          opacity="0.4"
        />
      </svg>
    ),
  },
  {
    id: "dashboard",
    title: "Vue d'ensemble",
    subtitle: "Tableau de bord",
    description:
      "Consultez instantanément le solde de chaque caisse, les transactions récentes et les événements à venir. Tout en un coup d'œil.",
    illustration: (
      <svg
        viewBox="0 0 280 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full"
      >
        <rect
          x="20"
          y="20"
          width="110"
          height="70"
          rx="12"
          fill="#1E1E1E"
          stroke="#282828"
          strokeWidth="1"
        />
        <rect x="35" y="35" width="50" height="8" rx="4" fill="#1DB954" />
        <rect x="35" y="50" width="80" height="4" rx="2" fill="#282828" />
        <rect x="35" y="60" width="60" height="4" rx="2" fill="#282828" />
        <rect x="35" y="80" width="40" height="4" rx="2" fill="#282828" />
        <rect
          x="150"
          y="20"
          width="110"
          height="70"
          rx="12"
          fill="#1E1E1E"
          stroke="#282828"
          strokeWidth="1"
        />
        <rect x="165" y="35" width="50" height="8" rx="4" fill="#FFB800" />
        <rect x="165" y="50" width="80" height="4" rx="2" fill="#282828" />
        <rect x="165" y="60" width="60" height="4" rx="2" fill="#282828" />
        <rect x="165" y="80" width="40" height="4" rx="2" fill="#282828" />
        <rect
          x="20"
          y="105"
          width="240"
          height="75"
          rx="12"
          fill="#1E1E1E"
          stroke="#282828"
          strokeWidth="1"
        />
        <rect x="35" y="120" width="30" height="40" rx="4" fill="#282828" />
        <rect x="75" y="135" width="30" height="25" rx="4" fill="var(--accent-primary)" />
        <rect x="115" y="125" width="30" height="35" rx="4" fill="#282828" />
        <rect x="155" y="140" width="30" height="20" rx="4" fill="#282828" />
        <rect x="195" y="115" width="30" height="45" rx="4" fill="#282828" />
      </svg>
    ),
  },
  {
    id: "transactions",
    title: "Transactions",
    subtitle: "Enregistrer chaque mouvement",
    description:
      "Enregistrez vos mouvements en quelques touches et suivez leur statut. Chaque action reste tracée.",
    illustration: (
      <svg
        viewBox="0 0 280 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full"
      >
        <rect
          x="60"
          y="15"
          width="160"
          height="170"
          rx="16"
          fill="#1E1E1E"
          stroke="#282828"
          strokeWidth="1"
        />
        <rect x="80" y="35" width="120" height="6" rx="3" fill="#282828" />
        <rect
          x="80"
          y="55"
          width="90"
          height="50"
          rx="8"
          fill="#1E1E1E"
          stroke="#282828"
          strokeWidth="1"
        />
        <circle cx="95" cy="70" r="10" fill="#1DB95420" />
        <rect x="88" y="67" width="14" height="6" rx="1" fill="#1DB954" />
        <rect x="115" y="63" width="60" height="4" rx="2" fill="#282828" />
        <rect x="115" y="73" width="40" height="4" rx="2" fill="#282828" />
        <rect x="115" y="83" width="30" height="4" rx="2" fill="#282828" />
        <rect
          x="80"
          y="115"
          width="90"
          height="50"
          rx="8"
          fill="#1E1E1E"
          stroke="#282828"
          strokeWidth="1"
        />
        <circle cx="95" cy="130" r="10" fill="#E5133220" />
        <rect x="88" y="127" width="14" height="6" rx="1" fill="#E51332" />
        <rect x="115" y="123" width="60" height="4" rx="2" fill="#282828" />
        <rect x="115" y="133" width="40" height="4" rx="2" fill="#282828" />
        <rect x="115" y="143" width="30" height="4" rx="2" fill="#282828" />
        <circle cx="230" cy="170" r="18" fill="var(--accent-primary)" />
        <path
          d="M222 170h16M230 162v16"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    id: "caisses",
    title: "Caisses & Groupes",
    subtitle: "Organisez vos fonds",
    description:
      "Chaque groupe possède sa caisse. Effectuez des versements entre caisses en toute simplicité.",
    illustration: (
      <svg
        viewBox="0 0 280 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full"
      >
        <rect
          x="20"
          y="15"
          width="100"
          height="70"
          rx="12"
          fill="#1E1E1E"
          stroke="#282828"
          strokeWidth="1"
        />
        <rect x="35" y="30" width="70" height="6" rx="3" fill="var(--accent-primary)" />
        <rect x="35" y="45" width="50" height="4" rx="2" fill="#282828" />
        <rect x="35" y="55" width="40" height="4" rx="2" fill="#282828" />
        <rect x="35" y="75" width="70" height="4" rx="2" fill="#282828" />
        <rect
          x="160"
          y="15"
          width="100"
          height="70"
          rx="12"
          fill="#1E1E1E"
          stroke="#282828"
          strokeWidth="1"
        />
        <rect x="175" y="30" width="70" height="6" rx="3" fill="#8B5CF6" />
        <rect x="175" y="45" width="50" height="4" rx="2" fill="#282828" />
        <rect x="175" y="55" width="40" height="4" rx="2" fill="#282828" />
        <rect x="175" y="75" width="70" height="4" rx="2" fill="#282828" />
        <rect
          x="20"
          y="105"
          width="100"
          height="70"
          rx="12"
          fill="#1E1E1E"
          stroke="#282828"
          strokeWidth="1"
        />
        <rect x="35" y="120" width="70" height="6" rx="3" fill="#1DB954" />
        <rect x="35" y="135" width="50" height="4" rx="2" fill="#282828" />
        <rect x="35" y="145" width="40" height="4" rx="2" fill="#282828" />
        <rect x="35" y="165" width="70" height="4" rx="2" fill="#282828" />
        <rect
          x="160"
          y="105"
          width="100"
          height="70"
          rx="12"
          fill="#1E1E1E"
          stroke="#282828"
          strokeWidth="1"
        />
        <rect x="175" y="120" width="70" height="6" rx="3" fill="#FFB800" />
        <rect x="175" y="135" width="50" height="4" rx="2" fill="#282828" />
        <rect x="175" y="145" width="40" height="4" rx="2" fill="#282828" />
        <rect x="175" y="165" width="70" height="4" rx="2" fill="#282828" />
        <path
          d="M120 50h40M120 140h40"
          stroke="var(--accent-primary)"
          strokeWidth="1.5"
          strokeDasharray="3 3"
          strokeLinecap="round"
        />
        <path
          d="M130 45l10 5-10 5"
          stroke="var(--accent-primary)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M150 135l10 5-10 5"
          stroke="var(--accent-primary)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    id: "events",
    title: "Événements & Budgets",
    subtitle: "Planifiez chaque célébration",
    description:
      "Planifiez vos événements avec un budget et suivez les dépenses en temps réel.",
    illustration: (
      <svg
        viewBox="0 0 280 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full"
      >
        <rect
          x="30"
          y="15"
          width="220"
          height="170"
          rx="16"
          fill="#1E1E1E"
          stroke="#282828"
          strokeWidth="1"
        />
        <rect x="50" y="30" width="60" height="8" rx="4" fill="#EC4899" />
        <rect x="120" y="30" width="40" height="8" rx="4" fill="#282828" />
        <rect x="170" y="30" width="40" height="8" rx="4" fill="#282828" />
        <rect x="50" y="55" width="180" height="1" fill="#282828" />
        <rect x="50" y="70" width="120" height="6" rx="3" fill="#282828" />
        <rect x="50" y="85" width="80" height="6" rx="3" fill="#282828" />
        <rect x="50" y="100" width="100" height="6" rx="3" fill="#282828" />
        <rect
          x="50"
          y="125"
          width="180"
          height="40"
          rx="8"
          fill="#181818"
          stroke="#282828"
          strokeWidth="1"
        />
        <rect x="60" y="135" width="60" height="4" rx="2" fill="#282828" />
        <rect x="60" y="145" width="40" height="4" rx="2" fill="#282828" />
        <rect x="180" y="135" width="40" height="14" rx="4" fill="#EC489920" />
        <rect x="240" y="70" width="10" height="40" rx="2" fill="#EC4899" />
        <rect
          x="225"
          y="85"
          width="10"
          height="25"
          rx="2"
          fill="#EC4899"
          opacity="0.6"
        />
        <rect
          x="210"
          y="95"
          width="10"
          height="15"
          rx="2"
          fill="#EC4899"
          opacity="0.4"
        />
      </svg>
    ),
  },
  {
    id: "reports",
    title: "Rapports & Bilans",
    subtitle: "Des exports professionnels",
    description:
      "Générez des bilans financiers et exportez-les à tout moment, signés au nom de votre organisation.",
    illustration: (
      <svg
        viewBox="0 0 280 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full"
      >
        <rect
          x="20"
          y="15"
          width="130"
          height="170"
          rx="12"
          fill="#1E1E1E"
          stroke="#282828"
          strokeWidth="1"
        />
        <rect x="35" y="35" width="100" height="6" rx="3" fill="#3B82F6" />
        <rect x="35" y="55" width="70" height="4" rx="2" fill="#282828" />
        <rect x="35" y="65" width="50" height="4" rx="2" fill="#282828" />
        <rect x="35" y="85" width="100" height="50" rx="6" fill="#181818" />
        <rect x="45" y="110" width="20" height="20" rx="3" fill="#3B82F6" />
        <rect
          x="70"
          y="100"
          width="20"
          height="30"
          rx="3"
          fill="#3B82F6"
          opacity="0.7"
        />
        <rect
          x="95"
          y="90"
          width="20"
          height="40"
          rx="3"
          fill="#3B82F6"
          opacity="0.5"
        />
        <rect
          x="120"
          y="105"
          width="20"
          height="25"
          rx="3"
          fill="#3B82F6"
          opacity="0.3"
        />
        <rect x="35" y="150" width="100" height="6" rx="3" fill="#282828" />
        <rect x="35" y="162" width="70" height="4" rx="2" fill="#282828" />
        <rect
          x="170"
          y="30"
          width="80"
          height="140"
          rx="12"
          fill="#1E1E1E"
          stroke="#282828"
          strokeWidth="1"
        />
        <rect x="185" y="50" width="50" height="6" rx="3" fill="#282828" />
        <rect x="185" y="70" width="50" height="4" rx="2" fill="#282828" />
        <rect x="185" y="80" width="50" height="4" rx="2" fill="#282828" />
        <rect x="185" y="100" width="50" height="4" rx="2" fill="#282828" />
        <rect x="185" y="110" width="50" height="4" rx="2" fill="#282828" />
        <rect x="185" y="130" width="50" height="20" rx="4" fill="#3B82F6" />
        <rect x="195" y="137" width="30" height="6" rx="2" fill="white" />
      </svg>
    ),
  },
  {
    id: "org",
    title: "Votre organisation, votre marque",
    subtitle: "Nom, sigle, type & thème",
    description:
      "Donnez à votre organisation un nom, un sigle et un type, puis personnalisez son thème de couleurs. Cette identité habille chaque écran et chaque rapport.",
    illustration: (
      <svg
        viewBox="0 0 280 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full"
      >
        <rect
          x="20"
          y="20"
          width="240"
          height="80"
          rx="14"
          fill="#1E1E1E"
          stroke="#282828"
          strokeWidth="1"
        />
        <circle cx="48" cy="48" r="14" fill="var(--accent-primary)" />
        <rect x="70" y="40" width="110" height="8" rx="4" fill="#333" />
        <rect x="70" y="56" width="70" height="6" rx="3" fill="#282828" />
        <rect
          x="196"
          y="36"
          width="52"
          height="24"
          rx="6"
          fill="#181818"
          stroke="var(--accent-primary)"
          strokeWidth="1.5"
        />
        <text
          x="222"
          y="52"
          textAnchor="middle"
          fontSize="10"
          fontWeight="700"
          fill="var(--accent-primary)"
        >
          MFE
        </text>
        <rect
          x="196"
          y="66"
          width="52"
          height="24"
          rx="6"
          fill="#181818"
          stroke="#282828"
          strokeWidth="1.5"
        />
        <text
          x="222"
          y="82"
          textAnchor="middle"
          fontSize="9"
          fill="#808080"
        >
          ONG
        </text>
        {/* swatches */}
        <rect
          x="20"
          y="115"
          width="240"
          height="70"
          rx="14"
          fill="#1E1E1E"
          stroke="#282828"
          strokeWidth="1"
        />
        <rect x="36" y="128" width="60" height="6" rx="3" fill="#808080" />
        <circle cx="42" cy="156" r="10" fill="var(--accent-primary)" />
        <circle cx="72" cy="156" r="10" fill="#7C3AED" />
        <circle cx="102" cy="156" r="10" fill="#2563EB" />
        <circle cx="132" cy="156" r="10" fill="#10B981" />
        <circle cx="162" cy="156" r="10" fill="#DB2777" />
        <circle cx="192" cy="156" r="10" fill="#B45309" />
        <circle cx="222" cy="156" r="10" fill="#4F46E5" />
        <circle cx="252" cy="156" r="10" fill="#DC2626" />
      </svg>
    ),
  },
  {
    id: "features",
    title: "Fonctions & rôles",
    subtitle: "Activez ce qu'il vous faut",
    description:
      "Activez les modules qui correspondent à votre organisation et assignez des rôles. Lumina s'adapte à vos besoins.",
    illustration: (
      <svg
        viewBox="0 0 280 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full"
      >
        <rect
          x="20"
          y="20"
          width="140"
          height="160"
          rx="14"
          fill="#1E1E1E"
          stroke="#282828"
          strokeWidth="1"
        />
        <rect x="35" y="38" width="80" height="6" rx="3" fill="#808080" />
        {[0, 1, 2, 3].map((i) => (
          <g key={i}>
            <rect
              x="35"
              y={60 + i * 26}
              width="110"
              height="18"
              rx="9"
              fill="#181818"
              stroke="#282828"
              strokeWidth="1"
            />
            <circle
              cx="134"
              cy={69 + i * 26}
              r="7"
              fill={i < 3 ? "var(--accent-primary)" : "#282828"}
            />
            <circle cx="134" cy={69 + i * 26} r="7" fill="none" />
          </g>
        ))}
        <rect
          x="175"
          y="20"
          width="85"
          height="74"
          rx="12"
          fill="#1E1E1E"
          stroke="#282828"
          strokeWidth="1"
        />
        <rect x="188" y="34" width="59" height="46" rx="4" fill="#181818" />
        <rect x="188" y="86" width="59" height="6" rx="3" fill="var(--accent-primary)" />
        <rect
          x="175"
          y="104"
          width="85"
          height="76"
          rx="12"
          fill="#1E1E1E"
          stroke="#282828"
          strokeWidth="1"
        />
        <circle cx="200" cy="130" r="10" fill="var(--accent-primary)" />
        <rect x="216" y="124" width="34" height="5" rx="2" fill="#808080" />
        <rect x="216" y="134" width="24" height="4" rx="2" fill="#282828" />
        <rect x="188" y="150" width="59" height="4" rx="2" fill="#282828" />
      </svg>
    ),
  },
];

const TOTAL_STEPS = SCREENS.length + 1; // 8 presentation + 1 branch choice


export default function Onboarding() {
  const navigate = useNavigate();
  const [initial] = useState<OnboardingState>(loadOnboardingState);
  const [current, setCurrent] = useState(initial.screen);
  const [branch, setBranch] = useState(initial.branch);
  const [branchLoading, setBranchLoading] = useState<OnboardingState["branch"]>(
    null,
  );

  const isPresentation = current < SCREENS.length;
  const screen = SCREENS[current];
  const isBranchStep = current === SCREENS.length; // step 9 = branch choice

  /**
   * Persist the resume point. `screen` is the index into the combined step
   * list (0..7 presentation, 8 branch). On reload the user returns here.
   */
  const persist = (step: number, nextBranch: OnboardingState["branch"]) => {
    saveOnboardingState({ ...loadOnboardingState(), screen: step, branch: nextBranch });
  };

  const handleBranchChoice = (choice: "creator" | "member") => {
    setBranch(choice);
    setBranchLoading(choice);
    persist(SCREENS.length, choice);
    // Give the button a moment to paint the selected state.
    setTimeout(() => {
      if (choice === "creator") {
        navigate("/org-setup", { replace: true });
      } else {
        // Real claim engine: code / QR / file / proximity.
        navigate("/invitation/claim", { replace: true });
      }
    }, 150);
  };

  const handleNext = () => {
    if (isBranchStep) {
      // Branch is chosen on its own screen — Next is hidden there.
      return;
    }
    setCurrent((c) => c + 1);
    persist(current + 1, branch);
  };

  const handleBack = () => {
    if (isBranchStep) {
      setCurrent(SCREENS.length - 1);
      persist(SCREENS.length - 1, branch);
    } else if (current > 0) {
      setCurrent((c) => c - 1);
      persist(current - 1, branch);
    } else {
      navigate("/auth", { replace: true });
    }
  };

  const totalDots = TOTAL_STEPS;

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Onboarding</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="bg-canvas">
        <div className="min-h-screen bg-[#121212] flex flex-col">
          {/* Header with logo */}
          <div className="flex items-center justify-between px-6 py-5">
            <img
              src="/lumina-logo.png"
              alt="Lumina"
              className="w-10 h-10 object-contain"
            />
            {!isBranchStep && current > 0 ? (
              <button
                onClick={handleBack}
                className="text-[#808080] text-sm font-medium"
              >
                Précédent
              </button>
            ) : !isBranchStep ? (
              <button
                onClick={handleBack}
                className="text-[#808080] text-sm font-medium"
              >
                Passer
              </button>
            ) : (
              <button
                onClick={handleBack}
                className="text-[#808080] text-sm font-medium"
              >
                Précédent
              </button>
            )}
          </div>

          {isBranchStep ? (
            /* ── Step 9 — choose your path ────────────────────────────── */
            <div className="flex-1 flex flex-col px-8 pt-4">
              <div className="flex-1 flex flex-col justify-center">
                <div className="flex items-center gap-3 mb-2">
                  <div
                    className="w-11 h-11 rounded-2xl flex items-center justify-center"
                    style={{ background: "var(--accent-primary)" }}
                  >
                    <Info className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p
                      className="text-sm font-semibold"
                      style={{ color: "var(--accent-primary)" }}
                    >
                      Votre parcours
                    </p>
                    <h1 className="text-white font-bold text-2xl leading-tight">
                      Comment démarrer ?
                    </h1>
                  </div>
                </div>

                <p className="text-[#B3B3B3] text-sm leading-relaxed mb-8">
                  Vous avez 2 portes d'entrée. Le premier créateur fonde son
                  organisation&nbsp;; les autres s'y joignent par invitation.
                </p>

                {/* Creator */}
                <button
                  onClick={() => handleBranchChoice("creator")}
                  disabled={branchLoading !== null}
                  className="w-full text-left rounded-2xl p-5 mb-4 transition-all active:scale-[0.98] disabled:opacity-50"
                  style={{
                    background: "#1E1E1E",
                    border:
                      branchLoading === "creator"
                        ? "2px solid var(--accent-primary)"
                        : "1px solid #282828",
                  }}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{
                        background: "color-mix(in srgb, var(--accent-primary) 20%, transparent)",
                      }}
                    >
                      <ShieldCheck
                        className="w-6 h-6"
                        style={{ color: "var(--accent-primary)" }}
                      />
                    </div>
                    <div className="flex-1">
                      <p className="text-white font-semibold">
                        Je crée mon organisation
                      </p>
                      <p className="text-[#808080] text-xs mt-1 leading-relaxed">
                        Administrateur — vous fondez l'organisation&nbsp;:
                        nom, type, thème et modules.
                      </p>
                    </div>
                    {branchLoading === "creator" && (
                      <div
                        className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin"
                        style={{
                          borderColor: "var(--accent-primary)",
                          borderTopColor: "transparent",
                        }}
                      />
                    )}
                  </div>
                </button>

                {/* Member */}
                <button
                  onClick={() => handleBranchChoice("member")}
                  disabled={branchLoading !== null}
                  className="w-full text-left rounded-2xl p-5 transition-all active:scale-[0.98] disabled:opacity-50"
                  style={{
                    background: "#1E1E1E",
                    border:
                      branchLoading === "member"
                        ? "2px solid var(--accent-primary)"
                        : "1px solid #282828",
                  }}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{
                        background:
                          "color-mix(in srgb, var(--accent-primary) 20%, transparent)",
                      }}
                    >
                      <UserPlus
                        className="w-6 h-6"
                        style={{ color: "var(--accent-primary)" }}
                      />
                    </div>
                    <div className="flex-1">
                      <p className="text-white font-semibold">
                        Je rejoins par invitation
                      </p>
                      <p className="text-[#808080] text-xs mt-1 leading-relaxed">
                        Membre / collaborateur — code, QR, fichier ou
                        proximité. Vous êtes intégré au rôle qui vous a été
                        attribué.
                      </p>
                    </div>
                    {branchLoading === "member" && (
                      <div
                        className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin"
                        style={{
                          borderColor: "var(--accent-primary)",
                          borderTopColor: "transparent",
                        }}
                      />
                    )}
                  </div>
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Illustration */}
              <div className="flex-shrink-0 px-8 pt-4 pb-2">
                <div
                  className="rounded-2xl overflow-hidden"
                  style={{ background: "#181818" }}
                >
                  {screen.illustration}
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 px-8 pt-8 pb-4">
                <p
                  className="text-sm font-semibold mb-2"
                  style={{
                    color:
                      screen.id === "welcome"
                        ? "var(--accent-primary)"
                        : "#808080",
                  }}
                >
                  {screen.subtitle}
                </p>
                <h1 className="text-white font-bold text-2xl leading-tight mb-3">
                  {screen.title}
                </h1>
                <p className="text-[#B3B3B3] text-sm leading-relaxed">
                  {screen.description}
                </p>
              </div>
            </>
          )}

          {/* Bottom */}
          <div className="px-8 pb-10">
            {/* Dots */}
            <div className="flex justify-center gap-1.5 mb-8">
              {Array.from({ length: totalDots }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-full transition-all"
                  style={{
                    width: i === current ? "24px" : "6px",
                    height: "6px",
                    backgroundColor:
                      i === current
                        ? "var(--accent-primary)"
                        : "#282828",
                  }}
                />
              ))}
            </div>

            {/* Buttons */}
            {isBranchStep ? (
              <div className="flex gap-3">
                <button
                  onClick={handleBack}
                  className="flex-1 py-3.5 rounded-full font-semibold text-sm transition-all active:scale-95"
                  style={{
                    backgroundColor: "#1E1E1E",
                    color: "#B3B3B3",
                    border: "1px solid #282828",
                  }}
                >
                  Précédent
                </button>
              </div>
            ) : (
              <div className="flex gap-3">
                <button
                  onClick={handleBack}
                  className="flex-1 py-3.5 rounded-full font-semibold text-sm transition-all active:scale-95"
                  style={{
                    backgroundColor: "#1E1E1E",
                    color: "#B3B3B3",
                    border: "1px solid #282828",
                  }}
                >
                  {current > 0 ? "Précédent" : "Ignorer"}
                </button>
                <button
                  onClick={handleNext}
                  className="flex-1 py-3.5 rounded-full font-semibold text-sm text-white transition-all active:scale-95 flex items-center justify-center gap-2"
                  style={{ backgroundColor: "var(--accent-primary)" }}
                >
                  Suivant
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
}
