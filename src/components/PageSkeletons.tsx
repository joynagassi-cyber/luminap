import { type ReactNode } from "react";
import {
  ShimmerBlock,
  ShimmerCard,
  ShimmerHeroCard,
  ShimmerLine,
  ShimmerList,
  ShimmerStatCard,
} from "./Shimmer";

/* ────────────────────────────────────────────────────────────────────
 * Skeletons structurels par page — Lumina.
 *
 * Chaque page a SA propre structure (pas de FullPageSkeleton générique).
 * On distingue :
 *   - `Shell` : conteneur carte de surface statique (bg var(--surface),
 *     radius 4, shadow-card) qui héberge des fragments shimmer à l'intérieur.
 *   - Les fragments `Shimmer*` : le mouvement, pas la structure.
 *
 * Tous les blocs déclarent `aria-busy` sur le conteneur racine ; le
 * shimmer est respecté par `prefers-reduced-motion` via `.shimmer`.
 * ──────────────────────────────────────────────────────────────────── */

function Shell({
  children,
  className = "",
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={className}
      style={{
        background: "var(--surface)",
        borderRadius: "var(--skeleton-radius)",
        boxShadow: "var(--shadow-card, 0 4px 12px rgba(0,0,0,0.3))",
        padding: 16,
        ...style,
      }}
      aria-hidden="true"
    >
      {children}
    </div>
  );
}

/** Pastille filtre (pill 14px). */
function Pill({ width = 96 }: { width?: number }) {
  return (
    <ShimmerBlock width={width} height={28} radius={14} />
  );
}

/* ── Dashboard : hero + grille 2×2 stat + liste caisses (4) + transactions (3) ── */
export function DashboardSkeleton() {
  return (
    <div className="p-5 space-y-4" aria-busy="true">
      <Shell>
        <ShimmerLine width="30%" height={12} />
        <ShimmerBlock width="70%" height={48} radius={8} style={{ margin: "10px 0" }} />
      </Shell>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <ShimmerStatCard />
        <ShimmerStatCard />
        <ShimmerStatCard />
        <ShimmerStatCard />
      </div>
      <Shell>
        <div style={{ display: "grid", gap: 12 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <ShimmerBlock width={40} height={40} radius="50%" />
              <ShimmerLine width="55%" height={12} />
              <ShimmerLine width={56} height={14} style={{ marginLeft: "auto" }} />
            </div>
          ))}
        </div>
      </Shell>
    </div>
  );
}

/* ── Finance : barre filtres (3 pills) + hero bilan + 6 lignes grand livre ── */
export function FinanceSkeleton() {
  return (
    <div className="p-5 space-y-4" aria-busy="true">
      <div style={{ display: "flex", gap: 8 }}>
        <Pill width={80} />
        <Pill width={96} />
        <Pill width={112} />
      </div>
      <ShimmerHeroCard />
      <Shell>
        <div style={{ display: "grid", gap: 10 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <ShimmerBlock width={10} height={10} radius="50%" />
              <ShimmerLine width="42%" height={12} />
              <ShimmerLine
                width={64}
                height={14}
                style={{ marginLeft: "auto", fontVariantNumeric: "tabular-nums" }}
              />
            </div>
          ))}
        </div>
      </Shell>
    </div>
  );
}

/* ── Groupes : grille 2 cols × 3 cartes (avatar + nom + solde) ── */
export function GroupsSkeleton() {
  return (
    <div className="p-5" aria-busy="true">
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <Shell key={i}>
            <ShimmerBlock width={44} height={44} radius="50%" />
            <ShimmerLine width="70%" height={14} style={{ margin: "12px 0 6px" }} />
            <ShimmerLine width="45%" height={12} />
          </Shell>
        ))}
      </div>
    </div>
  );
}

/* ── GroupeDetail : header + hero caisse + 3 onglets list-shimmer ── */
export function GroupDetailSkeleton() {
  return (
    <div className="p-5 space-y-4" aria-busy="true">
      <Shell>
        <ShimmerBlock width={48} height={48} radius="50%" />
        <ShimmerLine width="55%" height={16} style={{ margin: "12px 0 4px" }} />
        <ShimmerLine width="35%" height={10} />
      </Shell>
      <ShimmerHeroCard />
      <div style={{ display: "flex", gap: 8 }}>
        <Pill width={90} />
        <Pill width={90} />
        <Pill width={90} />
      </div>
      <ShimmerList count={4} minHeight={56} />
    </div>
  );
}

/* ── Événements : barre période + liste (date + nom + budget) ── */
export function EventsSkeleton() {
  return (
    <div className="p-5 space-y-4" aria-busy="true">
      <div style={{ display: "flex", gap: 8 }}>
        <Pill width={100} />
        <Pill width={88} />
      </div>
      <div style={{ display: "grid", gap: 12 }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <Shell key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: 14 }}>
            <ShimmerBlock width={44} height={44} radius={8} />
            <div className="flex-1 space-y-2">
              <ShimmerLine width="60%" height={14} />
              <ShimmerLine width="40%" height={10} />
            </div>
            <ShimmerLine width={60} height={14} style={{ fontVariantNumeric: "tabular-nums" }} />
          </Shell>
        ))}
      </div>
    </div>
  );
}

/* ── ÉvénementDetail : header + budget lines + quick-entry block ── */
export function EventDetailSkeleton() {
  return (
    <div className="p-5 space-y-4" aria-busy="true">
      <Shell>
        <ShimmerLine width="45%" height={16} style={{ marginBottom: 8 }} />
        <ShimmerLine width="30%" height={10} />
      </Shell>
      <Shell>
        <div style={{ display: "grid", gap: 10 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} style={{ display: "flex", gap: 12 }}>
              <ShimmerLine width="60%" height={12} />
              <ShimmerLine width={64} height={14} style={{ marginLeft: "auto" }} />
            </div>
          ))}
        </div>
      </Shell>
      <ShimmerCard minHeight={112} />
    </div>
  );
}

/* ── Cotisations : stats (payé/en attente/total) + tableau rows ── */
export function CotisationsSkeleton() {
  return (
    <div className="p-5 space-y-4" aria-busy="true">
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
        <ShimmerStatCard />
        <ShimmerStatCard />
        <ShimmerStatCard />
      </div>
      <ShimmerList count={6} minHeight={52} />
    </div>
  );
}

/* ── GroupeCotisation : sélecteur période + grid membres (avatar + nom + pastille) ── */
export function GroupCotisationSkeleton() {
  return (
    <div className="p-5 space-y-4" aria-busy="true">
      <Pill width={140} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <Shell key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: 12 }}>
            <ShimmerBlock width={36} height={36} radius="50%" />
            <ShimmerLine width="55%" height={12} />
            <ShimmerBlock width={44} height={20} radius={10} style={{ marginLeft: "auto" }} />
          </Shell>
        ))}
      </div>
    </div>
  );
}

/* ── Membres : liste (avatar + nom + rôle) ── */
export function MembersSkeleton() {
  return (
    <div className="p-5" aria-busy="true">
      <ShimmerList count={8} minHeight={56} />
    </div>
  );
}

/* ── MembreDetail : sections profil / cotisations ── */
export function MembreDetailSkeleton() {
  return (
    <div className="p-5 space-y-4" aria-busy="true">
      <Shell style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <ShimmerBlock width={56} height={56} radius="50%" />
        <div className="flex-1 space-y-2">
          <ShimmerLine width="55%" height={16} />
          <ShimmerLine width="35%" height={10} />
        </div>
      </Shell>
      <Shell>
        <div style={{ display: "grid", gap: 10 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <ShimmerLine key={i} width={i % 2 ? "70%" : "85%"} height={12} />
          ))}
        </div>
      </Shell>
      <ShimmerList count={3} minHeight={52} />
    </div>
  );
}

/* ── MembresEnAvance : liste de membres ── */
export function MembresEnAvanceSkeleton() {
  return (
    <div className="p-5" aria-busy="true">
      <ShimmerList count={6} minHeight={56} />
    </div>
  );
}

/* ── Versement : sélecteur groupe + montant block + récap (depuis/vers) ── */
export function VersementSkeleton() {
  return (
    <div className="p-5 space-y-4" aria-busy="true">
      <Shell>
        <ShimmerLine width="25%" height={10} style={{ marginBottom: 8 }} />
        <ShimmerBlock width="100%" height={48} radius={8} />
      </Shell>
      <Shell>
        <ShimmerBlock width="55%" height={56} radius={8} style={{ margin: "4px 0 12px" }} />
      </Shell>
      <Shell>
        <div style={{ display: "grid", gap: 12 }}>
          <div style={{ display: "flex", gap: 12 }}>
            <ShimmerBlock width={36} height={36} radius="50%" />
            <ShimmerLine width="40%" height={12} />
          </div>
          <ShimmerBlock width={28} height={28} radius="50%" />
          <div style={{ display: "flex", gap: 12 }}>
            <ShimmerBlock width={36} height={36} radius="50%" />
            <ShimmerLine width="40%" height={12} />
          </div>
        </div>
      </Shell>
    </div>
  );
}

/* ── Formulaires (liste) ── */
export function FormsSkeleton() {
  return (
    <div className="p-5" aria-busy="true">
      <ShimmerList count={5} minHeight={64} />
    </div>
  );
}

/* ── FormBuilder (canvas 2 colonnes) ── */
export function FormBuilderSkeleton() {
  return (
    <div className="p-5" aria-busy="true">
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <Shell>
          <div style={{ display: "grid", gap: 10 }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <ShimmerLine key={i} width="80%" height={12} />
            ))}
          </div>
        </Shell>
        <Shell>
          <div style={{ display: "grid", gap: 10 }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <ShimmerLine key={i} width="70%" height={12} />
            ))}
          </div>
        </Shell>
      </div>
    </div>
  );
}

/* ── FormSubmissions (tableau) ── */
export function FormSubmissionsSkeleton() {
  return (
    <div className="p-5 space-y-4" aria-busy="true">
      <ShimmerLine width="30%" height={12} />
      <ShimmerList count={5} minHeight={64} />
    </div>
  );
}

/* ── FormFill (formulaire vide) ── */
export function FormFillSkeleton() {
  return (
    <div className="p-5 space-y-4" aria-busy="true">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} style={{ display: "grid", gap: 6 }}>
          <ShimmerLine width="30%" height={10} />
          <ShimmerBlock width="100%" height={48} radius={8} />
        </div>
      ))}
    </div>
  );
}

/* ── Rapports : liste + preview chart ── */
export function ReportsSkeleton() {
  return (
    <div className="p-5 space-y-4" aria-busy="true">
      <ShimmerList count={4} minHeight={64} />
      <Shell>
        <ShimmerBlock width="100%" height={160} radius={4} />
      </Shell>
    </div>
  );
}

/* ── ReportBuilder : liste rapports + preview chart ── */
export function ReportBuilderSkeleton() {
  return (
    <div className="p-5 space-y-4" aria-busy="true">
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <Shell>
          <div style={{ display: "grid", gap: 10 }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <ShimmerLine key={i} width="75%" height={12} />
            ))}
          </div>
        </Shell>
        <Shell>
          <ShimmerBlock width="100%" height={180} radius={4} />
        </Shell>
      </div>
    </div>
  );
}

/* ── Archives : rows ── */
export function ArchivesSkeleton() {
  return (
    <div className="p-5" aria-busy="true">
      <ShimmerList count={6} minHeight={56} />
    </div>
  );
}

/* ── Notifications : 5 rows avec pastilles ── */
export function NotificationsSkeleton() {
  return (
    <div className="p-5 space-y-0" aria-busy="true">
      <div style={{ display: "grid", gap: 12 }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <Shell key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: 14 }}>
            <ShimmerBlock width={32} height={32} radius="50%" />
            <div className="flex-1 space-y-2">
              <ShimmerLine width="65%" height={12} />
              <ShimmerLine width="45%" height={10} />
            </div>
            <ShimmerBlock width={36} height={16} radius={8} />
          </Shell>
        ))}
      </div>
    </div>
  );
}

/* ── Settings : sections (sync, stockage, thème) en cards ── */
export function SettingsSkeleton() {
  return (
    <div className="p-5 space-y-4" aria-busy="true">
      {Array.from({ length: 3 }).map((_, i) => (
        <Shell key={i}>
          <ShimmerLine width="35%" height={12} style={{ marginBottom: 12 }} />
          <div style={{ display: "grid", gap: 10 }}>
            <ShimmerLine width="100%" height={12} />
            <ShimmerLine width="80%" height={12} />
          </div>
        </Shell>
      ))}
    </div>
  );
}

/* ── Federation Tree : diagramme React Flow (nœuds en cascade) ── */
export function FederationTreeSkeleton() {
  const node = (w = "100%") => (
    <div style={{ flex: 1 }}>
      <ShimmerBlock width={w} height={64} radius={8} />
    </div>
  );
  return (
    <div aria-busy="true">
      <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>{node()}</div>
      <div
        style={{
          display: "flex",
          gap: 12,
          marginBottom: 16,
          marginLeft: 28,
        }}
      >
        {node()}
        {node()}
      </div>
      <div style={{ marginLeft: 56 }}>{node()}</div>
    </div>
  );
}

/* ── Invitations (emit/claim/manage) : cards + liste ── */
export function InvitationsSkeleton() {
  return (
    <div className="p-5 space-y-4" aria-busy="true">
      <Shell>
        <ShimmerLine width="30%" height={12} style={{ marginBottom: 10 }} />
        <ShimmerBlock width="100%" height={48} radius={8} />
      </Shell>
      <ShimmerList count={4} minHeight={56} />
    </div>
  );
}
