# ADR — Couche de capacité plateforme (une façade par capacité native)

**Statut** : accepté · **Date** : 2026-11-06 · **Portée** : tout `src/`
**Garde** : `src/lib/__tests__/platform-abstraction-guard.test.ts`
**Doc parente** : `docs/PLATFORM-GOVERNANCE.md` §4.3

## Contexte

Lumina est un **client Android natif** (Capacitor 8) offline-first, mais une
part du code a été écrite comme une **application web**. Plusieurs API web se
comportent **différemment ou pas du tout** dans la WebView Android de
Capacitor : elles échouent **silencieusement** (pas d'exception, pas de log),
ce qui a produit des bugs terrain (exports muets, liens morts, partage
dégradé).

Cas mesurés dans ce dépôt :

| API web | Comportement en WebView Android |
|---|---|
| `navigator.onLine` | peu fiable (reste `true`/`false` à contretemps) |
| `window.open` / `target="_blank"` | **no-op** (aucun onglet, aucun DownloadListener) |
| `<a download>` | **muet** (bug P0-2 : exports inopérants) |
| `navigator.share` | **absent** de la WebView |
| bouton retour matériel | événement natif `backbutton` **non écouté** par les overlays maison → ferme l'app |
| `window.prompt` / `window.confirm` / `window.alert` | **no-op** (`onJsPrompt`/`onJsConfirm` non implémentés par Capacitor) ou **bloquants** (gel du thread JS) |

## Décision

1. **Un seul point d'accès par capacité native**, dans la couche plateforme
   (`src/platform/` ou `src/adapters/native/`). Les façades existantes :

   | Capacité | Façade | Natif | Web |
   |---|---|---|---|
   | Réseau | `src/platform/networkState.ts` | `@capacitor/network` | `online`/`offline` |
   | Liens externes | `src/platform/openExternal.ts` | `@capacitor/browser` | `window.open` |
   | Partage | `src/platform/shareLink.ts` | `@capacitor/share` | `navigator.share` |
   | Sortie fichier | `src/lib/download.ts` (`downloadBlob`) | Filesystem + Share | `<a download>` |
   | Retour matériel | `src/platform/hardwareBack.ts` (`registerHardwareBack`) | `ionBackButton` (prio 110) | no-op |
   | Modulateur système | composants Ionic (`IonAlert`) ou overlay maison | — | `window.prompt`/`confirm`/`alert` |

2. **Interdiction** d'appeler ces API web en direct hors de la couche
   plateforme. Le scan de la garde échoue sur les motifs :
   `navigator.onLine`, `navigator.connection`, `addEventListener("online"|"offline")`,
   `window.open(`, `target="_blank"`, `navigator.share`, `.download =`,
   `ionBackButton`, `addEventListener("backbutton")`,
   `window.prompt(`/`window.confirm(`/`window.alert(`.

3. **Ratchet** : la liste de dette (`KNOWN_DIRECT_SITES`) est **vide** et ne
   doit jamais être ré-ouverte. Un site migré doit être retiré de la liste
   (la garde échoue sinon : « dette exacte »).

## Conséquences

- Ajouter une capacité native = créer **une** façade + l'ajouter à
  `PLATFORM_LAYERS`/`PATTERNS` + la documenter ici et dans §4.3.
- La garde est **non-vacuité-prouvée** : injecter un motif interdit dans un
  fichier hors couche fait échouer le test (vérifié à chaque extension).
- **Overlays maison** : tout fichier rendant `role="dialog"` doit s'inscrire à
  `useHardwareBack`/`registerHardwareBack` — vérifié par une garde de
  complétude dédiée (`overlay-hardware-back-guard.test.ts`). Les
  composants-feuilles (`LuSheet`, `LuSelect` sheet, `BottomDrawer`)
  s'enregistrent eux-mêmes.
- Les façades ne lèvent **jamais** sur un cas d'usage normal (annulation
  utilisateur, canal indisponible) : elles renvoient un statut typé
  (`"unsupported"`) que l'appelant traduit en repli.

## Alternatives écartées

- **Plugin ESLint `no-restricted-properties`** : ne couvre pas `target="_blank"`
  (JSX) ni `.download =`, et ne prouve pas la non-vacuité. Le scan de test est
  plus expressif et déjà en place.
- **Migrer `localStorage`** (129 sites, session Supabase incluse) : sur Android
  le `localStorage` de la WebView est **durable** (répertoire de données de
  l'app, non purgé par l'OS). Coût de migration élevé pour un gain de risque
  faible → hors périmètre.
