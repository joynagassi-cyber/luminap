# Receipt — Phase 10 : badges tokenisés premium (thème-adaptatifs)

- **Date** : 2026-10-29
- **Branche** : `agent/phase-10-badges`
- **Priorité** : P2 (Phase 10 — design system)
- **Risque** : R117 (dérive visuelle silencieuse) — même classe que la garde
  jetons de design, étendue aux badges.

## Demande

Créer des badges **professionnels, tokenisés** (adaptés au thème actif : mode
clair/sombre + couleur de marque de l'organisation), avec des **icônes prêtes à
l'emploi** sous forme de badges.

## Défaut réel couvert

Les badges de statut étaient **dupliqués à la main** dans une dizaine de pages,
chacune avec sa `colorMap`/`labelMap` locale et sa propre recette de teinte
(`color-mix(..., 12%)`, `+ "20"`, hex). Conséquences mesurées :

- `OrgReportsReceived.tsx` définissait un `StatusBadge` local (4 statuts) ;
- `InvitationManage.tsx` définissait `CLAIM_CONFIG` + `STATUS_CONFIG` (11
  statuts) avec des couleurs **ad-hoc** (`var(--data-success)`, `--data-alert`,
  `--data-exhausted`) hors du nuancier standard ;
- toute retouche de palette ou ajout de statut laissait des badges divergents
  (même famille de défaut que M22 / R117).

Aucune garantie ne reliait un badge à un **token** : une couleur brute pouvait
être introduite silencieusement.

## Livrable

1. **`src/lib/badges.ts`** — catalogue unique (source de vérité) :
   - `BadgeTone` (7 tons) → `BADGE_TONE_TOKEN` (résolution vers `var(--…)`,
     **jamais de hex**) : `neutral`, `accent`, `info`, `success`, `warning`,
     `danger`, `muted` ;
   - `BadgeIconName` (39 icônes lucide « prêtes à l'emploi ») ;
   - 14 tables de statuts par domaine (`TRANSACTION_BADGES`, `VERSEMENT_BADGES`,
     `EVENT_BADGES`, `TASK_BADGES`, `MEMBER_BADGES`, `GROUP_BADGES`,
     `USER_BADGES`, `ORG_BADGES`, `REPORT_BADGES`, `CLAIM_BADGES`,
     `INVITATION_BADGES`, `SUBMISSION_BADGES`, `ORDER_BADGES`) ;
   - `resolveBadge(table, key)` : repli **neutre** affichant la clé brute.

2. **`src/components/Badge.tsx`** — composant `memo` :
   - icône optionnelle (registre `ICONS` interne), libellé FR, pastille `dot` ;
   - `size` (`xs`/`sm`/`md`), `variant` (`soft`/`outline`), `live` (role=status) ;
   - style **tokenisé** : `color: token`, `backgroundColor: tint(token, 12)`
     (color-mix) → suit `[data-theme]` et `--accent-primary` automatiquement ;
   - `aria-label="Statut : …"`.

3. **`src/components/BadgeGallery.tsx`** — galerie de démonstration (tons,
   tailles, variantes, pastilles, badges libres, toutes les tables, repli),
   montée dans **Réglages › Thème** (`SettingsTheme.tsx`) : la galerie se
   re-peint immédiatement quand l'utilisateur change de mode ou de couleur de
   marque — preuve visuelle vivante de la tokenisation.

4. **Unification** des badges ad-hoc :
   - `OrgReportsReceived.tsx` : `StatusBadge` local → `<Badge table={REPORT_BADGES}>` ;
   - `InvitationManage.tsx` : `CLAIM_CONFIG` local supprimé → `<Badge table={CLAIM_BADGES}>`.

## Tests

- **`src/lib/__tests__/badges.test.ts`** (20 tests) : chaque ton résout un
  `var(--…)` ; chaque token référencé **existe** dans `src/App.css` (source de
  vérité, lecture fichier) ; **aucune** table ne contient de hex/rgb ; les
  tables couvrent exactement les statuts du domaine (types TS + `ClaimStatus`) ;
  repli neutre.
- **`src/components/__tests__/Badge.test.tsx`** (12 tests) : texte
  `var(--data-income)` + fond `color-mix` ; pas de hex/rgb dans le style ;
  icône svg présente/absente ; `spec` ≡ `tone/label/icon` ; `table/value` ;
  repli ; `size`/`variant`/`dot`/`live`.

## Preuve de non-vacuité

La garde « tokens déclarés » lit réellement `src/App.css` : un ton pointant un
token inexistant fait échouer le test. La garde « couverture » compare aux
statuts du domaine : un statut ajouté sans badge échoue.

## Commandes et résultats

- `npx vitest run src/lib/__tests__/badges.test.ts src/components/__tests__/Badge.test.tsx`
  → **32 passed**
- `npx vitest run` (suite complète) → **1709 passed / 151 fichiers**
- `npx tsc -b --noEmit` → **0 erreur**
- `npx eslint` (fichiers touchés) → **0 erreur** (warnings pré-existants)

## Notes d'implémentation

- Le composant n'importe **pas** de couleurs : il reçoit un ton et lit
  `BADGE_TONE_TOKEN`. Toute évolution de palette passe par `App.css`.
- `tint()` (`src/lib/utils.ts`) est réutilisé (color-mix), plus de `+ "20"`.
- Les icônes sont des alias lucide **modernes** (`CircleCheck`, `TriangleAlert`,
  `LoaderCircle`…) — les alias dépréciés (`CheckCircle`, `AlertTriangle`) sont
  évités pour ne pas casser sur une montée de version.
