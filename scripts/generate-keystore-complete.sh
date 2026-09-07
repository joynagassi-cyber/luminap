#!/bin/bash
# ============================================
# Génération complète du keystore Lumina
# Package: com.lumina.mfejc
# ============================================

set -e

APP_ID="com.lumina.mfejc"
KEYSTORE_FILE="android/app/release.keystore"
KEY_ALIAS="lumina-release"
KEYSTORE_PASSWORD="lumina1234"
DURATION_DAYS=10000

mkdir -p android/app

# Générer le keystore
keytool -genkeypair \
    -alias "$KEY_ALIAS" \
    -keyalg RSA \
    -keysize 2048 \
    -validity $DURATION_DAYS \
    -keystore "$KEYSTORE_FILE" \
    -storepass "$KEYSTORE_PASSWORD" \
    -keypass "$KEYSTORE_PASSWORD" \
    -dname "CN=Lumina MFE-JC, OU=Ministère, O=Église MFE-JC Centrale, L=Ouagadougou, ST=Kadiogo, C=BF"

# Récupérer les empreintes
SHA1_RELEASE=$(keytool -list -v -keystore "$KEYSTORE_FILE" -storepass "$KEYSTORE_PASSWORD" -alias "$KEY_ALIAS" 2>/dev/null | grep "SHA1:" | awk '{print $2}')
SHA256_RELEASE=$(keytool -list -v -keystore "$KEYSTORE_FILE" -storepass "$KEYSTORE_PASSWORD" -alias "$KEY_ALIAS" 2>/dev/null | grep "SHA256:" | awk '{print $2}')

# Debug
SHA1_DEBUG=""
SHA256_DEBUG=""
DEBUG_KEYSTORE="$HOME/.android/debug.keystore"
if [ -f "$DEBUG_KEYSTORE" ]; then
    SHA1_DEBUG=$(keytool -list -v -keystore "$DEBUG_KEYSTORE" -storepass android -alias androiddebugkey 2>/dev/null | grep "SHA1:" | awk '{print $2}')
    SHA256_DEBUG=$(keytool -list -v -keystore "$DEBUG_KEYSTORE" -storepass android -alias androiddebugkey 2>/dev/null | grep "SHA256:" | awk '{print $2}')
fi

# Affichage formaté
echo "╔══════════════════════════════════════════════════════════╗"
echo "║           KEYSTORE LUMINA - COM.LUMINA.MFEJC            ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""
echo "📦 PACKAGE: $APP_ID"
echo "📁 KEYSTORE: $KEYSTORE_FILE"
echo "🔑 ALIAS: $KEY_ALIAS"
echo "🔐 PASSWORD: $KEYSTORE_PASSWORD"
echo ""
echo "──────────────────────────────────────────────────────────"
echo "  🔐 SHA1 (Release):   $SHA1_RELEASE"
echo "  🔐 SHA256 (Release): $SHA256_RELEASE"
echo "──────────────────────────────────────────────────────────"
if [ -n "$SHA1_DEBUG" ]; then
    echo ""
    echo "  🐛 SHA1 (Debug):     $SHA1_DEBUG"
    echo "  🐛 SHA256 (Debug):   $SHA256_DEBUG"
    echo "  📁 Debug keystore:   $DEBUG_KEYSTORE"
    echo "  🔑 Debug password:   android"
fi
echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║  🔑 POUR FIREBASE: Copiez le SHA1 (Release) ci-dessus  ║"
echo "╚══════════════════════════════════════════════════════════╝"
