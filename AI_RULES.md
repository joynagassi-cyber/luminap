# Lumina — Plateforme Universelle d'Organisation

## Stack
- React + TypeScript + Vite
- Tailwind CSS (design system Lumina)
- Zustand (state management, persisted)
- React Router (routing)
- lucide-react (icons)
- date-fns (formatting, fr locale)

## Design System
- Fond principal: `#121212` (canvas)
- Surface: `#181818`, hover: `#282828`, active: `#333333`
- Text: primary `#FFFFFF`, secondary `#B3B3B3`, tertiary `#808080`, placeholder `#535353`
- Couleurs financières fixes: income `#1DB954`, expense `#E51332`, pending `#FFB800`
- Accent brand: `#FF6B00` (orange église)
- Boutons pill shape, cartes 8px radius
- Navigation bottom tab bar fixe

## Règles Métier
- Montants en centimes (multiples de 100)
- Transactions approuvées immuables
- State: DRAFT → PENDING → APPROVED | REJECTED

## Données
- Mock données dans `src/store/useStore.ts`
- Organisation: Église MFE-JC Centrale
- 9 catégories, 5 groupes, 5 transactions exemple

## Routage
- `/login` — Authentification simulée
- `/` — Dashboard
- `/finance` — Grand livre avec filtres
- `/transaction/new` — Nouvelle transaction
- `/transaction/:id` — Détail transaction
- `/transaction/:id/edit` — Modifier (draft/rejeté seulement)
- `/balance` — Bilan financier par période
- `/groups` — Groupes organisationnels
- `/settings` — Paramètres utilisateur

## Auth simulée
- Login avec email + mot de passe quelconques
- User: admin@mfe-jc.org, rôle ADMIN
