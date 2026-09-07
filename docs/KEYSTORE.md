# 🔐 Keystore Lumina - Données de Sécurité

## 📱 Application
- **Package Name**: `com.lumina.mfejc`
- **Alias**: `lumina`
- **Fichier**: `android/app/lumina-keystore.jks`
- **Créé le**: 2026-09-07
- **Valide jusqu'au**: 2054-01-23 (28 ans)

## 🔑 Mot de passe
- **Store Password**: `lumina2024`
- **Key Password**: `lumina2024`

## 👤 Informations du certificat
- **CN** (Common Name): Lumina
- **OU** (Organizational Unit): MFE-JC
- **O** (Organization): Église MFE-JC Centrale
- **L** (Locality): Douala
- **ST** (State): Cameroon
- **C** (Country): CM

## 🔐 Empreintes du certificat (Release)

### SHA-1 (utilisé pour Google Maps, Firebase, OAuth)
```
25:86:58:5F:1A:CC:B7:A3:06:69:39:A7:07:20:99:F8:EF:D0:4A:30
```

### SHA-256 (utilisé pour la signature du package)
```
19:59:84:53:93:EC:08:D2:EB:C6:D8:9E:3B:31:B5:E4:29:DE:2B:0C:B4:D3:0C:90:67:FB:88:C5:A7:C6:21:5D
```

## 🔓 Empreintes du certificat (Debug - Android par défaut)

### SHA-1 (Debug)
```
08:82:10:E3:C3:D2:CD:E5:C6:46:76:FC:07:79:BC:D4:FF:D7:F8:B4
```

### SHA-256 (Debug)
```
6E:90:35:B1:2C:0F:7E:61:BE:89:6D:E4:D2:C8:F2:7A:8D:09:07:73:60:A9:D6:F2:6C:4E:D2:B3:1C:21:81:2C
```

## ⚠️ IMPORTANT - Sécurité

### 🔒 CONSERVEZ CE FICHIER EN SÉCURITÉ
- **NE JAMAIS** committer le keystore dans Git
- Le fichier `.gitignore` a été mis à jour
- Sauvegardez le keystore sur un support sécurisé (clé USB, cloud chiffré)
- Si vous perdez ce keystore, vous ne pourrez PLUS jamais mettre à jour votre app sur le Play Store

### 📝 À faire immédiatement
1. **Copier le keystore** sur un support externe
2. **Noter les empreintes** dans vos comptes développeur:
   - Google Play Console
   - Firebase Console
   - Google Cloud Console (pour Maps, OAuth)
   - Supabase (si utilisation de OAuth)
3. **Configurer les OAuth redirect URIs** avec les empreintes SHA-1

## 📱 Configuration des services

### Google Maps
```
SHA-1 (Debug): 08:82:10:E3:C3:D2:CD:E5:C6:46:76:FC:07:79:BC:D4:FF:D7:F8:B4
SHA-1 (Release): 25:86:58:5F:1A:CC:B7:A3:06:69:39:A7:07:20:99:F8:EF:D0:4A:30
```

### Firebase
```
SHA-1 (Debug): 08:82:10:E3:C3:D2:CD:E5:C6:46:76:FC:07:79:BC:D4:FF:D7:F8:B4
SHA-1 (Release): 25:86:58:5F:1A:CC:B7:A3:06:69:39:A7:07:20:99:F8:EF:D0:4A:30
```

### OAuth (Google, Facebook, etc.)
```
SHA-1 (Release): 25:86:58:5F:1A:CC:B7:A3:06:69:39:A7:07:20:99:F8:EF:D0:4A:30
```

## 📂 Fichiers générés
- `android/app/lumina-keystore.jks` - Keystore principal
- `android/app/build.gradle` - Configuration mise à jour

## 🔧 Commandes utiles

### Voir le keystore
```bash
keytool -list -v -keystore android/app/lumina-keystore.jks -alias lumina
```

### Générer un nouvel APK signé
```bash
cd android
./gradlew assembleRelease
```

### L'APK signé sera dans:
```
android/app/build/outputs/apk/release/app-release.apk
```

## 📋 Checklist après génération du keystore

- [ ] Sauvegarder le keystore sur support externe
- [ ] Ajouter les empreintes SHA-1 dans Firebase Console
- [ ] Ajouter les empreintes SHA-1 dans Google Cloud Console
- [ ] Configurer OAuth si nécessaire
- [ ] Générer le premier APK de release
- [ ] Tester l'APK avant upload sur Play Store

---
*Généré le 2026-09-07*
*Application: com.lumina.mfejc*
