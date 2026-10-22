# Mémoire projet — Lumina (`luminap`)

## Conventions de travail (préférences du propriétaire)
- **Commit + push après CHAQUE modification majeure** (consigne explicite) :
  sécuriser le travail en continu pour éviter toute perte. Branche de travail :
  `agent/session-2026-10-22-stabilisation`.
- Langue des documents et échanges : **français**. Code/commits : convention du
  dépôt (français dans les messages, co-auteur `openhands`).
- Le remote GitHub du dépôt peut contenir un jeton **expiré** → réécrire l'URL :
  `git remote set-url origin "https://${GITHUB_TOKEN}@github.com/joynagassi-cyber/luminap.git"`.
  Toujours pousser avec `git -c credential.helper= push` (sinon invite de mot de passe).
- Supabase CLI : utiliser `npx supabase@latest` (le binaire `supabase` n'est pas
  sur le PATH). `pg_dump`/`psql` sont dans `/usr/bin`.

## Environnement d'exécution (conteneur)
- **Le conteneur redémarre de façon imprévisible** (mémoire épuisée si vitest +
  build/Cypress tournent en parallèle). Conséquences observées :
  `/tmp` est vidé, les processus (Vite, Xvfb, Cypress) sont tués, le binaire
  Cypress (`~/.cache/Cypress/16.0.0`) est effacé, Xvfb doit être réinstallé
  (`apt-get install -y xvfb …`).
- **Ne jamais lancer vitest et un build/Cypress en parallèle** : lancer
  séquentiellement.
- Relance de l'infra de test :
  `Xvfb :99 -screen 0 1280x720x24 -nolisten tcp &`
  puis `DISPLAY=:99 npx vite --port 8080 --host 127.0.0.1 &`
  puis `DISPLAY=:99 npx cypress run --config baseUrl=http://127.0.0.1:8080,video=false`.

## Défaut applicatif majeur (généralisé)
- **`onIonChange` sur `<IonInput>`/`<IonTextarea>` ne se déclenche qu'au blur**
  (comportement Ionic). Un clic sur un bouton **désactivé** ne provoque aucun
  blur → l'état React reste vide → l'utilisateur est **bloqué** (ex. bouton
  « Ajouter » de `/members` jamais activé). Correctif : `onIonInput` (émis à la
  frappe). **`IonSelect` et `IonCheckbox` n'ont PAS d'événement `ionInput`** →
  conserver `onIonChange` pour eux.
- Détail complet et preuves : `.openhands/memory/2026-10-22.md`, `docs/agent-session/`.

## Base de données (Supabase `hhgovvrnalibhgpakswi`, eu-west-2)
- Environnement de **test/dev** (pas de production réelle : domaines de test
  dominants, 0 donnée financière). Écritures autorisées, sauvegarde faite.
- Migrations versionnées dans `supabase/migrations/` + rollback dans
  `supabase/migrations/rollback/`.
- Chaîne d'escalade de rôle entièrement fermée (migrations 000011/12/14).
