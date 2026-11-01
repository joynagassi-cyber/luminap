## Lumina v1.2.0 — Documentation visuelle, création d'organisation self-serve & durcissement des écritures

Cette release consolide les acquis de la v1.1.0 : un **guide visuel des écrans
intégré au tutoriel**, une **création d'organisation autonome** qui supprime le
cul-de-sac « Organisation non rejointe », et la **fermeture du chantier
d'autorisation d'écriture** (R141/R141.b/c/d) côté base.

### Guide visuel des écrans (nouveau)
- **Captures annotées** de **64 écrans** (390×844) générées automatiquement par
  Cypress, intégrées au tutoriel dans une **galerie par section**.
- **PDF compagnon** `docs/agent/GUIDE_ECRANS.pdf` (35 pages) pour la passation
  et le support hors ligne.
- Chaîne reproductible : `pnpm docs:screens` (capture) → `pnpm docs:visual`
  (WebP nue + annotée, guide généré, PDF).

### Création d'organisation self-serve (correctif majeur, R161)
- Un nouvel utilisateur peut **créer sa propre organisation** sans attendre une
  invitation : fin du cul-de-sac « Organisation non rejointe ».
- Le profil est rafraîchi après création ; le nouvel admin voit immédiatement
  son organisation.

### Robustesse & intégrité
- **PR4 — Page de santé** et **PR5 — « Signaler un problème »** : couverture
  E2E ajoutée (état général + relevés jamais vides ; signalement réellement
  journalisé, sans donnée personnelle).
- **Autorisation d'écriture durcie (R141 / R141.b / R141.c / R141.d)** : les
  dernières politiques RLS d'écriture restées sur « membre seul » passent sur
  les permissions canon (`has_permission()`). Preuve en base : un `MEMBRE`
  reçoit `42501` là où un rôle habilité est accepté.

### Sous le capot
- **Gardes anti-régression** ajoutées : `pr18-write-permission-guard`,
  `r141d-write-permission-guard`, `r141bc-write-permission-guard`.
- **Guide visuel** : test unitaire de cohérence du manifeste (captures
  présentes, non-vacuité) + specs E2E dédiées.

### Détails de la signature
- APK signé v1+v2+v3 avec le keystore lumina (fingerprints enregistrés dans la
  console Firebase / Google Play).
- Assets : `app-release.apk` + `app-release.apk.sha256` (hash compagnon POSIX
  lu par le self-updater, format `sha256sum`).

### Mise à jour
- Depuis l'app Android : Paramètres → Mise à jour, ou notification automatique
  (vérification `releases/latest` toutes les 6 h).
- `versionCode` 12, `versionName` 1.2.0.
