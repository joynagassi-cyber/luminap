# PROMPT META — Équipe de Codage Autonome — Projet Lumina

## 1. CONTEXTE DU PROJET

**Nom :** Lumina — Gestion financière et organisationnelle pour organisations (églises, écoles, associations, entreprises).

**Objectif :** Livrer une application frontend React + Ionic complète, câblée au backend PowerSync/Supabase, avec design system Apple/Google, tests statiques et tests E2E Cypress, prête pour production.

**Branche de travail :** `arena/db368bef-luminap` (ne JAMAIS switcher de branche, ne JAMAIS push sur `main` directement).

**Stack technique :**
- React 19 + TypeScript strict
- Vite + Rolldown
- Ionic Framework (iOS mode) pour la navigation mobile-first
- Framer Motion pour les animations et micro-interactions
- Tailwind CSS v3.4.19 + @tailwindcss/forms + tailwindcss-animate
- PowerSync (SQLite local-first) + Supabase (backend)
- Lucide React pour les icônes
- TanStack Query pour le cache serveur
- Vitest pour les tests unitaires
- Cypress pour les tests E2E
- Sentry pour le monitoring d'erreurs

---

## 2. DESIGN SYSTEM (OBLIGATOIRE)

Tous les fichiers du design system se trouvent dans `src/design/` :

### Tokens (`src/design/tokens.ts`)
- **Typographie :** Inter, tailles xs→4xl, graisses 100→800, interlettrage, hauteurs de ligne
- **Espacement :** échelle 8px (0, 1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24)
- **Bordures & Radius :** none, sm (4px), md (8px), lg (12px), xl (16px), full
- **Ombres :** card, pop, accent, accent-sm, fab (référencent `var(--shadow-*)`)
- **Mouvement :** durées instant/fast/normal/slow/slower, courbes ease/easeIn/easeOut/spring/bounce, stagger 50ms
- **Couleurs :** UNIQUEMENT des références `var(--*)` vers `src/App.css`. ZÉRO couleur brute (hex/rgb/hsl).
- **Références CSS clés :** `--canvas`, `--surface`, `--surface-hover`, `--text-primary`, `--text-secondary`, `--text-tertiary`, `--accent-primary`, `--on-accent`, `--border`, `--in`, `--out`, `--warn`, `--scrim`

### Composants Motion
- `MotionCard` — variant flat/elevated/accent, hover scale, tap press, entrée animée
- `MotionList` — apparition staggered, AnimatePresence pour enter/exit
- `PageTransition` — transition fluide entre les pages
- `FormField` — champ avec label, erreur, helper, focus (@tailwindcss/forms)

### Règles de design (non négociables)
1. **Interface en français uniquement**
2. **Zéro couleur brute** — utiliser `var(--*)` ou les aliases Tailwind pointant vers des CSS vars
3. **Ancres Cypress préservées** — `data-testid`, `data-screen-state` sur chaque écran
4. **Hitzone tactile minimale 44px** (Apple) / 48px (Google)
5. **Polissage Apple/Google** : coins arrondis doux, ombres subtiles, micro-interactions hover/tap, typographie grande et lisible, espacement généreux
6. **Mode clair/sombre** supporté via `data-theme` sur `<html>`

---

## 3. FLUX UTILISATEUR (NOUVEL ORDRE — OBLIGATOIRE)

L'ordre a été permuté. L'organisation se crée **après** l'authentification immédiate.

```
┌─────────────────────────────────────────────────────────────────┐
│  ÉTAPE 1 : AUTHENTIFICATION                                     │
│  /auth — Connexion email/mot de passe ou création de compte     │
│  (mode demo local-only si pas de Supabase configuré)            │
└─────────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────────┐
│  ÉTAPE 2 : CHOIX DU PARCOURS                                    │
│  /onboarding/choice                                             │
│  ├─ "Je crée mon organisation" → ÉTAPE 3A                       │
│  └─ "Je rejoins par invitation" → ÉTAPE 3B                      │
└─────────────────────────────────────────────────────────────────┘
                          ↓ (si créateur)
┌─────────────────────────────────────────────────────────────────┐
│  ÉTAPE 3A : CRÉATION D'ORGANISATION                            │
│  /org-setup                                                     │
│  - Identité (nom, sigle)                                        │
│  - Type (Église, École, Entreprise, etc.)                       │
│  - Thème de marque                                              │
│  - Modules à activer                                            │
│  - Rôle du créateur                                             │
│  - Bouton "Créer l'organisation"                                │
└─────────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────────┐
│  ÉTAPE 4 : ONBOARDING (présentation des fonctionnalités)        │
│  /onboarding                                                    │
│  - 7 écrans de présentation avec illustrations vectorielles     │
│  - Navigation Précédent/Suivant + progression (dots)            │
│  - Dernière page → bouton "Terminer" → redirige vers /onboarding/members│
└─────────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────────┐
│  ÉTAPE 5 : AJOUT MEMBRES DE L'ÉQUIPE DE GESTION                 │
│  /onboarding/members                                            │
│  - "Ajoutez les membres de votre équipe de gestion"             │
│  - Génération d'un code QR d'invitation                         │
│  - Affichage du code d'invitation (copiable)                    │
│  - Bouton "Partager l'invitation"                               │
│  - Lien "Je le ferai plus tard" (skip) → /dashboard             │
│  - Bouton "Terminer" → /dashboard                               │
└─────────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────────┐
│  ÉTAPE 6 : DASHBOARD PRINCIPAL                                  │
│  /dashboard                                                     │
│  - Hero avec solde net, revenus, dépenses                       │
│  - Stream des derniers mouvements                               │
│  - Actions rapides (Entrée, Sortie, Versement, Événement)       │
│  - BottomNav                                                    │
└─────────────────────────────────────────────────────────────────┘
```

### Branche "Rejoindre par invitation" (ÉTAPE 3B)
```
┌─────────────────────────────────────────────────────────────────┐
│  /invitation/claim                                              │
│  - Saisie du code d'invitation ou scan QR                       │
│  - Validation du code                                           │
│  - Redirection vers /invitation/success                         │
└─────────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────────┐
│  /invitation/success                                            │
│  - "Vous avez rejoint l'organisation X"                         │
│  - Bouton "Aller au dashboard" → /dashboard                     │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. PAGES À REDÉSIGNER (LISTE COMPLÈTE)

### Priorité 1 — Flux d'entrée (À faire IMMÉDIATEMENT)
| Page | Chemin | Statut | Description |
|------|--------|--------|-------------|
| Auth | `/auth` | À redesign | Connexion/création compte, logo affiché |
| Choix parcours | `/onboarding/choice` | À créer | Créer / Rejoindre par invitation |
| Création org | `/org-setup` | Designé | Identité, type, thème, modules, rôle |
| Onboarding | `/onboarding` | Designé | 7 écrans avec illustrations vectorielles |
| Ajout membres | `/onboarding/members` | À créer | QR code, code invitation, skip |
| Dashboard | `/dashboard` | Designé (v3) | Hero, stream, actions rapides |

### Priorité 2 — Pages d'invitation (Si l'utilisateur choisit "Rejoindre")
| Page | Chemin | Statut | Description |
|------|--------|--------|-------------|
| Invitation claim | `/invitation/claim` | À créer | Saisie code/QR, validation |
| Invitation succès | `/invitation/success` | À créer | Confirmation d'adhésion à l'org |
| Invitation émis | `/invitation/emit` | À redesign | Générer un code d'invitation |

### Priorité 3 — Autres pages (À redesign ensuite)
| Page | Chemin | Statut |
|------|--------|--------|
| Finance | `/finance` | Designé (v3) |
| Membres | `/membres` | Designé (v3) |
| Événements | `/events` | Designé (v3) |
| Settings (hub) | `/settings` | Designé (v3) |
| Settings (sous-pages) | `/settings/*` | À redesign |
| TransactionNew | `/transaction/new` | Designé (v3) |
| TransactionEdit | `/transaction/:id/edit` | Designé (v3) |
| TransactionDetail | `/transaction/:id` | Designé (v3) |

---

## 5. CONTRAINTES TECHNIQUES (NON NÉGOTIABLES)

### Contrainte Labo (Jamais en prod)
- Le dossier `src/labo/` contient 8 fichiers (guard, seed, faux-adaptateurs, panneau, toggle, tests)
- Le Labo est importé dynamiquement via `LaboToggleLazy` uniquement si `import.meta.env.DEV`
- Script CI `scripts/verify-labo-excluded.mjs` vérifie qu'aucune référence Labo/seed n'est dans le build prod
- Test CI échoue si "Labo" ou des IDs de seed apparaissent dans le bundle de production

### Démarrage local-only
- Pas de connexion PowerSync ni Supabase au boot de l'application
- Toutes les écritures restent sur l'appareil
- Si `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` manquent → mode demo local-only (mock client)
- Faker uniquement pour noms et libellés (locale `fr`, seed fixe `20261101`)
- Générateur de scénarios métier requis : solde caisse = somme des transactions APPROVED

### Horloge et seed injectables
- Horloge injectable pour tests reproductibles
- Même graine = mêmes captures (utile pour tutoriel PDF et tests Playwright)

### Rôles et permissions
- 14 rôles RBAC dans le panneau Labo
- Mode "sans restriction" contourne les rôles (ne prouve pas que les droits sont appliqués côté serveur/RLS)
- Faux adaptateurs derrière les ports DDD (session, stockage logos, connexion Google, notifications push)

### Qualité de code
- TypeScript strict : `pnpm exec tsc --noEmit` doit passer sans erreur
- Build de production : `pnpm build` doit réussir
- Vérification Labo exclu : `pnpm verify:labo-build` doit passer (0 référence Labo dans dist)
- Tests unitaires : `pnpm test src/labo/` doivent passer
- Interface en français sur tous les écrans visibles utilisateur

---

## 6. TESTS STATIQUES (OBLIGATOIRES)

### Avant chaque commit
1. `pnpm exec tsc --noEmit` — TypeScript doit passer sans erreur
2. `pnpm run lint` (si ESLint configuré) — pas d'erreur de linting
3. `pnpm build` — build de production doit réussir
4. `pnpm verify:labo-build` — aucune référence Labo dans dist

### Structure des tests
- Tests unitaires dans `src/__tests__/` ou `src/**/__tests__/`
- Tests du design system : tokens, MotionCard, MotionList, FormField
- Tests des pages : rendu, navigation, ancres Cypress présentes
- Tests du flux d'onboarding : choix, création org, ajout membres

---

## 7. TESTS DYNAMIQUES CYPRUS (E2E)

### Scénarios critiques à automatiser
1. **Flux créateur complet :** `/auth` → `/onboarding/choice` (créateur) → `/org-setup` → `/onboarding` → `/onboarding/members` → `/dashboard`
2. **Flux membre par invitation :** `/auth` → `/onboarding/choice` (membre) → `/invitation/claim` → `/invitation/success` → `/dashboard`
3. **Skip ajout membres :** `/onboarding/members` → clic "Je le ferai plus tard" → `/dashboard`
4. **Logo affiché :** vérification que `/lumina-logo-version-monochrome.png` s'affiche sur toutes les pages (header, splash, auth)
5. **Ancres Cypress :** `data-testid` et `data-screen-state` présents sur chaque écran
6. **Mode local-only :** aucune tentative de connexion au réseau au boot
7. **Labo exclu :** aucune référence Labo dans le build prod

### Fichiers de test
- `cypress/e2e/onboarding.cy.ts` — flux d'onboarding complet
- `cypress/e2e/auth.cy.ts` — authentification et choix parcours
- `cypress/e2e/dashboard.cy.ts` — dashboard et navigation
- `cypress/e2e/invitation.cy.ts` — flux invitation et succès

---

## 8. CRITÈRES D'ACCEPTATION (LIVRABLE FINAL)

L'application est considérée comme terminée quand :

- [ ] Le logo Lumina s'affiche sur toutes les pages (header, splash, auth, settings)
- [ ] Le flux respecte l'ordre : Auth → Choix → Création Org → Onboarding → Ajout membres → Dashboard
- [ ] La page d'ajout membres génère un code QR et un code d'invitation copiable
- [ ] L'option "Je le ferai plus tard" skippe vers le dashboard
- [ ] Les pages d'invitation (claim, succès) sont redessinées avec le design system
- [ ] Toutes les pages utilisent des tokens `var(--*)` uniquement (zéro couleur brute)
- [ ] Toutes les ancres Cypress (`data-testid`, `data-screen-state`) sont préservées
- [ ] Interface entièrement en français
- [ ] Démarrage local-only (pas de PowerSync/Supabase au boot)
- [ ] Labo exclu du bundle de production (script CI vérifié)
- [ ] `pnpm exec tsc --noEmit` passe sans erreur
- [ ] `pnpm build` réussit
- [ ] `pnpm verify:labo-build` passe (0 référence Labo)
- [ ] Tests Cypress E2E passent sur les scénarios critiques
- [ ] Design Apple/Google appliqué (coins arrondis, ombres, micro-interactions, typographie grande)

---

## 9. LIVRABLES ATTENDUS

1. Code source complet sur la branche `arena/db368bef-luminap`
2. Tous les fichiers de design system dans `src/design/`
3. Toutes les pages redesignées selon le nouveau flux
4. Tests Cypress E2E dans `cypress/e2e/`
5. Documentation des flux et des choix techniques
6. Preuve que le build de production exclut le Labo

---

## 10. RÈGLES DE GIT (OBLIGATOIRES)

- Travailler UNIQUEMENT sur la branche `arena/db368bef-luminap`
- Commits atomiques avec messages en français conventionnels (feat:, fix:, refactor:, docs:)
- NE JAMAIS push sur `main`
- NE JAMAIS inclure `node_modules/`, `dist/`, `.next/`, `.turbo/` dans les commits
- Fichiers de grande taille (données, datasets) rester en dehors de Git

---

**Contact :** L'utilisateur est joignable dans cette conversation Arena pour toute question sur le flux, le design ou les contraintes.
