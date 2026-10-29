# Receipt — R33 : `IonSelect`/`IonCheckbox` sans `ionInput` (mesure + garde)

- **Date** : 2026-10-29
- **Branche** : `agent/r33-ionic-input-guard`
- **Tâche** : trancher R33 (resté « OUVERT (faible) ») par la **mesure** puis
  verrouiller par une **garde statique** exécutable en CI.

## Contexte

- **R32 (CORRIGÉ)** : `onIonChange` ne part qu'au **blur** ; cliquer sur un
  bouton désactivé ne blur pas → état React vide → validation impossible.
  Correctif : `onIonInput` sur `IonInput`/`IonTextarea`.
- **R33 (OUVERT)** : Ionic n'expose **pas** d'événement `ionInput` sur
  `IonSelect`/`IonCheckbox`. Y mettre `onIonInput` créerait un gestionnaire
  **jamais appelé** — le blocage d'R32, inversé.

## Mesure (2026-10-29, analyse par balise ouvrante)

Méthode : extraction de la **balise ouvrante** complète (gère `>` à l'intérieur
d'expressions `{}`) sur tout `src/**/*.tsx`.

| Contrôle | Balises scannées | Violations |
|---|---|---|
| `IonSelect`/`IonCheckbox` portant `onIonInput` (jamais émis) | **58** | **0** |
| `IonInput`/`IonTextarea` portant `onIonChange` (blur-only, régression R32) | **100** | **0** |

**Faux positifs écartés** : `ReportBuilder.tsx:626` et `GivingCampaign.tsx:248`
(un `grep` naïf les signalait) — le `onIonInput` appartient en réalité à un
`<IonInput>` **frère**, pas au `<IonSelect>`. C'est pourquoi la garde analyse la
balise et non la ligne.

## Garde anti-récurrence

`src/lib/__tests__/ionic-input-events-guard.test.ts` (2 tests) :

1. aucun `IonSelect`/`IonCheckbox` n'utilise `onIonInput` ;
2. aucun `IonInput`/`IonTextarea` n'utilise `onIonChange`.

Chaque test porte une assertion de **non-vacuité** (`>20` et `>50` balises
scannées) : si l'extraction casse, le test **échoue** au lieu de passer
silencieusement (piège classique d'une garde qui ne garde rien).

## Gates (mesurés localement)

| Gate | Commande | Sortie | Extrait |
|---|---|---|---|
| Typecheck | `npx tsc -b` | **0** | (aucune sortie) |
| Garde R33 | `vitest run src/lib/__tests__/ionic-input-events-guard.test.ts` | **0** | `Test Files 1 passed` · `Tests 2 passed` |
| Comptage | (script Node, balises ouvrantes) | — | `IonSelect/IonCheckbox: [58, 0]` · `IonInput/IonTextarea: [100, 0]` |

## Honnêteté (R12)

- **[Prouvé]** : les 0 violation mesurées, la garde verte, `tsc` 0.
- **[Probable]** : que `ionChange` se déclenche bien dès la sélection sur les
  plateformes cibles (comportement documenté Ionic, non vérifié E2E ici — E2).
- **[Non vérifié]** : interaction réelle `<IonSelect>` → bouton en Cypress
  (E2/R98).

## Risque résiduel

- R33 lui-même reste **non exploitable** dans les données actuelles ; la garde
  empêche sa réintroduction sous forme de `onIonInput` erroné et empêche une
  régression R32.
