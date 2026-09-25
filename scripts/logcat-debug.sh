#!/usr/bin/env bash
# ============================================================
# Mode debug Lumina — capture logcat en direct depuis le téléphone
# ============================================================
# Usage :
#   1. Branche le téléphone en USB (débogage USB activé)
#   2. Ouvre le terminal dans le projet et lance :
#        pnpm debug            (logcat en direct, Ctrl+C pour stop)
#        pnpm debug --save     (idem + sauvegarde logs/lumina-<date>.log)
#   3. Dans le téléphone : ouvre Lumina, reproduis l'erreur.
#      Les erreurs apparaissent en direct dans le terminal (et dans le
#      fichier de logs/ si --save).
#
# Premier branchement : autoriser « Débogage USB » sur le téléphone
# et « Autoriser la débogage ADB depuis cet ordinateur ».
#
# L'APK v1.0.1 installé est compatible : même applicationId
# (com.lumina.mfejc) — logcat couvre l'app quel que soit le build.
set -e

ADB="$HOME/.android-tools/adb.exe"
PKG="com.lumina.mfejc"

if ! "$ADB" devices 2>/dev/null | grep -qE "device$"; then
  "$ADB" devices
  echo
  echo "AUCUN APPAREIL CONNECTÉ. Vérifie :"
  echo "  1. câble USB branché + téléphone débloqué"
  echo "  2. Paramètres → À propos → « Numéro de build » (tap 7×) → options développeur"
  echo "  3. Options développeur → « Débogage USB » activé"
  echo "  4. autorisation « Débogage ADB depuis cet ordinateur »"
  exit 1
fi

"$ADB" logcat -s "*:E" "chromium:E" "ReactNativeJS:*" "MainActivity:*" "$PKG/*" 2>&1 |
  { if [ "$1" = "--save" ]; then
      LOG="logs/lumina-$(date +%Y-%m-%d-%H%M%S).log"
      mkdir -p logs
      echo "→ capture dans $LOG"
      tee "$LOG"
    else
      cat
    fi
  } "$@"
