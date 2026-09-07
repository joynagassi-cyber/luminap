# Génération du Keystore Lumina Android

## Package
`com.lumina.mfejc`

## Configuration
| Paramètre | Valeur |
|-----------|--------|
| Keystore | `android/app/release.keystore` |
| Alias | `lumina-release` |
| Password | `lumina1234` |
| Validité | 10000 jours |

## Empreintes

### Release (Production)
- **SHA1**: Généré par le script
- **SHA256**: Généré par le script

### Debug (Développement)
- **Fichier**: `~/.android/debug.keystore`
- **Password**: `android`
- **Alias**: `androiddebugkey`

## Commandes rapides

```bash
# Générer le keystore
bash scripts/generate-keystore-complete.sh

# Afficher les empreintes
bash scripts/show-fingerprints.sh
```

## Utilisation

### Firebase
Copiez le **SHA1 (Release)** dans Firebase Console → Project Settings → Your apps → Add fingerprint.

### Google Play App Signing
Importez `android/app/release.keystore` dans la console Google Play.
