#!/bin/bash
# ============================================
# KEYSTORE LUMINA - COM.LUMINA.MFEJC
# Génère le keystore et affiche les empreintes
# ============================================

set -e

APP_ID="com.lumina.mfejc"
KS="android/app/release.keystore"
ALIAS="lumina-release"
PASS="lumina1234"

mkdir -p android/app

# Générer le keystore
keytool -genkeypair \
  -alias $ALIAS \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -keystore $KS \
  -storepass $PASS \
  -keypass $PASS \
  -dname "CN=Lumina MFE-JC, OU=Ministère, O=Église MFE-JC Centrale, L=Ouagadougou, ST=Kadiogo, C=BF"

# Récupérer les empreintes
SHA1=$(keytool -list -v -keystore $KS -storepass $PASS -alias $ALIAS 2>/dev/null | grep "SHA1:" | awk '{print $2}')
SHA256=$(keytool -list -v -keystore $KS -storepass $PASS -alias $ALIAS 2>/dev/null | grep "SHA256:" | awk '{print $2}')

# Debug
SHA1D="N/A"
SHA256D="N/A"
if [ -f "$HOME/.android/debug.keystore" ]; then
  SHA1D=$(keytool -list -v -keystore "$HOME/.android/debug.keystore" -storepass android -alias androiddebugkey 2>/dev/null | grep "SHA1:" | awk '{print $2}')
  SHA256D=$(keytool -list -v -keystore "$HOME/.android/debug.keystore" -storepass android -alias androiddebugkey 2>/dev/null | grep "SHA256:" | awk '{print $2}')
fi

# Affichage
echo ""
echo "╔════════════════════════════════════════════════════════════════════╗"
echo "║                    KEYSTORE LUMINA - CONFIGURÉ                     ║"
echo "╚════════════════════════════════════════════════════════════════════╝"
echo ""
echo "  📦 Package      : $APP_ID"
echo "  📁 Keystore     : $KS"
echo "  🔑 Alias        : $ALIAS"
echo "  🔐 Password     : $PASS"
echo ""
echo "  ─────────────────────────────────────────────────────────────────"
echo "  🔐 SHA1 (Release)   : $SHA1"
echo "  🔐 SHA256 (Release) : $SHA256"
echo "  ─────────────────────────────────────────────────────────────────"
echo "  🐛 SHA1 (Debug)   : $SHA1D"
echo "  🐛 SHA256 (Debug) : $SHA256D"
echo "  ─────────────────────────────────────────────────────────────────"
echo ""
echo "  🔑 Copiez le SHA1 (Release) dans Firebase Console"
echo "  📋 Fichier sauvegardé: $KS"
echo ""
