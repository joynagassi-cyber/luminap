# Génération du Keystore Lumina Android

> ⚠️ **2026-10-18 (audit release)** : les mots de passe / alias ci-dessous ne
> sont plus valables en l'état — le namespace de secrets officiel est désormais
> `ANDROID_KEYSTORE_*` (pas `LUMINA_*` ni `KEYSTORE_*` nus, dont `KEY_PASSWORD`
> est absent/incomplet et ne doit plus être utilisé). Voir
> `MEMORY.md → Secrets keystore : namespace ANDROID_KEYSTORE_*`. Ce fichier
> décrit l'historique de génération initiale (2026-09-07) et la procédure de
> re-génération locale, **pas** la source de vérité des secrets CI.

## Package
`com.lumina.mfejc`

## Configuration (historique, 2026-09-07)
| Paramètre | Valeur |
|-----------|--------|
| Keystore | `android/app/release.keystore` |
| Alias | `lumina-release` |
| Password | *** (remplacé par le secret `ANDROID_KEYSTORE_PASSWORD`) |
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
# Générer le keystore (LOCALEMENT — le résultat N'EST JAMAIS commité,
# cf. .gitignore : *.keystore, *.jks, keystore.b64*, lumina-keystore-vault.zip)
bash scripts/generate-keystore-complete.sh

# Afficher les empreintes (en local, sur le support chiffré du keystore)
bash scripts/show-fingerprints.sh
```

## Utilisation

### Firebase
Copiez le **SHA1 (Release)** dans Firebase Console → Project Settings → Your apps → Add fingerprint.

### Google Play App Signing
Importez le keystore (jamais commité) dans la console Google Play — stockez
les mots de passe réels uniquement dans les secrets GitHub
`ANDROID_KEYSTORE_PASSWORD` / `ANDROID_KEYSTORE_KEY_PASSWORD`.
