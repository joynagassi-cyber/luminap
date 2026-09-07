/**
 * Générateur de keystore et empreintes pour Lumina Android
 * Package: com.lumina.mfejc
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const APP_ID = 'com.lumina.mfejc';
const KEY_ALIAS = 'lumina-release';
const KEYSTORE_PASSWORD = 'lumina1234';
const DURATION_DAYS = 10000;
const KEYSTORE_FILE = 'android/app/release.keystore';

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

  const sha1Formatted = sha1.match(/.{2}/g).join(':');
  const sha256Formatted = sha256.match(/.{2}/g).join(':');

  // Save files
  const dir = path.dirname(KEYSTORE_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync('release-cert.pem', certPem);
  fs.writeFileSync('release-key.pem', keyPem);

  const p12 = crypto.createPrivateKey({ key: keyPem, format: 'pem' });
  const p12Buffer = p12.export({
    type: 'pkcs12',
    format: 'der',
    cipher: 'aes-256-cbc',
    passphrase: KEYSTORE_PASSWORD,
  });
  fs.writeFileSync(KEYSTORE_FILE, p12Buffer);

  console.log('==========================================');
  console.log('✅ KEYSTORE GÉNÉRÉ AVEC SUCCÈS');
  console.log('==========================================');
  console.log('');
  console.log('📊 RELEASE KEYSTORE');
  console.log('----------------------------------------');
  console.log('Fichier:     ' + KEYSTORE_FILE);
  console.log('Alias:       ' + KEY_ALIAS);
  console.log('Password:    ' + KEYSTORE_PASSWORD);
  console.log('');
  console.log('SHA1 (Release):   ' + sha1Formatted);
  console.log('SHA256 (Release): ' + sha256Formatted);
  console.log('');
  console.log('📊 DEBUG KEYSTORE');
  console.log('----------------------------------------');
  console.log('Fichier:  ~/.android/debug.keystore');
  console.log('Password: android');
  console.log('');
  console.log('Pour afficher le SHA1 debug:');
  console.log('  keytool -list -v -keystore ~/.android/debug.keystore -storepass android');
  console.log('');
  console.log('==========================================');
  console.log('📋 RÉSUMÉ POUR FIREBASE / GOOGLE PLAY');
  console.log('==========================================');
  console.log('');
  console.log('App ID:              ' + APP_ID);
  console.log('SHA1 (Release):      ' + sha1Formatted);
  console.log('SHA256 (Release):    ' + sha256Formatted);
  console.log('');
  console.log('🔑 Copiez le SHA1 dans Firebase Console');

} catch (error) {
  console.error('❌ Erreur: ' + error.message);
  process.exit(1);
}
