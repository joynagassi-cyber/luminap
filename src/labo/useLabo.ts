/**
 * Labo Design — Hook de liaison.
 *
 * Relie le panneau Labo au store Zustand (`useLocalStore`) et aux faux
 * adaptateurs, sans toucher au backend (PowerSync / Supabase restés en
 * local-only).
 *
 * États gérés :
 *  - rôle courant (via `selectRole` + session factice)
 *  - scénario de données (génération + injection dans le store)
 *  - état du réseau (en ligne / hors ligne / échec de synchro / N ops en attente)
 *  - date figée (horloge injectable)
 *  - thème clair/sombre
 */

import { useState, useCallback } from "react";
import { useLocalStore } from "@/store/useLocalStore";
import { useThemeModeStore } from "@/store/useThemeModeStore";
import { setOrganizationId } from "@/lib/orgContext";
import {
  generateLaboSeed,
  type LaboSeedData,
  type LaboScenario,
} from "./seed";
import {
  setFauxRole,
  signOutFaux,
  setFauxGoogleFailure,
} from "./faux-adaptateurs";
import { isLaboEnabled } from "./labo-guard";

const ROLES: Array<{ id: string; label: string }> = [
  { id: "ADMIN", label: "Administrateur" },
  { id: "PASTEUR_PRINCIPAL", label: "Pasteur Principal" },
  { id: "PASTEUR_ASSOCIE", label: "Pasteur Associé" },
  { id: "PASTEUR_JEUNESSE", label: "Pasteur Jeunesse" },
  { id: "ANCIEN", label: "Ancien" },
  { id: "DIACRE", label: "Diacre" },
  { id: "RESPONSABLE_DEPARTEMENT", label: "Responsable Département" },
  { id: "SECRETAIRE", label: "Secrétaire" },
  { id: "SECRETAIRE_ADJOINT", label: "Secrétaire Adjoint" },
  { id: "TREASURIER", label: "Trésorier" },
  { id: "TREASURIER_ADJOINT", label: "Trésorier Adjoint" },
  { id: "COMPTABLE", label: "Comptable" },
  { id: "RESPONSABLE_GROUPE", label: "Responsable Groupe" },
  { id: "BENEVOLE", label: "Bénévole" },
  { id: "MEMBRE", label: "Membre" },
];

const SCENARIOS: Array<{ id: LaboScenario; label: string }> = [
  { id: "org-neuve", label: "Organisation neuve (vide)" },
  { id: "org-normale", label: "Organisation normale" },
  { id: "5000-transactions", label: "5 000 transactions (stress)" },
  { id: "noms-longs", label: "Noms très longs" },
  { id: "montant-geant", label: "Montant géant" },
];

const NETWORK_STATES: Array<{ id: string; label: string }> = [
  { id: "online", label: "En ligne" },
  { id: "offline", label: "Hors ligne" },
  { id: "sync-error", label: "Échec de synchro" },
  { id: "pending-ops", label: "N opérations en attente" },
];

export function useLabo() {
  const { selectRole, setOnline, transactions, setTransactions } =
    useLocalStore();
  const { mode: themeMode, setMode } = useThemeModeStore();

  const [scenario, setScenario] = useState<LaboScenario>("org-normale");
  const [role, setRole] = useState<string>("PASTEUR_PRINCIPAL");
  const [networkState, setNetworkState] = useState<string>("online");
  const [pendingOps, setPendingOps] = useState<number>(0);
  const [dateFigée, setDateFigée] = useState<string | null>(null);
  const [laboOpen, setLaboOpen] = useState(false);

  // ── Rôle ──
  const handleRoleChange = useCallback(
    (nextRole: string) => {
      setRole(nextRole);
      setFauxRole(nextRole as any);
      void selectRole(nextRole as any);
    },
    [selectRole],
  );

  // ── Scénario ──
  const handleScenarioChange = useCallback(
    (nextScenario: LaboScenario) => {
      setScenario(nextScenario);
      const seed: LaboSeedData = generateLaboSeed(nextScenario);
      // Injection de TOUTES les collections dans le store Zustand
      // (données locales seulement, pas de backend).
      useLocalStore.setState({
        transactions: seed.transactions,
        members: seed.members,
        caisses: seed.caisses,
        accounts: seed.accounts,
        groups: seed.groups,
        events: seed.events,
        cotisations: seed.cotisations,
        categories: seed.categories,
      });
      // Résoudre l'organisation courante pour que les composants qui lisent
      // getOrganizationId() (ex. useOrganizations("mine")) voient l'org du
      // scénario au lieu de "__no_org__".
      setOrganizationId(seed.org.id);
      try {
        localStorage.setItem("lumina-active-org", seed.org.id);
      } catch {
        /* stockage indisponible — le contexte mémoire suffit pour la session */
      }
    },
    [],
  );

  // ── Réseau ──
  const handleNetworkChange = useCallback(
    (nextState: string) => {
      setNetworkState(nextState);
      setOnline(nextState === "online");
    },
    [setOnline],
  );

  const handlePendingOpsChange = useCallback((n: number) => {
    setPendingOps(n);
  }, []);

  // ── Date figée ──
  const handleDateFigéeChange = useCallback((next: string | null) => {
    setDateFigée(next);
    // L'horloge injectable est consommée par les composants via useDate().
  }, []);

  // ── Thème ──
  const handleThemeChange = useCallback((next: "system" | "dark" | "light") => {
    setMode(next);
  }, [setMode]);

  // ── Reset ──
  const handleReset = useCallback(() => {
    setRole("PASTEUR_PRINCIPAL");
    setFauxRole("PASTEUR_PRINCIPAL");
    void selectRole("PASTEUR_PRINCIPAL" as any);
    setScenario("org-normale");
    setNetworkState("online");
    setPendingOps(0);
    setDateFigée(null);
    setMode("system");
  }, [selectRole, setMode]);

  return {
    // Guard
    enabled: isLaboEnabled(),
    // États
    scenario,
    role,
    networkState,
    pendingOps,
    dateFigée,
    themeMode,
    laboOpen,
    // Listes pour le UI
    roles: ROLES,
    scenarios: SCENARIOS,
    networkStates: NETWORK_STATES,
    // Actions
    setLaboOpen,
    handleRoleChange,
    handleScenarioChange,
    handleNetworkChange,
    handlePendingOpsChange,
    handleDateFigéeChange,
    handleThemeChange,
    handleReset,
  };
}
