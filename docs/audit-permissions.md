# Audit permissions Android — modèle à remplir sur appareil (phase A0/A2)

> **Statut** : **gabarit non exécuté**. Aucune ligne de ce document ne peut être
> remplie sans un téléphone réel : les permissions d'exécution, la fenêtre
> système et la livraison d'une notification ne se prouvent pas en test unitaire.
> Compléter puis attacher `adb` (sorties brutes) — c'est la **preuve** exigée par
> la porte de sortie de la phase A2 (`docs/lumina-ionic-capacitor-permissions.md` §5).

## 1. Matrice de test (4 appareils / versions)

| # | Version Android | Modèle | `POST_NOTIFICATIONS` déclarée | `granted` | Fenêtre après explication | Notification reçue | Verdict |
|---|---|---|---|---|---|---|---|
| 1 | 12 (API 31) | | | n/a (accordée d'office) | | | |
| 2 | 13 (API 33) | | | | | | |
| 3 | 14 (API 34) | | | | | | |
| 4 | 15 (API 35) | | | | | | |

## 2. Commandes de relevé

```bash
# 1) Ce que l'application déclare et ce qui est accordé
adb shell dumpsys package com.lumina.mfejc | grep -A40 "requested permissions"
adb shell dumpsys package com.lumina.mfejc | grep -A10 "runtime permissions"

# 2) Journal de la chaîne de permission (Capacitor + plugins)
adb logcat -c
#   … déclencher le parcours dans l'app …
adb logcat -d | grep -Ei "capacitor|pushnotifications|localnotification|permission"

# 3) Sauvegarde : ne doit contenir AUCUNE base ni préférence (C-07a)
adb backup -f /tmp/lumina.ab -apk com.lumina.mfejc
tar tf /tmp/lumina.ab | head -50        # attendu : aucun .db / .xml / shared_prefs

# 4) État de la permission, indépendamment de l'app
adb shell cmd appops get com.lumina.mfejc POST_NOTIFICATION
```

## 3. Parcours à rejouer (et résultat attendu)

| Étape | Attendu | Observé |
|---|---|---|
| 1. Première transaction enregistrée (`/transaction/new`, montant > 0) | après l'enregistrement, une **feuille d'explication** s'ouvre (pas au démarrage) | |
| 2. « Autoriser les notifications » | la **fenêtre système Android** apparaît | |
| 3. Accepter | l'interrupteur de Réglages › Notifications passe à « Notifications activées sur cet appareil » | |
| 4. « Envoyer une notification de test » | notification visible dans le tiroir, canal « Lumina » | |
| 5. Refuser la fenêtre système (2ᵉ appareil) | état « Refusées » ; la question n'est pas reposée au boot | |
| 6. Refuser une 2ᵉ fois | état « Bloquées dans Android » + bouton « Ouvrir les réglages Android » | |
| 7. Ouvrir les réglages, activer, revenir dans l'app | l'état se met à jour **sans redémarrage** (listener `resume`) | |
| 8. « Plus tard » | aucune fenêtre ; la question ne revient pas avant 7 jours | |
| 9. Prise de photo de preuve (`/transaction/new`) | **aucune** fenêtre de permission caméra | |
| 10. Export (rapport/CSV) | l'écran de partage Android s'ouvre | |
| 11. Thème clair | icônes de la barre d'état **lisibles** (sombres) | |
| 12. Bas de l'écran (gestuelle **et** 3 boutons) | aucun vide anormal au-dessus de la barre système (C-09) | |
| 13. Formulaire clavier ouvert | bouton « Enregistrer la transaction » visible et cliquable (C-10) | |

## 4. Ce qui est déjà prouvé hors appareil (tests unitaires)

- `src/lib/__tests__/permission-service.test.ts` (13 tests) : refus ⇒ `denied`,
  2 refus ⇒ `blocked`, pas de nouvelle demande si `granted`/`blocked`, report
  7 jours, web ⇒ `unavailable`, erreurs de plugin **remontées** (pas avalées).
- `src/components/__tests__/PermissionPrimer.test.tsx` (5 tests) : l'explication
  s'affiche **avant** toute demande ; « Plus tard » ne demande rien ; `blocked`
  ne propose que « Ouvrir les réglages ».
- `src/lib/__tests__/onesignal-no-native-bridge.test.ts` (3 tests) : plus aucune
  API natif inventé n'est appelée (P-01).
- `src/lib/__tests__/capacitor-config-plugins.test.ts` : aucun plugin configuré
  sans être installé (C-01).
