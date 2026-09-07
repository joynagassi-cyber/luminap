/**
 * KEYSTORE LUMINA - COM.LUMINA.MFEJC
 * Génère le keystore et affiche les empreintes
 * Usage: node scripts/GetFingerprints.js
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
  // Générer la clé RSA
  const privateKey = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });

  // Générer le certificat auto-signé
  const now = new Date();
  const certSubject = '/C=BF/ST=Kadiogo/L=Ouagadougou/O=Église MFE-JC Centrale/OU=Ministère/CN=Lumina MFE-JC';

  const certificate = crypto.createCertificate({
    subject: certSubject,
    issuer: certSubject,
    dates: {
      notBefore: now,
      notAfter: new Date(now.getTime() + DURATION_DAYS * 86400000),
    },
    key: privateKey,
    selfSigned: true,
  });

  const certPem = certificate.certificate;
  const keyPem = certificate.privkey;

  // Calculer les empreintes
  const sha1 = crypto.createHash('sha1').update(certPem).digest('hex').toUpperCase();
  const sha256 = crypto.createHash('sha256').update(certPem).digest('hex').toUpperCase();
  const sha1Fmt = sha1.match(/.{2}/g).join(':');
  const sha256Fmt = sha256.match(/.{2}/g).join(':');

  // Sauvegarder les fichiers
  fs.mkdirSync(path.dirname(KEYSTORE_FILE), { recursive: true });
  fs.writeFileSync('release-cert.pem', certPem);
  fs.writeFileSync('release-key.pem', keyPem);

  // Sauvegarder le keystore PKCS12
  const p12 = crypto.createPrivateKey({ key: keyPem, format: 'pem' });
  fs.writeFileSync(KEYSTORE_FILE, p12.export({
    type: 'pkcs12',
    format: 'der',
    cipher: 'aes-256-cbc',
    passphrase: KEYSTORE_PASSWORD,
  }));

  // Debug fingerprints
  const debugKeystore = path.join(require('os').homedir(), '.android', 'debug.keystore');
  let sha1Debug = 'N/A';
  let sha256Debug = 'N/A';
  try {
    const debugCert = require('child_process').execSync(
      `keytool -list -v -keystore "${debugKeystore}" -storepass android -alias androiddebugkey 2>/dev/null | grep SHA1:`,
      { encoding: 'utf8' }
    ).trim();
    if (debugCert) sha1Debug = debugCert.replace('SHA1:', '').trim();
  } catch (e) {}

  // Affichage
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════════════╗');
  console.log('║                    KEYSTORE LUMINA - CONFIGURÉ                     ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝');
  console.log('');
  console.log('  📦 Package      : ' + APP_ID);
  console.log('  📁 Keystore     : ' + KEYSTORE_FILE);
  console.log('  🔑 Alias        : ' + KEY_ALIAS);
  console.log('  🔐 Password     : ' + KEYSTORE_PASSWORD);
  console.log('');
  console.log('  ─────────────────────────────────────────────────────────────────');
  console.log('  🔐 SHA1 (Release)   : ' + sha1Fmt);
  console.log('  🔐 SHA256 (Release) : ' + sha256Fmt);
  console.log('  ─────────────────────────────────────────────────────────────────');
  console.log('  🐛 SHA1 (Debug)   : ' + sha1Debug);
  console.log('  🐛 SHA256 (Debug) : ' + sha256Debug);
  console.log('  ─────────────────────────────────────────────────────────────────');
  console.log('');
  console.log('  🔑 Copiez le SHA1 (Release) dans Firebase Console');
  console.log('  📋 Fichier sauvegardé: ' + KEYSTORE_FILE);
  console.log('');

} catch (error) {
  console.error('❌ Erreur: ' + error.message);
  console.error('');
  console.error('Assurez-vous que Node.js est installé (v18+ recommandé).');
  console.error('Essayez: node --version');
  process.exit(1);
}
