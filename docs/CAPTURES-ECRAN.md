# Captures d'écran pour le tutoriel

**But** : que l'aide montre le **vrai écran**, pas seulement une phrase. Les
utilisateurs de Lumina ne sont pas techniciens — « touchez le bouton en bas »
ne veut rien dire pour quelqu'un qui ne sait pas où est « en bas » ; une photo
annotée, si.

---

## 1. Pourquoi je ne les ai pas fournies moi-même

Il faut être précis là-dessus, parce que c'est une limite d'environnement et non
un choix.

Mon bac à sable **n'a aucun navigateur** et ne peut en installer aucun. Vérifié :

| Vérification | Résultat |
|---|---|
| `chromium`, `chrome`, `firefox` dans le `PATH` | aucun |
| Cache Cypress / Playwright (`~/.cache`) | vide |
| Téléchargement du navigateur Playwright | bloqué (CDN hors liste autorisée) |
| `@sparticuz/chromium` (Chromium **embarqué** dans un paquet npm) | disponible, 70 Mo |
| Bibliothèques système requises (`libnss3`, `libatk`, `libgbm`…) | **toutes absentes** |
| `apt-get install` pour les obtenir | impossible — `deb.debian.org` injoignable (`→ 000`) |

Conclusion : même avec le binaire Chromium, il ne démarrerait pas. **Ce n'est
pas un problème de code.**

J'ai donc livré la **chaîne complète et testée** qui produit les captures, plus
tout le câblage. Vous lancez **une commande**, vous obtenez les 34 PNG.

---

## 2. La produire — une commande

```bash
pnpm capture:screens
```

Cette commande enchaîne :

1. `cypress run --spec cypress/e2e/screenshots.cy.ts` — visite chaque écran et
   le photographie en **390 × 844** (format téléphone réel, déjà configuré) ;
2. `scripts/collect-screenshots.mjs` — range les PNG dans
   `public/captures/<id>.png` et **signale ce qui manque**.

Variantes utiles :

```bash
# Contre votre serveur local plutôt que l'instance par défaut
CYPRESS_BASE_URL=http://localhost:8080 pnpm capture:screens

# Seulement quelques écrans (plus rapide pendant la mise au point)
CAPTURE_ONLY=finance,groups,members pnpm capture:screens

# Vérifier la couverture sans rien copier
pnpm capture:check
```

### Prérequis

- Un **navigateur** (Cypress télécharge le sien à l'installation).
- Un **compte de test** pour les écrans authentifiés. Par défaut, le compte
  déjà présent dans le dépôt (`lumina-org-e2e@lumina.dev`). Pour en utiliser un
  autre :

```bash
CYPRESS_TEST_EMAIL=... CYPRESS_TEST_PASSWORD=... pnpm capture:screens
```

> **Aucun secret dans le dépôt.** Les identifiants passent par des variables
> d'environnement, lues dans `cypress.config.ts` via `process.env`. Ne les
> écrivez jamais dans un fichier versionné.

---

## 3. Ce que vous obtenez

```
public/captures/
├── splash.png
├── auth.png
├── dashboard.png
├── finance.png
├── transaction-new.png
├── versement.png
├── … 34 fichiers
```

Les **noms sont les identifiants du manifeste** (`src/lib/screenManifest.ts`).
C'est ce qui permet au tutoriel de retrouver l'image sans table de
correspondance : il demande `/captures/<id>.png`.

### Le manifeste est la source unique

`src/lib/screenManifest.ts` déclare, pour chaque écran :

| Champ | Rôle |
|---|---|
| `id` | identifiant **et** nom de fichier |
| `route` | route visitée (vérifiée contre le routeur) |
| `title` | titre réellement affiché |
| `purpose` | à quoi sert l'écran |
| `hint` | **ce que l'utilisateur doit reconnaître** — sert de légende |
| `requiresAuth` | capturable sans connexion ou non |
| `howto` | parcours « Comment faire ? » concernés |
| `sectionId` | section du Tutoriel |

Ajouter un écran = ajouter une entrée. Le spec, le collecteur et le tutoriel
suivent automatiquement.

---

## 4. Comment l'image s'affiche dans le tutoriel

Rien à faire : c'est déjà câblé.

```
Page Aide → « Comment faire ? » → déplier un parcours
                                        ↓
                          étapes numérotées
                                        ↓
                    capture(s) de l'écran + légende   ← si le fichier existe
                                        ↓
                          bouton « Ouvrir la page »
```

`src/components/ScreenCapture.tsx` affiche les captures déclarées pour le
parcours. **Si le fichier est absent, l'image est omise** — pas d'icône cassée.
Conséquence pratique : vous pouvez livrer le tutoriel maintenant et générer les
captures plus tard, écran par écran, sans redéployer de code.

---

## 5. Annoter les captures (l'étape qui fait la différence)

Une capture brute montre l'écran ; une capture **annotée** montre *où toucher*.
Ajoutez si possible :

- un **cadre** autour de l'élément à toucher (bouton, onglet) ;
- une **flèche** vers la barre de navigation si l'étape est un changement d'onglet ;
- un **masquage** des données personnelles (noms, montants) avant publication —
  les captures d'un compte de test restent préférables.

Les fichiers annotés gardent **le même nom** et remplacent les bruts : aucune
modification de code n'est nécessaire.

> ⚠️ Si vous capturez sur un vrai compte, relisez chaque image avant de la
> publier : on y voit des noms de membres et des montants.

---

## 6. Ce qui n'est pas capturable en l'état

Les routes à paramètre ne peuvent pas être visitées sans identifiant réel.
Elles sont listées dans `DYNAMIC_SCREENS` (16 écrans : détail d'une transaction,
d'un groupe, d'un événement, fiche d'un membre, saisie rapide, etc.).

Pour les capturer, il faut extraire un identifiant de la base et l'injecter
dans le spec. Volontairement non fait ici : mieux vaut **zéro capture** qu'une
capture de page d'erreur dans un tutoriel.

---

## 7. Garde-fous

Le manifeste est verrouillé par **15 tests** (`src/lib/__tests__/screenManifest.test.ts`) :

- identifiants uniques et sûrs pour un nom de fichier ;
- **chaque route existe dans `ROUTE_REGISTRY` ET dans `src/ionic/routes/*.tsx`** ;
- aucune route dynamique dans les écrans capturables ;
- chaque `howto` et chaque `sectionId` référencés existent réellement ;
- `auth` et `invitation-claim` restent publics (sinon un nouvel utilisateur ne
  pourrait jamais entrer).

Et `ScreenCapture` est couvert par **5 tests** (affichage, légende, absence de
fichier, attributs de performance).

Le spec Cypress, lui, **ne capture pas** un écran qui a redirigé ailleurs : une
image de la page de connexion étiquetée « Membres » serait un mensonge dans
l'aide. Ces écrans sont listés comme « ignorés » dans
`cypress/captures-report*.json`.

---

## 8. Statut actuel

| Élément | État |
|---|---|
| Manifeste (34 écrans) | ✅ livré, routes vérifiées |
| Spec de capture | ✅ livré — **non exécuté ici** (pas de navigateur) |
| Collecteur + rapport de couverture | ✅ livré, testé de bout en bout avec un PNG factice |
| Affichage dans le tutoriel | ✅ livré, dégradation silencieuse testée |
| **Les 34 PNG** | ❌ **à produire chez vous** : `pnpm capture:screens` |
