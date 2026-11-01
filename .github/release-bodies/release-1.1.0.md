## Lumina v1.1.0 — Robustesse & intégrité (Phase 15) + écran d'accueil + invitations enrichies

Cette release majeure regroupe la **Phase 15** du contrat (propositions
PR1–PR16), un **écran d'accueil mobile** avant la connexion, et plusieurs
correctifs de robustesse issus des audits R52/R129/R137/R140/R160.

### Écran d'accueil (nouveau)
- **Écran `/welcome`** : onboarding mobile natif affiché avant `/auth` —
  illustration, message inspirant et passage clair vers la connexion.
  Respecte les zones sûres (encoche/barre) et les thèmes clair/sombre.

### Robustesse & intégrité (PR1–PR7)
- **PR1 — Journal d'audit consultable** : `/trace` + détail d'une entrée
  (avant/après, acteur, entité). Traçabilité des actions sensibles.
- **PR2 — Export / sauvegarde des données** : export JSON (restauration
  complète) et CSV (tableur) depuis Paramètres → Sauvegarde des données.
- **PR3 — Corbeille / restauration** : `/archives` pour consulter et
  restaurer les éléments archivés (anti-perte).
- **PR4 — Page de santé** : version, état de la base, synchronisation et
  dernières erreurs (exploitation autonome).
- **PR5 — « Signaler un problème »** : diagnostic sans donnée personnelle,
  copiable et envoyable.
- **PR6 — Mise à jour requise** : écran de compatibilité de schéma de sync.
- **PR7 — Drapeaux de fonctionnalités** : désactivation sûre (kill switches).

### Fonctionnalités produit (PR8–PR16)
- **PR8 — Approbation en deux étapes** (maker-checker) : l'auteur d'une
  dépense ne peut pas l'approuver lui-même (option par organisation).
- **PR9 — Pièces justificatives** : reçus (image/PDF) attachés aux
  transactions, synchronisés et nettoyés à la suppression.
- **PR10 — Rappels de rapport** : bannière « Rapport à envoyer » (cadence
  mensuelle) + notification.
- **PR11 — Recherche globale** : membres, groupes, événements, mouvements,
  documents, formulaires — hors ligne, insensible aux accents.
- **PR12 — Import CSV sécurisé** : aperçu avant écriture, anti-injection de
  formules, refus des fichiers non conformes.
- **PR13 — Gel de période** : clôture comptable (écritures refusées sur la
  période close), par organisation et partagée entre appareils.
- **PR14 — Transfert de propriété guidé** : jamais d'organisation sans
  administrateur (anti-orphelin).
- **PR15 — Statistiques d'usage anonymisées** : compteurs par fonctionnalité,
  sans donnée personnelle, réinitialisables.
- **PR16 — Centre d'aide étendu** : tutoriel + FAQ avec recherche
  (insensible aux accents), section « Inviter des membres ».

### Invitations enrichies
- **Capacités (autorisations) à l'invitation** : l'admin peut cocher des
  capacités précises, transportées par le code/QR/fichier et appliquées à
  l'invité au moment de la réclamation.
- **Correctif d'intégrité** : les lectures d'invitation renvoyaient les
  lignes PowerSync en `snake_case` sous un type `camelCase` → le claim par
  code perdait org/rôle/scope. Corrigé (mapping explicite) : le rôle et
  l'organisation de l'invitation sont désormais appliqués correctement.

### Notifications
- **Push local + cloud (OneSignal)** : cloche in-app, rappels et support.

### Correctifs notables
- **Écran muet (R129)** : audience JWT PowerSync (401) + filet « zéro écran
  muet ».
- **Réplication PowerSync Production** réparée (stream `profiles` org-wide).
- **Verdicts vides / chiffres faux / formulaires muets** avant la première
  lecture (famille R52.b→R52.t) — plus de « Aucun… » ni de formulaire vide
  pendant la synchronisation initiale.
- **Écritures de réglages** (`org_settings`) : plus d'`UPSERT` sur une vue
  PowerSync (PR8/PR13 désormais réellement persistés).
- **RBAC** : `ADMIN` 15ᵉ rôle canonique, RLS d'écriture (R137/R141),
  garde d'escalade (R139).
- **Build Android** : alignement Capacitor 7 (R90) — build APK réparé.

### Détails de la signature
- APK signé v1+v2+v3 avec le keystore lumina.
- Assets : `app-release.apk` + `app-release.apk.sha256` (hash compagnon
  POSIX lu par le self-updater, format `sha256sum`).

### Mise à jour automatique
L'application vérifie cette release au démarrage (Android) et propose
« Mettre à jour » : téléchargement avec vérification SHA-256, puis
installation via le programme d'installation Android.

### Changelog technique (depuis v1.0.9)
- `android/app/build.gradle` : versionCode 10→11 / versionName 1.0.9→1.1.0.
- Phase 15 : PR1–PR16 (journal d'audit, export, corbeille, santé, support,
  mise à jour requise, kill switches, maker-checker, justificatifs, rappels,
  recherche globale, import CSV, gel de période, transfert de propriété,
  stats d'usage, centre d'aide).
- Écran `/welcome` + câblage des routes et deep links.
- Invitations : capacités + mapping snake_case→camelCase.
- Notifications push (OneSignal) + rappels.
