<!-- Gabarit de PR — Lumina. Cocher ce qui s'applique, supprimer le reste. -->

## Objectif

<!-- Une phrase : quel problème utilisateur / quel défaut mesuré cette PR corrige. -->

## Phase concernée

- [ ] A1 — Manifeste & configuration
- [ ] A2 — Permissions & notifications
- [ ] A3 — Plugins Capacitor essentiels
- [ ] A4 — Sécurité (verrou, stockage)
- [ ] A5 — Ionic : fondations
- [ ] A6 — Ionic : retours et feuilles
- [ ] A7 — Ionic : listes
- [ ] A8 — Navigation
- [ ] Hors plan (`docs/lumina-ionic-capacitor-permissions.md` §5)

## Règle « Ionic d'abord »

- [ ] Aucun **nouveau** contrôle maison (bouton, champ, interrupteur, feuille,
      toast, sélecteur, date, onglet) : un composant Ionic équivalent a été
      utilisé, **ou** l'exception est ajoutée à `docs/ui-exceptions.md`.
- [ ] Aucune nouvelle dépendance UI (Radix / vaul / sonner / lucide) sans la
      même justification.

## Permissions & natif

- [ ] Aucune permission Android ajoutée sans ligne dans la matrice
      `docs/lumina-ionic-capacitor-permissions.md` §1.2.
- [ ] Aucune demande de permission hors de `src/lib/nativePermissions`
      (jamais au démarrage à froid, toujours après l'écran d'explication).
- [ ] Aucun plugin configuré dans `capacitor.config.ts` sans être installé
      (`pnpm run check:native-plugins` passe ; couvert aussi par
      `src/lib/__tests__/capacitor-config-plugins.test.ts`).

## Preuves (obligatoire)

- [ ] `pnpm exec tsc -b --noEmit` : 0 erreur
- [ ] `pnpm exec eslint .` : 0 erreur
- [ ] `pnpm test` : tous les tests passent, et **au moins un test échoue si le
      correctif est retiré** (non-vacuité, cf. en-tête des fichiers de test)
- [ ] Test manuel sur appareil : décrire l'appareil, la version d'Android, et
      joindre les sorties `adb` pertinentes (`docs/audit-permissions.md` pour
      les permissions)
- [ ] Compteurs avant/après si la PR touche des composants UI (commande §2 du
      document d'audit)

## Interdits (PR refusée si présent)

- Déclarer « fait » sans preuve exécutée.
- Ajouter `READ_EXTERNAL_STORAGE` / `WRITE_EXTERNAL_STORAGE`.
- Réintroduire une demande de permission au démarrage à froid.
- Avaler une erreur silencieusement (`catch {}` sans trace).
