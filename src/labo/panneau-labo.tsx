/**
 * Labo Design — Panneau « Labo » réservé au développement.
 *
 * Réservé au développement : exclu du bundle de production par le garde
 * `isLaboEnabled()` (appelé par le composant parent avant montage).
 *
 * Fonctions :
 *  - Changer de rôle (14 rôles RBAC)
 *  - Choisir l'état du réseau (en ligne, hors ligne, échec de synchro, N ops en attente)
 *  - Choisir le scénario de données (org neuve, normale, 5 000 transactions, noms très longs, montant géant)
 *  - Figer la date (horloge injectable)
 *  - Basculer entre thème clair et sombre
 */

import { useState } from "react";
import { X, RotateCw, Sun, Moon, Smartphone, BarChart3, Clock, Palette } from "lucide-react";
import { useLabo } from "./useLabo";

export interface PanneauLaboProps {
  open: boolean;
  onClose: () => void;
}

export function PanneauLabo({ open, onClose }: PanneauLaboProps) {
  const {
    enabled,
    scenario,
    role,
    networkState,
    pendingOps,
    dateFigée,
    themeMode,
    laboOpen,
    roles,
    scenarios,
    networkStates,
    setLaboOpen,
    handleRoleChange,
    handleScenarioChange,
    handleNetworkChange,
    handlePendingOpsChange,
    handleDateFigéeChange,
    handleThemeChange,
    handleReset,
  } = useLabo();

  if (!enabled) return null;

  const [showRéseau, setShowRéseau] = useState(false);
  const [showDonnées, setShowDonnées] = useState(false);
  const [showHorloge, setShowHorloge] = useState(false);
  const [showThème, setShowThème] = useState(false);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] bg-black/85 backdrop-blur-sm text-text-primary font-sans flex flex-col"
    >
      {/* Barre supérieure */}
      <div className="p-4 border-b border-border flex items-center justify-between bg-surface/80">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-md bg-accent-primary flex items-center justify-center">
            <Smartphone size={16} className="text-white" />
          </div>
          <span className="font-bold text-sm tracking-tight">Labo Design</span>
        </div>
        <button
          onClick={onClose}
          className="text-text-tertiary hover:text-text-primary p-2"
        >
          <X size={20} />
        </button>
      </div>

      {/* Corps défilant */}
      <div className="flex-1 overflow-y-auto p-6 grid gap-5">
        {/* En-tête état */}
        <div className="flex items-center gap-3">
          <div
            className={`w-2.5 h-2.5 rounded-full ${
              networkState === "online" ? "bg-in" : "bg-out"
            }`}
          />
          <span className="text-xs text-text-tertiary font-medium">
            Labo réservé au développement — {import.meta.env.DEV ? "dev" : "prod"}
          </span>
        </div>

        {/* 1. Rôle */}
        <section className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-accent-primary/15 flex items-center justify-center">
              <BarChart3 size={14} className="text-accent-primary" />
            </div>
            <span className="font-semibold text-sm">Rôle courant</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {roles.map((r) => (
              <button
                key={r.id}
                onClick={() => handleRoleChange(r.id)}
                className={`px-3 py-2 rounded-lg text-xs font-semibold text-left transition-colors ${
                  role === r.id
                    ? "border-accent-primary bg-accent-primary/10 text-accent-primary"
                    : "border-border bg-surface text-text-primary"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </section>

        {/* 2. Réseau */}
        <section
          onClick={() => setShowRéseau(!showRéseau)}
          className="flex flex-col gap-3 cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Smartphone size={16} className="text-text-tertiary" />
            <span className="font-semibold text-sm">État du réseau</span>
            <span
              className={`text-xs font-bold uppercase tracking-tighter px-2 py-0.5 rounded-full ${
                networkState === "online"
                  ? "bg-in/10 text-in"
                  : "bg-out/10 text-out"
              }`}
            >
              {networkState}
            </span>
          </div>
          {showRéseau && (
            <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {networkStates.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleNetworkChange(n.id)}
                  className={`px-3 py-2 rounded-lg text-xs font-semibold text-left transition-colors ${
                    networkState === n.id
                      ? "border-accent-primary bg-accent-primary/10 text-accent-primary"
                      : "border-border bg-surface text-text-primary"
                  }`}
                >
                  {n.label}
                </button>
              ))}
              {networkState === "pending-ops" && (
                <div className="col-span-2 p-2 text-xs text-text-tertiary flex items-center gap-2">
                  Opérations en attente{" "}
                  <input
                    type="number"
                    value={pendingOps}
                    onChange={(e) =>
                      handlePendingOpsChange(Number(e.target.value) || 0)
                    }
                    className="w-16 p-1 rounded bg-surface border border-border text-text-primary"
                  />
                </div>
              )}
            </div>
          )}
        </section>

        {/* 3. Données */}
        <section
          onClick={() => setShowDonnées(!showDonnées)}
          className="flex flex-col gap-3 cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <BarChart3 size={16} className="text-text-tertiary" />
            <span className="font-semibold text-sm">Scénario de données</span>
          </div>
          {showDonnées && (
            <div className="mt-2 grid gap-2">
              {scenarios.map((s) => (
                <button
                  key={s.id}
                  onClick={() => handleScenarioChange(s.id)}
                  className={`px-3 py-2 rounded-lg text-xs font-semibold text-left transition-colors ${
                    scenario === s.id
                      ? "border-accent-primary bg-accent-primary/10 text-accent-primary"
                      : "border-border bg-surface text-text-primary"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          )}
        </section>

        {/* 4. Date figée */}
        <section
          onClick={() => setShowHorloge(!showHorloge)}
          className="flex flex-col gap-3 cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-text-tertiary" />
            <span className="font-semibold text-sm">Horloge (date figée)</span>
          </div>
          {showHorloge && (
            <div className="mt-2 flex flex-col gap-2">
              <input
                type="date"
                value={dateFigée || ""}
                onChange={(e) => handleDateFigéeChange(e.target.value || null)}
                className="p-2 rounded-lg border border-border bg-surface text-text-primary"
              />
              <button
                onClick={() => handleDateFigéeChange(null)}
                className="px-3 py-1.5 rounded bg-surface text-text-tertiary text-xs hover:text-text-primary"
              >
                Réinitialiser (heure réelle)
              </button>
            </div>
          )}
        </section>

        {/* 5. Thème */}
        <section
          onClick={() => setShowThème(!showThème)}
          className="flex flex-col gap-3 cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Palette size={16} className="text-text-tertiary" />
            <span className="font-semibold text-sm">Thème</span>
          </div>
          {showThème && (
            <div className="mt-2 flex gap-3">
              {["system", "dark", "light"].map((m) => (
                <button
                  key={m}
                  onClick={() => handleThemeChange(m)}
                  className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
                    themeMode === m
                      ? "border-accent-primary bg-accent-primary/10 text-accent-primary"
                      : "border-border bg-surface text-text-primary"
                  }`}
                >
                  {m === "system" ? "Système" : m === "dark" ? "Sombre" : "Clair"}
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Reset */}
        <section className="mt-4 pt-4 border-t border-border">
          <button
            onClick={handleReset}
            className="w-full py-2.5 rounded-lg border border-text-tertiary text-text-tertiary text-sm font-semibold hover:text-text-primary"
          >
            <RotateCw size={16} className="mr-2" />
            Tout réinitialiser
          </button>
        </section>
      </div>

      {/* Pied */}
      <div className="p-4 border-t border-border flex justify-end">
        <button
          onClick={onClose}
          className="px-5 py-2 rounded-lg bg-accent-primary text-white text-sm font-bold"
        >
          Fermer le Labo
        </button>
      </div>
    </div>
  );
}
