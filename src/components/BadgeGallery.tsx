/**
 * BadgeGallery — galerie de badges (démonstration + banc d'essai visuel).
 *
 * Montre, dans l'application, l'ensemble des badges tokenisés : les 7 tons ×
 * 3 tailles × 2 variantes, puis les tables par domaine (transaction, versement,
 * événement, membre, organisation, rapport, invitation…). Comme chaque badge
 * tire sa couleur d'un token CSS, la galerie reflète IMMÉDIATEMENT le mode
 * courant (clair/sombre) et la couleur de marque choisie : changer de thème sur
 * la page Réglages › Thème re-peint toute la galerie sans rechargement.
 *
 * Sert aussi de référence de style pour les contributeurs : tout nouveau badge
 * doit passer par `Badge` + une table de `src/lib/badges.ts`, jamais par une
 * `colorMap` locale.
 */

import Badge from "@/components/Badge";
import {
  BADGE_TONE_TOKEN,
  CLAIM_BADGES,
  EVENT_BADGES,
  GROUP_BADGES,
  INVITATION_BADGES,
  MEMBER_BADGES,
  ORG_BADGES,
  ORDER_BADGES,
  REPORT_BADGES,
  SUBMISSION_BADGES,
  TASK_BADGES,
  TRANSACTION_BADGES,
  USER_BADGES,
  VERSEMENT_BADGES,
  type BadgeSpec,
  type BadgeTone,
} from "@/lib/badges";
import type { BadgeIconName } from "@/lib/badges";

const TONES = Object.keys(BADGE_TONE_TOKEN) as BadgeTone[];

const SECTIONS: { title: string; table: Record<string, BadgeSpec> }[] = [
  { title: "Transactions", table: TRANSACTION_BADGES },
  { title: "Versements", table: VERSEMENT_BADGES },
  { title: "Événements", table: EVENT_BADGES },
  { title: "Tâches", table: TASK_BADGES },
  { title: "Membres", table: MEMBER_BADGES },
  { title: "Groupes", table: GROUP_BADGES },
  { title: "Profils", table: USER_BADGES },
  { title: "Organisations", table: ORG_BADGES },
  { title: "Rapports", table: REPORT_BADGES },
  { title: "Demandes d'invitation", table: CLAIM_BADGES },
  { title: "Invitations", table: INVITATION_BADGES },
  { title: "Formulaires", table: SUBMISSION_BADGES },
  { title: "Commandes", table: ORDER_BADGES },
];

/** Exemples de badges libres (icônes « prêtes à l'emploi »). */
const FREE_BADGES: { label: string; tone: BadgeTone; icon: BadgeIconName }[] = [
  { label: "Nouveau", tone: "accent", icon: "sparkles" },
  { label: "Prioritaire", tone: "warning", icon: "zap" },
  { label: "Objectif atteint", tone: "success", icon: "target" },
  { label: "En hausse", tone: "success", icon: "trendUp" },
  { label: "En baisse", tone: "danger", icon: "trendDown" },
  { label: "Sécurisé", tone: "info", icon: "shieldCheck" },
  { label: "Premium", tone: "accent", icon: "award" },
  { label: "Verrouillé", tone: "muted", icon: "lock" },
];

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      className="rounded-xl p-4 mb-4"
      style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
    >
      <p className="text-text-primary font-semibold text-sm mb-3">{title}</p>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}

export default function BadgeGallery() {
  return (
    <div data-testid="badge-gallery">
      <Card title="Tons (badge neutre → accent)">
        {TONES.map((t) => (
          <Badge key={t} tone={t} label={t} icon="dot" />
        ))}
      </Card>

      <Card title="Tailles">
        <Badge tone="accent" label="xs" size="xs" icon="sparkles" />
        <Badge tone="accent" label="sm" size="sm" icon="sparkles" />
        <Badge tone="accent" label="md" size="md" icon="sparkles" />
      </Card>

      <Card title="Variantes (soft / outline)">
        {TONES.map((t) => (
          <Badge key={`s-${t}`} tone={t} label="soft" variant="soft" />
        ))}
        {TONES.map((t) => (
          <Badge key={`o-${t}`} tone={t} label="outline" variant="outline" />
        ))}
      </Card>

      <Card title="Pastille simple (sans icône)">
        {TONES.map((t) => (
          <Badge key={t} tone={t} label={t} dot />
        ))}
      </Card>

      <Card title="Badges libres (icônes prêtes à l'emploi)">
        {FREE_BADGES.map((b) => (
          <Badge key={b.label} tone={b.tone} label={b.label} icon={b.icon} size="md" />
        ))}
      </Card>

      {SECTIONS.map((s) => (
        <Card key={s.title} title={s.title}>
          {Object.entries(s.table).map(([key, spec]) => (
            <Badge key={key} spec={spec} />
          ))}
        </Card>
      ))}

      <Card title="Repli (statut inconnu)">
        <Badge table={TRANSACTION_BADGES} value="__INCONNU__" />
      </Card>
    </div>
  );
}
