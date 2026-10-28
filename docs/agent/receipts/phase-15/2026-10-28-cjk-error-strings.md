# Receipt — R121 : messages d'erreur restés en chinois (flux finance)

- **Date** : 2026-10-28
- **Phase** : 15 (polish produit) — défaut d'i18n découvert par balayage
- **Branche** : `agent/r121-cjk-error-strings`
- **Statut** : ✅ CORRIGÉ

## Défaut

Trois messages d'erreur **affichés à l'utilisateur** étaient restés en chinois
dans l'interface française (reliquats d'un gabarit) :

| Fichier | Ligne | Avant | Après |
|---|---|---|---|
| `src/pages/Versement.tsx` | 87 | `余额检查失败` | `La vérification du solde a échoué` |
| `src/pages/TransactionEdit.tsx` | 108 | `请填完整必填项` | `Veuillez remplir tous les champs obligatoires` |
| `src/pages/TransactionEdit.tsx` | 114 | `金额无效` | `Montant invalide` |

Ce sont les replis `??` utilisés quand la `policy` ne fournit pas de message
(solde insuffisant, champs manquants, montant invalide) — chemins courants.

## Correctif

Traduction en français ; les messages de `policy` (déjà français) restent
prioritaires.

## Garde anti-dérive

`src/lib/__tests__/no-cjk-strings.test.ts` scanne tout `src` (hors `__tests__`)
et échoue sur tout idéogramme CJK / kana. Formes pleine largeur exclues
(faux positif `＋` U+FF0B du tutoriel).

**Non-vacuité prouvée** : réintroduction de `余额检查失败` → échec ciblé
`pages/Versement.tsx:87` ; restauration → 1/1.

## Gates

- `npx vitest run` : **1551/1551** (125 fichiers)
- `npx tsc -b` : 0 erreur
- `npx eslint` (fichiers touchés) : 0 erreur
