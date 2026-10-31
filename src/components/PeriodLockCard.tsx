/**
 * PeriodLockCard — contrôle admin du gel de période comptable (PR13).
 *
 * Permet de fixer une DATE DE CLÔTURE (incluse) : toute transaction datée
 * on/before cette date ne peut plus être créée, modifiée, supprimée, contredite
 * ni approuvée (voir `src/lib/periodLock.ts` + le point d'étranglement dans
 * `dataLayer`). Permet aussi de ROUVRIR la période.
 *
 * Accès : permission canon `finance:manage` (via `useCanAccessMulti`, qui unit
 * le chemin fédéré et le chemin legacy). Un non-autorisé ne voit PAS le
 * contrôle — pas de bouton inerte.
 *
 * R52 : tant que la clôture n'a pas été lue (`loading`), on affiche un
 * squelette et JAMAIS « aucune clôture » (fait faux avant la 1re lecture).
 */
import { useState } from "react";
import { Lock, Unlock, Loader2, CalendarClock } from "lucide-react";
import { useCurrentUser, isPowerSyncReadyNow } from "@/lib/dataLayer";
import { useCanAccessMulti } from "@/hooks/useCanAccessMulti";
import { usePeriodLock } from "@/hooks/usePeriodLock";
import { getOrganizationId } from "@/lib/orgContext";
import { captureClientError } from "@/lib/clientErrors";
import { toast } from "@/components/ui/use-toast";
import type { Role } from "@/types";

/** `2026-10-31` → `31/10/2026` (affichage FR). */
function formatFr(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
}

export default function PeriodLockCard() {
  const user = useCurrentUser();
  const orgId = getOrganizationId() || user?.org?.id || "";
  const { allowed } = useCanAccessMulti(
    user?.id,
    orgId,
    "finance",
    "manage",
    undefined,
    user?.role as Role | undefined,
  );
  const { lockedUntil, loading, setLock, clearLock } = usePeriodLock();
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);

  if (!allowed) return null;

  const handleLock = async () => {
    if (busy) return;
    const date = draft || new Date().toISOString().split("T")[0];
    setBusy(true);
    try {
      const ok = await setLock(date);
      if (ok) {
        toast({
          title: "Période clôturée",
          description: `Les écritures jusqu'au ${formatFr(date)} inclus sont désormais bloquées.`,
        });
        setDraft("");
      } else {
        toast({
          title: "Échec de la clôture",
          description: "La date de clôture n'a pas pu être enregistrée.",
          variant: "destructive",
        });
      }
    } catch (err) {
      captureClientError(err, {
        message: "Clôture de période échouée",
        route: "/settings/gestion",
      });
      toast({
        title: "Échec de la clôture",
        description: "La date de clôture n'a pas pu être enregistrée.",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  const handleClear = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const ok = await clearLock();
      if (ok) {
        toast({
          title: "Période rouverte",
          description: "Les écritures sont de nouveau autorisées sur toutes les dates.",
        });
      } else {
        toast({
          title: "Échec de la réouverture",
          description: "La clôture n'a pas pu être retirée.",
          variant: "destructive",
        });
      }
    } catch (err) {
      captureClientError(err, {
        message: "Réouverture de période échouée",
        route: "/settings/gestion",
      });
      toast({
        title: "Échec de la réouverture",
        description: "La clôture n'a pas pu être retirée.",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      data-testid="period-lock-card"
      className="rounded-xl p-4 mt-5"
      style={{
        backgroundColor: "var(--surface)",
        border: "1px solid var(--border)",
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        <CalendarClock
          className="w-5 h-5"
          style={{ color: "var(--accent-primary)" }}
        />
        <span className="text-text-primary text-sm font-semibold">
          Gel de période comptable
        </span>
      </div>

      {loading || (!isPowerSyncReadyNow() && lockedUntil === null) ? (
        <div
          data-testid="period-lock-pending"
          aria-busy="true"
          className="flex items-center gap-2 text-text-tertiary text-xs py-2"
        >
          <Loader2 className="w-4 h-4 animate-spin" />
          Chargement de la clôture…
        </div>
      ) : (
        <p
          data-testid="period-lock-status"
          className="text-text-tertiary text-xs mb-3"
        >
          {lockedUntil
            ? `Période clôturée jusqu'au ${formatFr(lockedUntil)} inclus — aucune écriture sur cette période.`
            : "Aucune période clôturée : toutes les écritures sont autorisées."}
        </p>
      )}

      <label
        htmlFor="period-lock-date"
        className="text-text-secondary text-xs font-medium"
      >
        Clôturer jusqu'au (inclus)
      </label>
      <input
        id="period-lock-date"
        data-testid="period-lock-date"
        type="date"
        value={draft}
        disabled={busy}
        onChange={(e) => setDraft(e.target.value)}
        className="w-full mt-1 mb-3 p-3 rounded-xl text-sm"
        style={{
          backgroundColor: "var(--card)",
          color: "var(--text-primary)",
          border: "1px solid var(--border)",
        }}
      />

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void handleLock()}
          disabled={busy}
          data-testid="period-lock-set"
          className="flex-1 min-w-[140px] flex items-center justify-center gap-2 p-3 rounded-xl active:scale-95 transition-transform text-sm font-semibold disabled:opacity-50"
          style={{
            backgroundColor:
              "color-mix(in srgb, var(--accent-primary) 15%, transparent)",
            color: "var(--accent-primary)",
            border: "1px solid var(--border)",
          }}
        >
          {busy ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Lock className="w-4 h-4" />
          )}
          Clôturer la période
        </button>
        <button
          type="button"
          onClick={() => void handleClear()}
          disabled={busy || !lockedUntil}
          data-testid="period-lock-clear"
          className="flex-1 min-w-[140px] flex items-center justify-center gap-2 p-3 rounded-xl active:scale-95 transition-transform text-sm font-semibold disabled:opacity-50"
          style={{
            backgroundColor: "var(--card)",
            color: "var(--text-primary)",
            border: "1px solid var(--border)",
          }}
        >
          <Unlock className="w-4 h-4" />
          Rouvrir la période
        </button>
      </div>
    </div>
  );
}
