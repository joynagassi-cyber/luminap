# Receipt — R52.s : `/event/:id/edit` « Chargement... » infini + nom non pré-rempli

- **Phase** : 11
- **Priorité** : P2 (impact : écran muet permanent + édition impossible)
- **Branche** : `agent/r52j-trace-orgreport-loading`
- **Date** : 2026-10-28

## Défaut A — écran muet permanent

```tsx
if (loading || !event) {
  return <div data-screen-state="loading"><p>Chargement...</p></div>;
}
```

L'écran ne distinguait pas « pas encore lu » de « réellement absent ». Un lien
mort, ou un événement appartenant à une autre organisation, laissait
l'utilisateur sur « Chargement... » **à l'infini** : aucun titre, aucune
explication, aucune action possible (classe P0).

## Défaut B — édition impossible

`setName(event.name || "")` était **absent** de l'effet d'initialisation
(seuls description / dates / statut / budget l'étaient). Le formulaire
s'ouvrait donc avec un champ « Nom » vide, et `validate()` refusait
l'enregistrement (« Le nom est requis »). **Toute** modification d'événement
échouait en validation.

## Correctif

- `isPowerSyncReadyNow()` → squelette si la réplique n'a pas encore répondu.
- Si l'événement est réellement absent → `data-screen-state="error"`,
  « Cet événement est introuvable. » + « Retour aux événements ».
- Ajout de `setName(event.name || "")`.

## Preuves

- `r52s-eventedit-loading.test.tsx` : **3 tests**, non-vacuité vérifiée
  (garde neutralisée + pré-remplissage retiré → **2 échecs**).
- `npx vitest run` → **1640/1640** (139 fichiers)
- `npx tsc -b --force --noEmit` → **0 erreur**
