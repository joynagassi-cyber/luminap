# Audit des coûts cloud Lumina — lancement 0–20 églises

Date : 2026-11-01. Devise : FCFA (XOF). Taux de budget : 1 USD = 600 F + provision 15 % (hypothèses ajustables).

## Correction de trajectoire

Cette version remplace le scénario « production confortable » par un lancement volontairement sobre :

- **Pas de Vercel** au lancement. Landing page / hébergement web seulement après les 20 premières églises, si le budget le permet.
- **Pas de domaine** au lancement.
- **Pas de validation email payante** au lancement. Les comptes peuvent être créés / accompagnés manuellement ; les mots de passe oubliés restent un point à traiter.
- **Pas de Sentry payant** au lancement. Replay à 0 %, erreurs connues filtrées à la source.
- **Données de test CI/CD exclues** du modèle client. Les ~45 MB mesurés ne sont pas une baseline de production ; une provision de schéma de 20 MB reste à remesurer après nettoyage.
- **Compression des fichiers** : cible de 80 % de réduction, pas une garantie. 10 MB avec -80 % = 2 MB, pas quelques octets.

## Verdict corrigé

- **PowerSync Cloud Pro démarre à 49 $/mois**, pas 25 $. Les **25 $/mois** officiels correspondent à une **instance supplémentaire** au-delà des 2 instances incluses. Source : https://powersync.com/pricing
- Socle minimal payant à 20 églises : **Supabase Pro 25 $ + PowerSync Pro 49 $ = 74 $/mois**, soit environ **51 060 F/mo** au total, ou **2 553 F/église/mo** avec les hypothèses de change/provision.
- Le gratuit peut servir à un pilote, mais à 20 églises / 5 utilisateurs actifs / 100 fichiers de 1 MB par église et par mois, même avec -80 % de compression :
  - Supabase Storage 1 GB : dépassé vers le **mois 3** ;
  - Supabase DB 500 MB : dépassé vers le **mois 4** ;
  - PowerSync hosted 500 MB : dépassé vers le **mois 3** ;
  - pic PowerSync modélisé : **72 connexions**, au-dessus des 50 du Free.
- À 20 églises, 20 abonnements Église à 5 000 F = **100 000 F/mo**. Le socle minimal laisse une marge technique brute, mais pas un bénéfice net : support, PSP, acquisition, impôts et structure ne sont pas inclus.

## Livrables

- `audit-couts-lumina.pdf` : rapport corrigé.
- `simulateur-couts-lumina.xlsx` : simulateur ajustable :
  - `Lisez-moi`
  - `Hypothèses`
  - `Tarifs officiels`
  - `Lancement 0-20`
  - `Compression`
  - `Projection 12 mois`
  - `Rentabilité`
  - `Sources & limites`
- `snapshot-supabase.json` : mesure historique de la base de test au 2026-11-01, conservée pour traçabilité, pas comme baseline client.
- `mesure-supabase.sql` : requêtes read-only pour reproduire la mesure.

Régénérer :

```bash
python -m pip install -r scripts/cost-audit/requirements.txt
PYTHONPATH=.venv/pitch-tools/python python scripts/cost-audit/build_audit.py
```

## Hypothèses centrales

- 20 églises.
- 5 utilisateurs actifs par église ; 1,2 appareil par utilisateur ; 60 % connectés au pic.
- 100 fichiers par église et par mois, 1 MB avant compression.
- Cible de compression : 80 % de réduction, soit 0,2 MB stocké en moyenne si la cible est atteinte.
- 200 membres enregistrés, 4 cultes, 200 transactions, 4 événements, 200 notifications, 2 000 entrées d'audit par église/mo.
- Provision schéma après nettoyage : 20 MB, à remplacer par une mesure réelle.
- Sentry replay : 0 %.
- Vercel, domaine, Resend/SMTP payant, Sentry Team : 0 au lancement.

## Points à ne pas promettre

1. **PowerSync à 25 $ comme plan d'entrée** : faux dans la grille Cloud officielle. C'est un supplément d'instance.
2. **10 MB compressé en quelques octets** : faux comme promesse générale. -80 % donne 2 MB. Quelques KB impliquerait environ -99,9 %, non réaliste pour beaucoup de PDF.
3. **Supprimer des erreurs Sentry rend le quota** : non. Il faut filtrer / rejeter à la source, ou utiliser les mécanismes de discard adaptés.
4. **Pas de validation email = aucun besoin email** : pas exactement. L'inscription peut être autoconfirmée, mais les resets / invitations / notifications email restent des cas à traiter.
5. **Compression = gratuit illimité** : non. Elle réduit fichiers et egress, mais pas les limites DB, PowerSync hosted, pic de connexions, ni les sauvegardes.

## Actions recommandées

- Nettoyer les données CI/CD puis remesurer DB / auth / storage.
- Désactiver le replay Sentry et filtrer les erreurs connues avant envoi.
- Benchmarker la compression sur 20–50 fichiers réels : PDF scannés, PDF texte, photos.
- Surveiller mensuellement Supabase DB/storage/egress, PowerSync synced/hosted/pic, OneSignal MAU.
- Après 20 églises : décider landing page, Vercel, domaine, validation email, SMTP et sauvegarde durable.

## Sources officielles

- Supabase : https://supabase.com/pricing ; https://supabase.com/docs/guides/platform/database-size ; https://supabase.com/docs/guides/platform/billing-on-supabase ; https://supabase.com/docs/guides/auth/auth-smtp
- PowerSync : https://powersync.com/pricing ; https://docs.powersync.com/resources/usage-and-billing/usage-and-billing-faq
- OneSignal : https://onesignal.com/pricing ; https://documentation.onesignal.com/docs/en/billing-faq
- Sentry : https://sentry.io/pricing/ ; https://docs.sentry.io/product/issues/states-triage/ ; https://docs.sentry.io/product/session-replay/replay-details/
- Vercel : https://vercel.com/pricing ; https://vercel.com/docs/plans/hobby
- Render : https://render.com/pricing ; https://render.com/docs/static-sites
- Resend : https://resend.com/pricing
- Cloudflare R2 : https://developers.cloudflare.com/r2/pricing/
- GitHub Actions : https://docs.github.com/en/billing/concepts/product-billing/github-actions
- Cypress : https://www.cypress.io/pricing
- Ghostscript PDF : https://ghostscript.readthedocs.io/en/latest/VectorDevices.html
- Firebase FCM : https://firebase.google.com/pricing
- Google Play : https://support.google.com/googleplay/android-developer/answer/6112435
- Apple Developer : https://developer.apple.com/programs/enroll/
