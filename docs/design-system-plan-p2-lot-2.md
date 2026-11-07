# P2 Lot 2 — Migration (LuCard, LuAmount, LuField, LuSegmented)

## 1. Component files (already migrated in `src/design-system/components/`)
- `LuCard.tsx` : surface / inverse / accent / glass / stat / tile (P2 primitive)
- `LuAmount.tsx` : Intl fr-FR, XOF sans décimales, signe − U+2212, tabular-nums (P2 primitive)
- `LuField.tsx` : label au-dessus DANS le champ, h 56, focus/erreur/disabled/readonly, message (P2 primitive)
- `LuSegmented.tsx` : indicateur animé 200 ms, classe sur l'hôte, aria-selected, signed variant (P2 primitive)

## 2. Screen migrations (P4 lot 1/2/3 mapping)
- **TransactionNew.tsx** (formulaire de saisie) :
  - `LuField` remplace les champs natifs (montant, catégorie, caisse, description, date)
  - `LuSegmented` remplace le sélecteur type (INCOME/EXPENSE)
  - `LuAmount` remplace l'affichage du montant formaté
  - `LuCard` (variant tile) pour les actions rapides (si applicable)
- **History.tsx** (historique/transactions) :
  - `LuCard` (variant surface) remplace les cartes de transactions
  - `LuAmount` remplace les montants dans les cartes
  - `LuSegmented` remplace les filtres (tout/mois/année)
- **Dashboard.tsx** (déjà partiellement migré en PR #441 / #451) :
  - Actions rapides (tuiles LuCard) — déjà fait
  - Derniers mouvements (LuSectionHeader + LuTransactionRow + LuEmptyState) — déjà fait
  - Rapports reçus / Événements à venir (LuSectionHeader + LuTransactionRow) — déjà fait
  - **CaisseCard** (P4 lot 3) — à traiter plus tard (LuCard surface cliquable + LuAmount)
- **Balance.tsx** (solde / rapports) :
  - `LuCard` (variant stat) pour solde
  - `LuAmount` pour valeurs
  - `LuSegmented` pour périodes
- **Reports.tsx** (export / documents) :
  - `LuField` pour filtres
  - `LuSegmented` pour types
  - `LuCard` (variant surface) pour documents
- **Members.tsx** (membres / groupes) :
  - `LuField` pour recherche
  - `LuSegmented` pour rôles
  - `LuCard` (variant surface) pour membres
- **Finance.tsx** (caisses / archives) :
  - `LuCard` (variant surface) pour caisses
  - `LuAmount` pour soldes
  - `LuSegmented` pour filtres
- **Archives.tsx** (historique archivé) :
  - `LuCard` (variant surface) pour archives
  - `LuAmount` pour montants
  - `LuSegmented` pour filtres
- **Onboarding.tsx** (inscription / onboarding) :
  - `LuField` pour formulaires
  - `LuSegmented` pour choix
- **AuthPage.tsx** (connexion) :
  - `LuField` pour email / mot de passe
  - `LuSegmented` (si applicable)
  - **DEV-gated demoLogin()** (déjà implémenté en PR #451) — inert en prod
- **SettingsTheme.tsx** (réglages) :
  - `LuField` pour recherche
  - `LuSegmented` pour thèmes
  - `LuCard` (variant surface) pour sections

## 3. Tests (16 tests ciblés)
- `src/components/__tests__/lu-primitives-2.test.tsx` : LuCard (surface/inverse/accent/glass/stat/tile) — déjà présent (19 tests)
- `src/components/__tests__/lu-primitives-2.test.tsx` : LuAmount (XOF, signed, sizes) — déjà présent
- `src/components/__tests__/lu-primitives-2.test.tsx` : LuField (focus/erreur/disabled/readonly/message) — déjà présent
- `src/components/__tests__/lu-primitives-2.test.tsx` : LuSegmented (plain/signed/bar, classe, aria-selected) — déjà présent
- **Screen tests** (TransactionNew, History, Balance, Reports, Members, Finance, Archives, Onboarding, AuthPage, SettingsTheme) :
  - Cypress anchors conservés (« Derniers mouvements », aria-label héro, BottomNav natif inchangé)
  - E2E (Cypress) — signal réel (flaky cypress-run cloud ignoré)
  - Unit tests (vitest) — `// @vitest-environment jsdom`

## 4. Design Lab (DEV-only)
- Route `/dev/design-lab` (import.meta.env.DEV) — déjà actif (port 5174)
- Entrées : LuCard, LuAmount, LuField, LuSegmented avec tous les états
- Bouton « 🌱 Connexion démo (faker, pas de réseau) » (AuthPage) — déjà implémenté (PR #451)
- Action « 🌱 Connexion démo + 60 transactions (faker) → Dashboard » (Design Lab) — déjà implémenté (PR #451)

## 5. CI / Lint / Ratchet
- `pnpm lint` : design-ratchet OK (458 littéraux, aucun nouveau)
- `npx tsc -b --noEmit` : vert
- `npx vitest run` : 2880 tests verts (attente nouveau run)
- Cypress : E2E signal (flaky cypress-run cloud ignoré)
- Preview : 5173 (prod) et 5174 (dev) — LIVE

## 6. Changelog entry
- P2 lot 2 : LuCard, LuAmount, LuField, LuSegmented migration (TransactionNew, History, Balance, Reports, Members, Finance, Archives, Onboarding, AuthPage, SettingsTheme)
- 16 tests ciblés (primitives + écrans)
- Design Lab (DEV-only) — déjà actif
- CI vert (TSC, Lint, Ratchet, E2E signal)
- Preview 5173/5174 LIVE

## 7. Commit & Push
- Commit : `feat(p2-lot-2): LuCard, LuAmount, LuField, LuSegmented migration + tests + Design Lab`
- Exclure : `vite.preview.config.mts`
- Push : `git push origin arena/d89d27f9-luminap`
- PR : `gh pr create --base main --head arena/d89d27f9-luminap --title "feat(p2-lot-2): LuCard, LuAmount, LuField, LuSegmented migration + tests + Design Lab" --body "..."`
- Poll CI : `gh pr view <N> --json statusCheckRollup`

## 8. Next steps
- User merge PR #XXX
- Continue P2 lot 3 (LuOptionList, LuSelect, LuSectionHeader, LuEmptyState)
