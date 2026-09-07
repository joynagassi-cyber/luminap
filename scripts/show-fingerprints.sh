#!/bin/bash
# Script simple pour afficher les empreintes SHA1 et SHA256
# d'un keystore existant
#
# Usage: bash scripts/show-fingerprints.sh [keystore_path] [alias] [password]

set -e

KEYSTORE_FILE="${1:-android/app/release.keystore}"
KEY_ALIAS="${2:-lumina-release}"
KEYSTORE_PASSWORD="${3:-lumina1234}"

echo "=========================================="
echo "Empreintes du keystore"
echo "=========================================="
echo ""
echo "Fichier: $KEYSTORE_FILE"
echo "Alias:   $KEY_ALIAS"
echo ""

if [ ! -f "$KEYSTORE_FILE" ]; then
    echo "❌ Keystore non trouvé: $KEYSTORE_FILE"
    echo ""
    echo "Générez-le avec:"
    echo "   bash scripts/generate-keystore.sh"
    exit 1
fi

echo "=========================================="
echo "📊 Empreintes RELEASE"
echo "=========================================="
echo ""

echo "🔐 SHA1 (Release):"
keytool -list -v -keystore "$KEYSTORE_FILE" -storepass "$KEYSTORE_PASSWORD" -alias "$KEY_ALIAS" 2>/dev/null | grep "SHA1:"
echo ""

echo "🔐 SHA256 (Release):"
keytool -list -v -keystore "$KEYSTORE_FILE" -storepass "$KEYSTORE_PASSWORD" -alias "$KEY_ALIAS" 2>/dev/null | grep "SHA256:"
echo ""

echo "=========================================="
echo "📊 Empreintes DEBUG"
echo "=========================================="
echo ""

DEBUG_KEYSTORE="$HOME/.android/debug.keystore"
if [ -f "$DEBUG_KEYSTORE" ]; then
    echo "🔐 SHA1 (Debug):"
    keytool -list -v -keystore "$DEBUG_KEYSTORE" -storepass android -alias androiddebugkey 2>/dev/null | grep "SHA1:"
    echo ""
    echo "🔐 SHA256 (Debug):"
    keytool -list -v -keystore "$DEBUG_KEYSTORE" -storepass android -alias androiddebugkey 2>/dev/null | grep "SHA256:"
else
    echo "⚠️  Debug keystore non trouvé."
    echo "   Générez-le avec Android Studio ou:"
    echo "   keytool -genkey -v -keystore $DEBUG_KEYSTORE -alias androiddebugkey -keyalg RSA -keysize 2048 -validity 10000"
fi
echo ""

echo "=========================================="
echo "✅ Terminé"
echo "=========================================="
