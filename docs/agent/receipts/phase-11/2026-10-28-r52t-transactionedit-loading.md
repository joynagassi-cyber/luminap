# Receipt — R52.t : `/transaction/:id/edit` formulaire vide avant la 1re lecture

- **Phase** : 11
- **Priorité** : P2 (impact : écrasement possible de valeurs réelles)
- **Branche** : `agent/r52j-trace-orgreport-loading`
- **Date** : 2026-10-28

## Défaut

`useTransactions()` renvoie `[]` tant que la réplique PowerSync n'a pas
répondu. L'écran ne vérifiait **jamais** cet état : il rendait directement son
formulaire en `data-screen-state="ready"`, avec montant, description et
catégorie **vides**. L'effet de pré-remplissage sortait par `if (!tx) return;`
sans signaler l'attente.

Conséquences :

1. l'utilisateur voit un formulaire vide et peut croire la transaction sans
   montant ni description ;
2. s'il modifie un champ et enregistre, `updateTransactionPS` **écrase** les
   valeurs réelles qui arrivent ensuite du sync.

## Correctif

```tsx
const tx = transactions.find((t) => t.id === id);
if (!tx) {
  if (!isPowerSyncReadyNow()) return <Squelette "Chargement..." />;
  return <Ecran "Cette transaction est introuvable." + Retour aux transactions />;
}
```

## Preuves

- `r52t-transactionedit-loading.test.tsx` : **3 tests**, non-vacuité vérifiée
  (garde neutralisée → **2 échecs**).
- `npx vitest run` → **1643/1643** (140 fichiers)
- `npx tsc -b --force --noEmit` → **0 erreur** ; `eslint` → **0 erreur**
