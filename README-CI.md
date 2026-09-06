# Lumina CI/CD Pipeline

## Workflow Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        PULL REQUEST                              │
├─────────────────────────────────────────────────────────────────┤
│  1. Lint Check      →  ESLint                                  │
│  2. Type Check      →  TypeScript                              │
│  3. Run Tests       →  Playwright E2E                          │
│  4. Build           →  Vite + Capacitor sync                   │
│  5. Security Audit  →  npm audit                              │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                         MAIN BRANCH                              │
├─────────────────────────────────────────────────────────────────┤
│  1. Full Quality Checks                                       │
│  2. Build Debug APK                                           │
│  3. Build Release APK (unsigned)                               │
│  4. Sign APK (if secrets configured)                           │
│  5. Create GitHub Release                                     │
│  6. Download for testing                                      │
└─────────────────────────────────────────────────────────────────┘
```

## Workflows

| Workflow | File | Description |
|----------|------|-------------|
| **CI** | `.github/workflows/ci.yml` | Lint, typecheck, test, build, security |
| **Android Build** | `.github/workflows/android-build.yml` | Full APK build + signing + release |
| **Debug Build** | `.github/workflows/android-debug.yml` | Debug APK for PRs |

## GitHub Secrets Required

Add these secrets to your repository:

| Secret | Required | Description |
|--------|----------|-------------|
| `ANDROID_KEYSTORE_BASE64` | Yes (for release) | Base64 encoded keystore file |
| `ANDROID_KEYSTORE_PASSWORD` | Yes (for release) | Keystore password |
| `ANDROID_KEYSTORE_KEY_PASSWORD` | Yes (for release) | Key password |
| `ANDROID_KEYSTORE_ALIAS` | Yes (for release) | Key alias (default: lumina) |

### Generate Keystore

```bash
# Generate a new keystore
keytool -genkeypair -v \
  -keystore release.keystore \
  -alias lumina \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -storepass YOUR_PASSWORD \
  -keypass YOUR_KEY_PASSWORD

# Convert to base64 for GitHub secrets
base64 release.keystore
```

### Add Secrets via CLI

```bash
# Using GitHub CLI
gh secret set ANDROID_KEYSTORE_BASE64 -b "<base64-content>"
gh secret set ANDROID_KEYSTORE_PASSWORD -b "your-password"
gh secret set ANDROID_KEYSTORE_KEY_PASSWORD -b "your-key-password"
gh secret set ANDROID_KEYSTORE_ALIAS -b "lumina"
```

## Manual Build (Local)

```bash
# Install dependencies
pnpm install

# Build for Android
pnpm run build:cap

# Sync with Capacitor
npx cap sync android

# Build debug APK
cd android && ./gradlew assembleDebug
cd ..

# Build release APK (requires signing config)
cd android && ./gradlew assembleRelease
cd ..
```

## Testing the APK

After the workflow completes:

1. Go to **Actions** → Select the workflow run
2. Download the artifact:
   - `lumina-debug` - Debug APK for testing
   - `lumina-release-signed` - Signed release APK
3. Transfer to your Android device
4. Install and test

## First Test Build

To trigger your first build:

```bash
# Option 1: Push to main (triggers full build)
git push origin main

# Option 2: Dispatch workflow manually
gh workflow run android-build.yml \
  -f version=1.0.0 \
  -f release_type=debug
```

## Troubleshooting

### Build fails at signing
- Check that keystore secrets are correctly set
- Verify the keystore is valid: `keytool -list -v -keystore release.keystore`

### Tests fail
- Run tests locally: `pnpm test`
- Check Playwright reports in `test-results/`

### APK too large
- Check bundle size: `pnpm run build`
- Consider code splitting or lazy loading
