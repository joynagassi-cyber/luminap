#!/bin/bash
# ============================================
# Génération complète du keystore + affichage
# ============================================

set -e

APP_ID="com.lumina.mfejc"
KEYSTORE_FILE="android/app/release.keystore"
KEY_ALIAS="lumina-release"
KEYSTORE_PASSWORD="lumina1234"
DURATION_DAYS=10000

# Créer le répertoire
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

# Afficher les empreintes
echo ""
echo "=========================================="
echo "✅ KEYSTORE GÉNÉRÉ AVEC SUCCÈS"
echo "=========================================="
echo ""

# Release fingerprints
echo "📊 RELEASE KEYSTORE"
echo "----------------------------------------"
echo "Fichier:    $KEYSTORE_FILE"
echo "Alias:      $KEY_ALIAS"
echo "Password:   $KEYSTORE_PASSWORD"
echo ""

SHA1_RELEASE=$(keytool -list -v -keystore "$KEYSTORE_FILE" -storepass "$KEYSTORE_PASSWORD" -alias "$KEY_ALIAS" 2>/dev/null | grep "SHA1:" | awk '{print $2}')
SHA256_RELEASE=$(keytool -list -v -keystore "$KEYSTORE_FILE" -storepass "$KEYSTORE_PASSWORD" -alias "$KEY_ALIAS" 2>/dev/null | grep "SHA256:" | awk '{print $2}')

echo "SHA1 (Release):   $SHA1_RELEASE"
echo "SHA256 (Release): $SHA256_RELEASE"
echo ""

# Debug fingerprints
echo "📊 DEBUG KEYSTORE"
echo "----------------------------------------"
DEBUG_KEYSTORE="$HOME/.android/debug.keystore"

if [ -f "$DEBUG_KEYSTORE" ]; then
    SHA1_DEBUG=$(keytool -list -v -keystore "$DEBUG_KEYSTORE" -storepass android -alias androiddebugkey 2>/dev/null | grep "SHA1:" | awk '{print $2}')
    SHA256_DEBUG=$(keytool -list -v -keystore "$DEBUG_KEYSTORE" -storepass android -alias androiddebugkey 2>/dev/null | grep "SHA256:" | awk '{print $2}')
    echo "Fichier:  $DEBUG_KEYSTORE"
    echo "Password: android"
    echo ""
    echo "SHA1 (Debug):     $SHA1_DEBUG"
    echo "SHA256 (Debug):   $SHA256_DEBUG"
else
    echo "⚠️  Debug keystore non trouvé"
    echo "Générez-le avec:"
    echo "  keytool -genkey -v -keystore $DEBUG_KEYSTORE -alias androiddebugkey -keyalg RSA -keysize 2048 -validity 10000 -storepass android"
fi
echo ""

echo "=========================================="
echo "📋 RÉSUMÉ POUR FIREBASE / GOOGLE PLAY"
echo "=========================================="
echo ""
echo "App ID:    $APP_ID"
echo ""
echo "SHA1 (Release):   $SHA1_RELEASE"
echo "SHA256 (Release): $SHA256_RELEASE"
echo ""
echo "🔑 Copiez le SHA1 (Release) dans Firebase Console"
echo ""
