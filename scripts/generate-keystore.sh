#!/bin/bash
# ============================================
# Générateur de Keystore pour Lumina Android
# Package: com.lumina.mfejc
# ============================================
#
# Ce script génère un keystore de release et affiche
# les empreintes SHA1 et SHA256 (release et debug).
#
# Prérequis: Java JDK 8+ installé avec keytool
# ============================================

set -e

# Configuration
APP_ID="com.lumina.mfejc"
KEYSTORE_FILE="android/app/release.keystore"
KEY_ALIAS="lumina-release"
KEY_PASSWORD="lumina1234"
KEYSTORE_PASSWORD="lumina1234"
DURATION_DAYS=10000

echo "=========================================="
echo "Génération du keystore pour $APP_ID"
echo "=========================================="
echo ""

# Vérifier que keytool est disponible
if ! command -v keytool &> /dev/null; then
    echo "❌ keytool non trouvé. Installez JDK 8+ :"
    echo ""
    echo "   macOS:"
    echo "     brew install openjdk"
    echo ""
    echo "   Ubuntu/Debian:"
    echo "     sudo apt install openjdk-17-jdk"
    echo ""
    echo "   Windows:"
    echo "     Téléchargez JDK depuis oracle.com"
    echo ""
    exit 1
fi

echo "✅ keytool disponible"
echo ""

# Créer le répertoire si nécessaire
mkdir -p "$(dirname "$KEYSTORE_FILE")"

# Créer le keystore de release
echo "📦 Création du keystore de release..."
keytool -genkeypair \
    -alias "$KEY_ALIAS" \
    -keyalg RSA \
    -keysize 2048 \
    -validity $DURATION_DAYS \
    -keystore "$KEYSTORE_FILE" \
    -storepass "$KEYSTORE_PASSWORD" \
    -keypass "$KEY_PASSWORD" \
    -dname "CN=Lumina MFE-JC, OU=Ministère, O=Église MFE-JC Centrale, L=Ouagadougou, ST=Kadiogo, C=BF"

echo "✅ Keystore créé: $KEYSTORE_FILE"
echo ""

# Extraire les empreintes
echo "=========================================="
echo "📊 Empreintes du keystore (RELEASE)"
echo "=========================================="
echo ""

SHA1_RELEASE=$(keytool -list -v -keystore "$KEYSTORE_FILE" -storepass "$KEYSTORE_PASSWORD" -alias "$KEY_ALIAS" 2>/dev/null | grep "SHA1:" | awk '{print $2}')
SHA256_RELEASE=$(keytool -list -v -keystore "$KEYSTORE_FILE" -storepass "$KEYSTORE_PASSWORD" -alias "$KEY_ALIAS" 2>/dev/null | grep "SHA256:" | awk '{print $2}')

echo "🔐 SHA1 (Release):"
echo "   $SHA1_RELEASE"
echo ""
echo "🔐 SHA256 (Release):"
echo "   $SHA256_RELEASE"
echo ""

# Debug keystore
echo "=========================================="
echo "📊 Empreintes du Debug Keystore"
echo "=========================================="
echo ""

DEBUG_KEYSTORE="$HOME/.android/debug.keystore"
if [ -f "$DEBUG_KEYSTORE" ]; then
    SHA1_DEBUG=$(keytool -list -v -keystore "$DEBUG_KEYSTORE" -storepass android -alias androiddebugkey 2>/dev/null | grep "SHA1:" | awk '{print $2}')
    SHA256_DEBUG=$(keytool -list -v -keystore "$DEBUG_KEYSTORE" -storepass android -alias androiddebugkey 2>/dev/null | grep "SHA256:" | awk '{print $2}')
    
    echo "🔐 SHA1 (Debug):"
    echo "   $SHA1_DEBUG"
    echo ""
    echo "🔐 SHA256 (Debug):"
    echo "   $SHA256_DEBUG"
    echo ""
else
    echo "⚠️  Debug keystore non trouvé."
    echo ""
    echo "Générez-le avec:"
    echo "   keytool -genkey -v \\"
    echo "     -keystore $DEBUG_KEYSTORE \\"
    echo "     -alias androiddebugkey \\"
    echo "     -keyalg RSA -keysize 2048 \\"
    echo "     -validity 10000 \\"
    echo "     -storepass android"
    echo ""
    echo "Puis affichez les empreintes:"
    echo "   keytool -list -v -keystore $DEBUG_KEYSTORE -storepass android"
    echo ""
fi

echo "=========================================="
echo "✅ Configuration terminée !"
echo "=========================================="
echo ""
echo "📋 Résumé des empreintes:"
echo "----------------------------------------"
echo "App ID:              $APP_ID"
echo "Keystore (Release):  $KEYSTORE_FILE"
echo "Alias:               $KEY_ALIAS"
echo "Password:            $KEYSTORE_PASSWORD"
echo ""
echo "SHA1 (Release):   $SHA1_RELEASE"
echo "SHA256 (Release): $SHA256_RELEASE"
if [ -f "$DEBUG_KEYSTORE" ]; then
    echo ""
    echo "SHA1 (Debug):     $SHA1_DEBUG"
    echo "SHA256 (Debug):   $SHA256_DEBUG"
fi
echo ""
echo "🔑 Pour Firebase/Supabase, copiez le SHA1 (Release) ci-dessus."
echo ""
echo "📋 Pour Google Play App Signing:"
echo "   Importez $KEYSTORE_FILE dans la console Google Play."
echo ""
