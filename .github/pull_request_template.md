## Objet

<!-- Phase du plan de correction (A0…A8) ou correctif — lien vers l'audit
     (docs/lumina-ionic-capacitor-permissions.md) ou l'issue. -->

## Compteurs avant / après

<!-- Ce qui a changé, chiffré : permissions, occurrences supprimées,
     tests… Jamais « fait » sans preuve. -->

## Checklist

- [ ] **« Ionic d'abord »** : aucun composant maison n'a d'équivalent Ionic
      inutilisé — ou l'exception est enregistrée dans
      `docs/ui-exceptions.md`. Tailwind = mise en page, pas des contrôles.
- [ ] Aucune demande de permission hors `PermissionService` ; jamais au
      démarrage à froid ; écran d'explication d'abord. Aucune permission
      Android hors matrice (`READ/WRITE_EXTERNAL_STORAGE` interdits).
- [ ] Aucune erreur avalée : statuts typés + `reportError`.
- [ ] Tests verts (`pnpm test`) et typecheck propre (`tsc -b --noEmit`) —
      ou écarts expliqués avec preuve qu'ils préexistaient.
- [ ] Si impact visuel ou natif : items ajoutés à la checklist appareil
      (`docs/audit-permissions.md` §4) ; la validation sur appareil reste
      explicitement due, pas déclarée faite.
