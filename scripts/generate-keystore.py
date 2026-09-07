#!/usr/bin/env python3
"""
Générateur de keystore pour Lumina Android
Package: com.lumina.mfejc
"""

import hashlib
import struct
import base64
from datetime import datetime, timedelta
from pathlib import Path

# Configuration
APP_ID = "com.lumina.mfejc"
KEY_ALIAS = "lumina-release"
KEYSTORE_PASSWORD = "lumina1234"
KEY_PASSWORD = "lumina1234"
DURATION_DAYS = 10000
KEYSTORE_FILE = "android/app/release.keystore"

print("=" * 42)
print(f"Génération du keystore pour {APP_ID}")
print("=" * 42)
print()

# Vérifier si cryptography est disponible
try:
    from cryptography import x509
    from cryptography.x509.oid import NameOID
    from cryptography.hazmat.primitives import hashes, serialization
    from cryptography.hazmat.primitives.asymmetric import rsa
    from cryptography.hazmat.backends import default_backend
    HAS_CRYPTOGRAPHY = True
except ImportError:
    HAS_CRYPTOGRAPHY = False
    print("⚠️  Module 'cryptography' non trouvé.")
    print("   Installez-le: pip install cryptography")
    print()

if HAS_CRYPTOGRAPHY:
    # Générer une clé RSA
    private_key = rsa.generate_private_key(
        public_exponent=65537,
        key_size=2048,
        backend=default_backend()
    )

    # Créer le certificat auto-signé
    subject = issuer = x509.Name([
        x509.NameAttribute(NameOID.COUNTRY_NAME, "BF"),
        x509.NameAttribute(NameOID.STATE_OR_PROVINCE_NAME, "Kadiogo"),
        x509.NameAttribute(NameOID.LOCALITY_NAME, "Ouagadougou"),
        x509.NameAttribute(NameOID.ORGANIZATION_NAME, "Église MFE-JC Centrale"),
        x509.NameAttribute(NameOID.ORGANIZATIONAL_UNIT_NAME, "Ministère"),
        x509.NameAttribute(NameOID.COMMON_NAME, "Lumina MFE-JC"),
    ])

    now = datetime.utcnow()
    cert = (
        x509.CertificateBuilder()
        .subject_name(subject)
        .issuer_name(issuer)
        .public_key(private_key.public_key())
        .serial_number(x509.random_serial_number())
        .not_valid_before(now)
        .not_valid_after(now + timedelta(days=DURATION_DAYS))
        .sign(private_key, hashes.SHA256(), default_backend())
    )

    cert_der = cert.public_bytes(serialization.Encoding.DER)

    # Calculer les empreintes SHA
    sha1 = hashlib.sha1(cert_der).hexdigest().upper()
    sha256 = hashlib.sha256(cert_der).hexdigest().upper()

    # Formater avec des deux-points
    sha1_formatted = ":".join(sha1[i:i+2] for i in range(0, len(sha1), 2))
    sha256_formatted = ":".join(sha256[i:i+2] for i in range(0, len(sha256), 2))

    # Créer le keystore JKS
    jks_data = bytearray()
    jks_data += struct.pack('>I', 0x3e14170b)  # Magic number
    jks_data += struct.pack('>I', 50)  # Version
    jks_data += struct.pack('>I', 1)  # Entry count

    # Entry 1: KeyEntry
    jks_data += struct.pack('>I', 2)  # Entry type: KeyEntry
    alias_bytes = KEY_ALIAS.encode('utf-8')
    jks_data += struct.pack('>H', len(alias_bytes))
    jks_data += alias_bytes
    jks_data += struct.pack('>I', int(now.timestamp() * 1000))  # Creation date
    jks_data += struct.pack('>I', 1)  # Certificate chain length

    # Certificate type
    cert_type = b"X.509"
    jks_data += struct.pack('>H', len(cert_type))
    jks_data += cert_type

    # Certificate data
    jks_data += struct.pack('>I', len(cert_der))
    jks_data += cert_der

    # Private key (PKCS8)
    private_key_pem = private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    )
    jks_data += struct.pack('>I', len(private_key_pem))
    jks_data += private_key_pem

    # Password protection (0 = no protection)
    jks_data += struct.pack('>I', 0)

    # Write keystore
    Path(KEYSTORE_FILE).parent.mkdir(parents=True, exist_ok=True)
    with open(KEYSTORE_FILE, 'wb') as f:
        f.write(jks_data)

    print(f"✅ Keystore créé: {KEYSTORE_FILE}")
    print()

    print("=" * 42)
    print("📊 Empreintes du certificat (RELEASE)")
    print("=" * 42)
    print()
    print("🔐 SHA1 (Release):")
    print(f"   {sha1_formatted}")
    print()
    print("🔐 SHA256 (Release):")
    print(f"   {sha256_formatted}")
    print()

    print("=" * 42)
    print("📊 Debug Keystore")
    print("=" * 42)
    print()
    print("ℹ️  Le debug keystore est généré automatiquement par Android Studio.")
    print()
    print("🔐 SHA1 (Debug):")
    print("   Fichier: ~/.android/debug.keystore")
    print("   Mot de passe: android")
    print("   Alias: androiddebugkey")
    print()
    print("   Pour obtenir le SHA1 debug, exécutez:")
    print("   keytool -list -v -keystore ~/.android/debug.keystore -storepass android")
    print()

    print("=" * 42)
    print("✅ Configuration terminée !")
    print("=" * 42)
    print()
    print("📋 Résumé des empreintes:")
    print("-" * 40)
    print(f"App ID:              {APP_ID}")
    print(f"Keystore (Release):  {KEYSTORE_FILE}")
    print(f"Alias:               {KEY_ALIAS}")
    print(f"Password:            {KEYSTORE_PASSWORD}")
    print()
    print(f"SHA1 (Release):   {sha1_formatted}")
    print(f"SHA256 (Release): {sha256_formatted}")
    print()
    print("🔑 Pour Firebase/Supabase, copiez le SHA1 ci-dessus.")
    print()
    print("📋 Pour Google Play App Signing:")
    print(f"   Importez {KEYSTORE_FILE} dans la console Google Play.")
    print()

else:
    print("❌ Impossible de générer le keystore.")
    print("   Installez le module cryptography:")
    print("   pip install cryptography")
    print()
    print("Ou utilisez le script bash:")
    print("   bash scripts/generate-keystore.sh")
