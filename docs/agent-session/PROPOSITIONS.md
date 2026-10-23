# Propositions — Lumina (session 2026-10-22)

> Aucune de ces propositions n'est implémentée, sauf mention explicite
> (« fait pendant la session »). Elles sont triées par priorité.
> Coût en heures de travail d'un ingénieur familier du dépôt.

## Priorité CRITIQUE (bloquantes pour la fiabilité à 4 mois)

### P1 — Activer les sauvegardes planifiées + PITR Supabase
- **Problème** : `backups=[]`, `pitr_enabled=false` (constaté via l'API
  Management). Une corruption ou une suppression accidentelle est
  **irréversible**. Voir RISQUES R18.
- **Proposition** : activer les sauvegardes quotidiennes et, si le plan le
  permet, le PITR. Tester une restauration réelle au moins une fois.
- **Intérêt** : sans cela, tout le reste du travail de fiabilité est annulé
  par un seul incident.
- **Coût** : 0,5 h (configuration) + 1 h (test de restauration).
- **Risques** : coût d'hébergement selon le plan ; aucune modification de code.
- **Bloquante** : **oui**.

### P2 — Réconcilier les migrations du dépôt avec la base (dérive R17)
- **Problème** : 128 fichiers de migration mais l'historique appliqué diverge
  de la base réelle. Un `supabase db push` sur une base neuve ne reproduit pas
  l'état actuel → impossible de reconstruire l'environnement.
- **Proposition** : produire un dump de schéma de référence, régénérer un jeu
  de migrations « baseline » cohérent, et adopter `supabase db diff` en CI.
- **Intérêt** : reproductibilité, onboarding, restauration.
- **Coût** : 6–10 h. **Risques** : moyen (manipulation de schéma) → à faire
  hors ligne sur une base de test.
- **Bloquante** : oui pour la reprise à froid.

### P3 — Traiter les 59 profils rattachés à `org-1` (R22) et 47 orphelins (R10)
- **Problème** : des comptes (dont des adresses e-mail réelles) restent
  rattachés à une organisation de démonstration.
- **Proposition** : décider avec le propriétaire du devenir de ces comptes
  (rattachement à leur propre organisation, ou anonymisation). Opération en
  masse, réversible, journalisée.
- **Coût** : 1 h + validation propriétaire. **Risques** : élevé (données
  personnelles) → exige l'accord explicite du propriétaire.

## Priorité HAUTE

### P4 — Limitation de débit sur les endpoints sensibles (R6)
- **Problème** : aucun rate-limit sur connexion, invitation, envoi de rapport.
- **Proposition** : rate-limit au niveau Supabase (Edge Function) ou du
  fournisseur (Cloudflare), par IP et par compte.
- **Coût** : 3 h. **Risques** : faible. **Bloquante** : non, mais exposition
  aux abus.

### P5 — Suppression de compte et export de données (RGPD, R5)
- **Problème** : aucune fonction de suppression de compte ni d'export complet.
- **Proposition** : Edge Function `delete-account` (anonymisation + purge) et
  `export-account` (JSON/CSV), avec confirmation par e-mail.
- **Coût** : 6 h. **Risques** : moyen (données financières liées).

### P6 — Rendre `IonSelect`/`IonCheckbox` réactifs (R33)
- **Problème** : `onIonChange` reste la seule option ; un `<IonSelect>` qui
  conditionne l'activation d'un bouton peut bloquer comme l'a fait
  `onIonChange` sur `IonInput` (R32).
- **Proposition** : tester chaque `<IonSelect>` conditionnel ; au besoin,
  écouter `ionChange` **et** `ionInput`, ou déclencher la validation au
  `ionFocus`/`ionBlur`.
- **Coût** : 2 h. **Risques** : faible.

### P7 — Corriger les onglets `nav-bottom` non cliquables (R30)
- **Problème** : des vues Ionic conservent une superposition qui rend les
  onglets non cliquables dans certaines specs.
- **Proposition** : auditer `IonPage`/`IonRouterOutlet` et supprimer les
  couches résiduelles.
- **Coût** : 3 h. **Risques** : moyen (régression de navigation).

### P8 — Aucun test en CI (vitest non exécuté)
- **Problème** : 18 échecs vitest invisibles ; Cypress non exécuté en CI.
- **Proposition** : workflow GitHub Actions : `tsc`, `vitest run`, `build`,
  puis Cypress (headless) sur PR.
- **Coût** : 4 h. **Risques** : faible. **Bloquante** : non, mais garantit la
  non-régression après la session.

## Priorité MOYENNE

### P9 — Onboarding dynamique + tutoriel à jour
- **État** : implémenté pendant la session (exception explicite).
- **Reste** : enrichir avec des cas réels observés à l'usage.

### P10 — Observabilité et alertes (Phase 5)
- **Problème** : pas d'alerte en cas de panne critique ; Sentry présent mais
  configuration à vérifier.
- **Proposition** : brancher Sentry (front) + alertes Supabase (CPU, erreurs
  5xx, échecs d'authentification) vers un canal e-mail/Slack.
- **Coût** : 3 h. **Risques** : faible.

### P11 — Vérifier la résistance à la mise en pause du projet Supabase
- **Problème** : un projet Supabase inactif peut être mis en pause (plan
  gratuit) → l'app cesse de fonctionner silencieusement après quelques
  semaines.
- **Proposition** : mettre en place une sonde de disponibilité externe
  (cron) qui appelle `/rest/v1/` et alerte ; ou passer sur un plan payant.
- **Coût** : 2 h. **Risques** : faible.

### P12 — Divergence de rôle `profiles.role` ↔ `org_memberships.role` (R16)
- **Proposition** : désigner `org_memberships.role` comme source de vérité et
  déprécier `profiles.role` (ou le synchroniser par trigger).
- **Coût** : 4 h. **Risques** : moyen (logique de permissions partout).

### P13 — Mot de passe de test en clair dans le dépôt (R8) et keystore (R9)
- **Proposition** : déplacer les identifiants de test vers des variables
  d'environnement ; retirer le mot de passe du keystore du dépôt.
- **Coût** : 1 h. **Risques** : faible (les valeurs ne sont pas des secrets de
  production, mais restent à hygiéniser).

## Priorité BASSE

### P14 — Couverture Cypress complète par fonctionnalité
- **Problème** : plusieurs fonctionnalités n'ont ni test d'erreur, ni test de
  permissions, ni test responsive.
- **Proposition** : compléter selon la matrice FEATURES.md.
- **Coût** : 15–25 h. **Risques** : faible.

### P15 — Mesurer et suivre le budget de performance
- **Proposition** : Lighthouse CI + budget (LCP, taille de bundle).
- **Coût** : 3 h. **Risques** : faible.

### P16 — Mode sombre / thème et préférences d'accessibilité
- **Proposition** : exposer le thème dans `/settings` (le support existe dans
  les design tokens).
- **Coût** : 4 h. **Risques** : faible.

### P17 — Notifications push (OneSignal) — durcissement
- **Problème** : relais de notification non authentifié (R1, corrigé) ; à
  surveiller après déploiement.
- **Proposition** : vérifier la livraison réelle et le comportement hors ligne.
- **Coût** : 2 h. **Risques** : faible.
