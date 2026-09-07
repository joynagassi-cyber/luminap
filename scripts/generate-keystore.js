/**
 * Générateur de keystore pour Lumina Android
 * Package: com.lumina.mfejc
 * 
 * Usage: node scripts/generate-keystore.js
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const APP_ID = 'com.lumina.mfejc';
const KEY_ALIAS = 'lumina-release';
const KEYSTORE_PASSWORD = 'lumina1234';
const KEY_PASSWORD = 'lumina1234';
const DURATION_DAYS = 10000;
const KEYSTORE_FILE = 'android/app/release.keystore';

console.log('==========================================');
console.log('Génération du keystore pour ' + APP_ID);
console.log('==========================================');
console.log('');

try {
  // Generate RSA key pair
  const privateKey = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });

  // Generate self-signed certificate
  const now = new Date();
  const notBefore = now;
  const notAfter = new Date(now.getTime() + DURATION_DAYS * 24 * 60 * 60 * 1000);

  const certSubject = '/C=BF/ST=Kadiogo/L=Ouagadougou/O=Église MFE-JC Centrale/OU=Ministère/CN=Lumina MFE-JC';

  const certificate = crypto.createCertificate({
    subject: certSubject,
    issuer: certSubject,
    dates: {
      notBefore: notBefore,
      notAfter: notAfter,
    },
    key: privateKey,
    selfSigned: true,
  });

  const certPem = certificate.certificate;
  const keyPem = certificate.privkey;

  // Calculate SHA1 and SHA256 fingerprints
  const sha1 = crypto.createHash('sha1').update(certPem).digest('hex').toUpperCase();
  const sha256 = crypto.createHash('sha256').update(certPem).digest('hex').toUpperCase();

  // Format with colons
  const sha1Formatted = sha1.match(/.{2}/g).join(':');
  const sha256Formatted = sha256.match(/.{2}/g).join(':');

  // Save files
  const dir = path.dirname(KEYSTORE_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Save PEM files
  fs.writeFileSync('release-cert.pem', certPem);
  fs.writeFileSync('release-key.pem', keyPem);

  // Save PKCS12 keystore
  const p12 = crypto.createPrivateKey({ key: keyPem, format: 'pem' });
  const p12Buffer = p12.export({
    type: 'pkcs12',
    format: 'der',
    cipher: 'aes-256-cbc',
    passphrase: KEYSTORE_PASSWORD,
  });
  fs.writeFileSync(KEYSTORE_FILE, p12Buffer);

  console.log('✅ Keystore généré avec succès: ' + KEYSTORE_FILE);
  console.log('   (Format PKCS12 - peut être converti en JKS avec keytool)');
  console.log('');

  console.log('==========================================');
  console.log('📊 Empreintes du certificat (RELEASE)');
  console.log('==========================================');
  console.log('');
  console.log('🔐 SHA1 (Release):');
  console.log('   ' + sha1Formatted);
  console.log('');
  console.log('🔐 SHA256 (Release):');
  console.log('   ' + sha256Formatted);
  console.log('');

  console.log('==========================================');
  console.log('📊 Debug Keystore');
  console.log('==========================================');
  console.log('');
  console.log('ℹ️  Le debug keystore est généré automatiquement par Android Studio');
  console.log('   lors de la compilation en mode debug.');
  console.log('');
  console.log('🔐 SHA1 (Debug):');
  console.log('   Fichier: ~/.android/debug.keystore');
  console.log('   Mot de passe: android');
  console.log('   Alias: androiddebugkey');
  console.log('');
  console.log('   Pour obtenir le SHA1 debug, exécutez:');
  console.log('   keytool -list -v -keystore ~/.android/debug.keystore -storepass android');
  console.log('');

  console.log('==========================================');
  console.log('✅ Configuration terminée !');
  console.log('==========================================');
  console.log('');
  console.log('📋 Résumé des empreintes:');
  console.log('----------------------------------------');
  console.log('App ID:              ' + APP_ID);
  console.log('Keystore (Release):  ' + KEYSTORE_FILE);
  console.log('Alias:               ' + KEY_ALIAS);
  console.log('Password:            ' + KEYSTORE_PASSWORD);
  console.log('');
  console.log('SHA1 (Release):   ' + sha1Formatted);
  console.log('SHA256 (Release): ' + sha256Formatted);
  console.log('');
  console.log('🔑 Pour Firebase/Supabase, copiez le SHA1 ci-dessus.');
  console.log('');
  console.log('📋 Pour convertir en JKS (format natif Android):');
  console.log('   keytool -importkeystore -srckeystore ' + KEYSTORE_FILE);
  console.log('           -srcstoretype PKCS12');
  console.log('           -destkeystore ' + KEYSTORE_FILE);
  console.log('           -deststoretype JKS');
  console.log('');

} catch (error) {
  console.error('❌ Erreur: ' + error.message);
  console.error('');
  console.error('Assurez-vous que Node.js est installé (v18+ recommandé).');
  console.error('Essayez: node --version');
  process.exit(1);
}
