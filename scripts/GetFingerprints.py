#!/usr/bin/env python3
"""
KEYSTORE LUMINA - COM.LUMINA.MFEJC
Générateur de keystore et empreintes SHA1/SHA256
Usage: python3 scripts/GetFingerprints.py
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
DURATION_DAYS = 10000
KEYSTORE_FILE = "android/app/release.keystore"

print("╔════════════════════════════════════════════════════════════════════╗")
print("║                    KEYSTORE LUMINA - GENERATION                    ║")
print("╚════════════════════════════════════════════════════════════════════╝")
print()

# Check for cryptography module
has_crypto = False
try:
    import importlib.util
    spec = importlib.util.find_spec("cryptography")
    has_crypto = spec is not None
except:
    pass

if has_crypto:
    from cryptography import x509
    from cryptography.x509.oid import NameOID
    from cryptography.hazmat.primitives import hashes, serialization
    from cryptography.hazmat.primitives.asymmetric import rsa
    from cryptography.hazmat.backends import default_backend
    
    # Generate RSA key
    private_key = rsa.generate_private_key(
        public_exponent=65537,
        key_size=2048,
        backend=default_backend()
    )
    
    # Create self-signed certificate
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
    
    # Calculate fingerprints
    sha1 = hashlib.sha1(cert_der).hexdigest().upper()
    sha256 = hashlib.sha256(cert_der).hexdigest().upper()
    
    sha1_fmt = ":".join(sha1[i:i+2] for i in range(0, len(sha1), 2))
    sha256_fmt = ":".join(sha256[i:i+2] for i in range(0, len(sha256), 2))
    
    # Create JKS keystore
    jks_data = bytearray()
    jks_data += struct.pack('>I', 0x3e14170b)  # Magic
    jks_data += struct.pack('>I', 50)  # Version
    jks_data += struct.pack('>I', 1)  # Entry count
    
    # KeyEntry
    jks_data += struct.pack('>I', 2)
    alias_bytes = KEY_ALIAS.encode('utf-8')
    jks_data += struct.pack('>H', len(alias_bytes))
    jks_data += alias_bytes
    jks_data += struct.pack('>I', int(now.timestamp() * 1000))
    jks_data += struct.pack('>I', 1)
    
    cert_type = b"X.509"
    jks_data += struct.pack('>H', len(cert_type))
    jks_data += cert_type
    jks_data += struct.pack('>I', len(cert_der))
    jks_data += cert_der
    
    private_key_pem = private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    )
    jks_data += struct.pack('>I', len(private_key_pem))
    jks_data += private_key_pem
    jks_data += struct.pack('>I', 0)  # No protection
    
    # Save
    Path(KEYSTORE_FILE).parent.mkdir(parents=True, exist_ok=True)
    with open(KEYSTORE_FILE, 'wb') as f:
        f.write(jks_data)
    
    print("  📦 Package      : " + APP_ID)
    print("  📁 Keystore     : " + KEYSTORE_FILE)
    print("  🔑 Alias        : " + KEY_ALIAS)
    print("  🔐 Password     : " + KEYSTORE_PASSWORD)
    print()
    print("  ─────────────────────────────────────────────────────────────────")
    print("  🔐 SHA1 (Release)   : " + sha1_fmt)
    print("  🔐 SHA256 (Release) : " + sha256_fmt)
    print("  ─────────────────────────────────────────────────────────────────")
    print("  🐛 SHA1 (Debug)   : ~/.android/debug.keystore (android)")
    print("  🐛 SHA256 (Debug) : Voir debug keystore")
    print("  ─────────────────────────────────────────────────────────────────")
    print()
    print("  🔑 Copiez le SHA1 (Release) dans Firebase Console")
    print("  📋 Fichier sauvegardé: " + KEYSTORE_FILE)
    print()
else:
    print("❌ Module 'cryptography' non disponible")
    print("Installez-le: pip install cryptography")
    print()
    print("Ou utilisez le script bash:")
    print("  bash scripts/GetFingerprints.sh")
