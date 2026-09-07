# 📱 LUMINA ANDROID - KEYSTORE CONFIGURÉ

## Package
**`com.lumina.mfejc`**

---

## ✅ Configuration mise à jour

| Fichier | Modification |
|---------|-------------|
| `capacitor.config.ts` | `appId: 'com.lumina.mfejc'` |
| `android/app/build.gradle` | `namespace "com.lumina.mfejc"` + `applicationId "com.lumina.mfejc"` |
| `android/app/src/main/AndroidManifest.xml` | `android:name="com.lumina.mfejc.MainActivity"` |
| `android/app/src/main/java/com/lumina/mfejc/MainActivity.java` | Nouveau package |

---

## 🚀 Générer le keystore + empreintes

### Option 1: Bash (recommandé)
```bash
bash scripts/GetFingerprints.sh
```

### Option 2: Node.js
```bash
node scripts/GetFingerprints.js
```

### Option 3: Python
```bash
pip install cryptography
python3 scripts/GetFingerprints.py
```

---

## 📋 Résultat attendu

```
╔════════════════════════════════════════════════════════════════════╗
║                    KEYSTORE LUMINA - CONFIGURÉ                     ║
╚════════════════════════════════════════════════════════════════════╝

  📦 Package      : com.lumina.mfejc
  📁 Keystore     : android/app/release.keystore
  🔑 Alias        : lumina-release
  🔐 Password     : lumina1234

  ─────────────────────────────────────────────────────────────────
  🔐 SHA1 (Release)   : XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX
  🔐 SHA256 (Release) : XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX
  ─────────────────────────────────────────────────────────────────
  🐛 SHA1 (Debug)   : ~/.android/debug.keystore (android)
  🐛 SHA256 (Debug) : Voir debug keystore
  ─────────────────────────────────────────────────────────────────

  🔑 Copiez le SHA1 (Release) dans Firebase Console
  📋 Fichier sauvegardé: android/app/release.keystore
```

---

## 🔑 Pour Firebase / Supabase

1. Allez sur [Firebase Console](https://console.firebase.google.com/)
2. **Paramètres du projet** → **Votre application**
3. **Ajouter un fichier SHA-1**
4. Copiez le **SHA1 (Release)** généré

---

## 📋 Pour Google Play App Signing

1. Importez `android/app/release.keystore` dans la console Google Play
2. Google Play gardera votre clé en sécurité
3. Utilisez le SHA1 fourni par Google Play pour Firebase

---

## ⚠️ Prérequis

```bash
# Vérifier Java
keytool -version

# Installer si nécessaire
# macOS: brew install openjdk
# Ubuntu: sudo apt install openjdk-17-jdk
```

---

## 📁 Fichiers créés

| Fichier | Description |
|---------|-------------|
| `scripts/GetFingerprints.sh` | Script bash (recommandé) |
| `scripts/GetFingerprints.js` | Script Node.js |
| `scripts/GetFingerprints.py` | Script Python |
| `scripts/generate-keystore.sh` | Script bash alternatif |
| `scripts/generate-keystore.py` | Script Python alternatif |
| `README-KEYSTORE.md` | Ce fichier |
| `docs/KEYSTORE_SETUP.md` | Documentation complète |
