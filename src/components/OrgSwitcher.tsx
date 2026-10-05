/**
 * OrgSwitcher — Chips horizontales de sélecteur d'organisation (P2 du dashboard).
 *
 * Affiche le courant (label = ctx.label) + la liste `myOrgs` (au moins 2 pour
 * s'afficher). Le clic sur une org active appelle `enterOrganization(id)`
 * (capacité existante) qui ne bascule que si l'utilisateur a un grant actif
 * ou une membership — sinon la bascule est refusée (UI reste intouchée).
 *
 * Gating (non-régression) : si `myOrgs.length <= 1` ou `myOrgs === null`,
 * le composant renvoie `null` (P2 ne doit PAS apparaître pour un user mono-org).
 *
 * Design : chip = button natif + `--surface` + ring accent si active.
 */
import { Building2 } from "lucide-react";
import { useMyOrgs, useOrganizationContext, enterOrganization } from "@/lib/organization-context";

export default function OrgSwitcher() {
  const ctx = useOrganizationContext();
  const { data: myOrgs } = useMyOrgs();

  // Non-régression : 0 ou 1 org → on ne s'affiche pas (P2 invisible).
  if (!myOrgs || myOrgs.length <= 1) return null;

  const handleSwitch = async (orgId: string) => {
    if (orgId === ctx.orgId) return;
    const next = await enterOrganization(orgId);
    if (!next) {
      // Accès refusé : on affiche un message transitoire, on ne bascule pas.
      // Pour l'instant on laisse le message au console (le RLS arbitre côté
      // serveur) ; une future version pourra lever un toast ionic.
      console.info(`[org] switch refusable vers ${orgId} — accès refusé`);
    }
  };

  return (
    <div
      role="tablist"
      aria-label="Sélection d'organisation"
      className="flex items-center gap-2 overflow-x-auto pb-1 mb-4"
      style={{ scrollbarWidth: "none" } as React.CSSProperties}
    >
      {myOrgs.map((o) => {
        const active = o.orgId === ctx.orgId;
        return (
          <button
            key={o.orgId}
            role="tab"
            aria-selected={active}
            onClick={() => handleSwitch(o.orgId)}
            className="text-xs font-semibold whitespace-nowrap transition-all active:scale-95"
            style={{
              backgroundColor: active ? "color-mix(in srgb, var(--accent-primary) 14%, transparent)" : "var(--surface)",
              border: `1px solid ${active ? "var(--accent-primary)" : "var(--border)"}`,
              borderRadius: 999,
              padding: "6px 12px",
              color: active ? "var(--accent-primary)" : "var(--text-secondary)",
              opacity: o.status !== "ACTIVE" ? 0.6 : 1,
            }}
          >
            <Building2 className="w-3.5 h-3.5 inline mr-1 -mt-0.5" />
            {o.name}
            {o.status !== "ACTIVE" && (
              <span className="ml-1 text-text-tertiary">· {o.status.toLowerCase()}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
