# Diagnostic — « écran noir après le splash »

**Date** : 2026-10-28 · **Statut** : cause identifiée, correctif livré, comportement de secours vérifié par test.

---

## 1. Résumé en une phrase

L'application n'échouait pas « à l'affichage » : elle **échouait avant de
démarrer**, et le code masquait le splash au bout de 6 secondes sans vérifier
que l'application avait démarré. Résultat : le splash disparaissait, `#root`
était vide, et le fond `#121212` restait seul → page noire, sans message.

---

## 2. La chaîne exacte, étape par étape

| # | Étape | Conséquence |
|---|---|---|
| 1 | `index.html` peint le splash statique | écran correct, logo visible |
| 2 | Le navigateur charge `/src/main.tsx` | — |
| 3 | `main.tsx` a un `import App from "./App.tsx"` **en tête de fichier** | les imports ES sont évalués **avant** toute instruction du module |
| 4 | `App.tsx` importe `authService` depuis `@/lib/auth` | — |
| 5 | `auth.ts` lève à l'évaluation si `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` manquent | **le graphe de modules est interrompu** |
| 6 | Le corps de `main.tsx` ne s'exécute **jamais** | `armBootWatchdog()` et `createRoot().render()` ne sont jamais atteints |
| 7 | `#root` ne reçoit jamais `is-hydrated` | React ne monte rien |
| 8 | Le timer inline de `index.html` fait `display:none` sur le splash, **sans condition** | le splash disparaît |
| 9 | `#root` vide + `body { background:#121212 }` | **page noire** |

Le point 6 est le cœur du problème : **un `throw` à l'évaluation d'un module
annule le module entier**. Tout ce qui est écrit après les imports — y compris
le watchdog censé rattraper ce cas — n'existe pas.

C'est le même défaut que celui documenté dans `src/lib/bootWatchdog.ts` : ce
minuteur avait déjà été déplacé de l'arbre React vers le bundle parce qu'il ne
pouvait pas voir « React n'a jamais monté ». Il ne pouvait pas davantage voir
« le bundle n'a jamais été évalué ». Il manquait un cran : une couche **hors du
bundle**.

---

## 3. Pourquoi cela arrive ici, et pas forcément chez vous

Le dépôt ne contient **aucun fichier `.env`** (normal : il est ignoré par Git).
`src/lib/auth.ts` exige deux variables et refuse de démarrer sans elles :

```ts
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("[auth] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY manquantes…");
}
```

Conséquences :

- **Dans ce dépôt / ce bac à sable, sans `.env`** : l'écran noir est
  **reproductible à 100 %**. C'est un problème de configuration local, pas de
  matériel — ni le vôtre, ni le mien.
- **Sur un APK compilé avec les variables** : cette cause est écartée. Si un
  écran noir subsiste, il vient d'ailleurs — mais il est désormais **visible**
  (voir §4), au lieu d'être silencieux.
- **Sur un APK compilé sans les variables** : l'app embarque le `throw` et
  échouera de la même façon sur le téléphone. Le build réussit malgré tout —
  Vite remplace `import.meta.env.*` à la compilation, le contrôle n'a lieu
  qu'à l'exécution.

À noter : `VITE_POWERSYNC_URL` manquant **n'est pas** fatal. `initPowerSync()`
échoue mais l'erreur est capturée (`.catch()`), et l'app démarre en mode hors
ligne. Seules les deux variables Supabase sont bloquantes.

---

## 4. Ce qui a été corrigé

### a. Le dernier recours vit désormais hors du bundle

Dans `index.html`, un script inline (donc évalué même si le bundle échoue)
effectue trois choses :

1. **capture la cause réelle** via un écouteur `error` sur `window` — une
   erreur d'évaluation de module déclenche cet événement, et son message est
   exactement celui de `auth.ts` ;
2. si l'app n'est pas prête au bout de 6 s, **affiche un diagnostic** avec le
   message et un bouton de rechargement, au lieu de blanchir l'écran ;
3. **retire la surcouche** si l'app finit par démarrer (réseau lent).

La surcouche est ajoutée à `<body>`, **jamais dans `#root`** : React vide les
enfants de son conteneur au montage et l'emporterait avec eux. Elle est
idempotente (identifiant `#lumina-boot-recovery`), donc le watchdog du bundle
allé ne peut pas se superposer.

### b. Le commentaire de `bootWatchdog.ts` dit maintenant la vérité

Il annonçait couvrir le démarrage entier. Il couvre en réalité uniquement
l'après-évaluation des modules. Portée réelle documentée, sans changer le
comportement.

### c. `.env.example` créé

Le dépôt demandait des variables sans jamais lister lesquelles. Le fichier
distingue **requis** (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`),
**recommandé** (`VITE_POWERSYNC_URL`) et **optionnel** — d'après les variables
réellement lues dans `src/`, pas d'après la documentation existante.

---

## 5. Configuration, pour démarrer en local

```bash
cp .env.example .env
```

Puis renseigner `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY`
(Supabase → *Project Settings → API*). `VITE_POWERSYNC_URL` est recommandé mais
son absence n'empêche pas le démarrage (mode hors ligne).

> Les variables sont lues **au démarrage du serveur Vite**. Après modification
> du `.env`, il faut **relancer** `pnpm dev` : un rechargement à chaud ne les
> relit pas.

---

## 6. Comment vérifier que le correctif fonctionne

**Test automatisé** (exécute le vrai script de `index.html` dans un JSDOM, avec
minuteurs neutralisés — aucune attente de 6 s) :

```bash
npx vitest run src/lib/__tests__/boot-recovery.test.ts
```

Il vérifie notamment que, sans démarrage réussi, la surcouche apparaît avec
`role="alert"` et le message d'erreur, que le splash est masqué, qu'un bouton
de rechargement est présent, et que la surcouche disparaît si l'app démarre
tardivement.

**À la main** — reproduire l'échec :

```bash
mv .env .env.bak     # ou partir d'un dépôt sans .env
pnpm dev
```

Attendu : au bout de ~6 s, un écran « L'application n'a pas pu démarrer »
affichant le message `[auth] VITE_SUPABASE_URL…`, et non plus une page noire.

---

## 7. Si l'écran noir persiste sur votre appareil

La nouvelle surcouche affiche désormais **la raison**. Trois cas :

| Ce que vous lisez | Signification | Action |
|---|---|---|
| `VITE_SUPABASE_URL … manquantes` | `.env` absent au build | compiler avec les variables |
| « dépasse 6 s » | le bundle ne s'évalue pas (chunk manquant, réseau, WebView) | vérifier le réseau, vider le cache, réinstaller l'APK |
| Le démarrage passe puis écran noir | cause **différente**, après montage | voir ci-dessous |

Dans le troisième cas, le coupable est en aval de ce diagnostic. Les candidats
déjà identifiés dans le code, par ordre de probabilité :

1. `RouteGuard` redirige vers `/auth`, mais la navigation Ionic laisse la vue
   entrante en `ion-page-invisible` (cas déjà rencontré, commenté dans
   `App.tsx`) ;
2. une `ErrorBoundary` affiche son écran d'erreur mais le splash statique
   (z-index 9999) le recouvre — ce cas est désormais couvert par la surcouche ;
3. l'écran est noir mais l'app vit : capturer les logs via
   `chrome://inspect` (si `webContentsDebuggingEnabled` est activé en build de
   test) ou via Sentry si `VITE_SENTRY_DSN` est configuré.

Pour ce troisième cas, **je n'ai pas de preuve** : je ne peux pas reproduire
votre appareil. Le diagnostic ci-dessus porte sur un défaut vérifié dans le
code, pas sur une supposition.

---

## 8. Ce qui n'est **pas** corrigé, volontairement

- **Le `throw` de `auth.ts` reste.** Échouer fort au démarrage est préférable à
  une application qui démarre sans authentification et échoue plus loin, sur
  une action utilisateur, avec une erreur incompréhensible. Le problème n'était
  pas le `throw` mais son **invisibilité** : elle est corrigée.
- **`is-hydrated` est toujours posé juste après `render()`** dans `main.tsx`,
  avant que React n'ait peint. Le splash peut donc disparaître une frame avant
  le contenu. Ce n'est pas la cause de l'écran noir (qui est permanent) et
  toucher à ce mécanisme risquerait de masquer les écrans d'erreur de
  `ErrorBoundary` derrière le splash. Laissé tel quel, délibérément.
