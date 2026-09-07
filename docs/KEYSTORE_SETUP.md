# Génération du Keystore Lumina Android

Ce document explique comment générer le keystore pour l'application Lumina avec le package `com.lumina.mfejc`.

## Prérequis

- **Java JDK 8+** avec `keytool` installé
- **Python 3.8+** avec le module `cryptography` (optionnel)

### Installation de Java

```bash
# macOS
brew install openjdk

# Ubuntu/Debian
sudo apt install openjdk-17-jdk

# Windows
# Téléchargez JDK depuis oracle.com
```

## Méthode 1: Script Bash (recommandé)

```bash
chmod +x scripts/generate-keystore.sh
bash scripts/generate-keystore.sh
```

Ce script:
1. Génère un keystore JKS de release
2. Affiche les empreintes SHA1 et SHA256
3. Affiche également les empreintes du debug keystore

## Méthode 2: Script Python

```bash
pip install cryptography
python3 scripts/generate-keystore.py
```

## Empreintes générées

### Release (production)
- **SHA1**: sera généré lors de l'exécution du script
- **SHA256**: sera généré lors de l'exécution du script
- **Keystore**: `android/app/release.keystore`
- **Password**: `lumina1234`
- **Alias**: `lumina-release`

### Debug (développement)
Le debug keystore est généré automatiquement par Android Studio.

Pour l'afficher:
```bash
keytool -list -v -keystore ~/.android/debug.keystore -storepass android
```

## Configuration mise à jour

Les fichiers suivants ont été modifiés pour utiliser le nouveau package `com.lumina.mfejc`:

| Fichier | Changement |
|---------|-----------|
| `capacitor.config.ts` | `appId: 'com.lumina.mfejc'` |
| `android/app/build.gradle` | `namespace "com.lumina.mfejc"` + `applicationId "com.lumina.mfejc"` |
| `android/app/src/main/AndroidManifest.xml` | `android:name="com.lumina.mfejc.MainActivity"` |
| `android/app/src/main/java/com/lumina/mfejc/MainActivity.java` | Nouveau package |

## Utilisation des empreintes

### Pour Firebase
1. Allez sur [Firebase Console](https://console.firebase.google.com/)
2. Sélectionnez votre projet
3. Allez dans **Paramètres du projet** → **Votre application**
4. Cliquez sur **Ajouter un fichier SHA-1**
5. Copiez le SHA1 de release généré

### Pour Supabase/Edge Functions
- Même procédure: ajoutez le SHA1 dans les paramètres de l'application

### Pour Google Play App Signing
1. Importez `android/app/release.keystore` dans la console Google Play
2. Google Play gardera votre clé de signature en sécurité
3. Utilisez le SHA1 fourni par Google Play pour Firebase

## Scripts disponibles

| Script | Description |
|--------|-------------|
| `scripts/generate-keystore.sh` | Script bash (recommandé) |
| `scripts/generate-keystore.py` | Script Python (avec cryptography) |
| `scripts/show-fingerprints.sh` | Affiche les empreintes d'un keystore existant |

## Vérification rapide

```bash
# Vérifier que keytool est disponible
keytool -version

# Générer le keystore
bash scripts/generate-keystore.sh

# Afficher les empreintes d'un keystore existant
bash scripts/show-fingerprints.sh android/app/release.keystore lumina-release lumina1234
```
