#!/bin/bash
set -e
echo "=== Capacitor Android Setup ==="
echo "Step 1: Build web app..."
npm run build
echo "Step 2: Initialize Capacitor..."
npx cap init Lumina org.mfej-centrale.lumina --web-dir=dist --no-open
echo "Step 3: Add Android platform..."
npx cap add android
echo "Step 4: Sync..."
npx cap sync android
echo "=== Setup Complete ==="
echo "To build APK:"
echo "  npx cap open android"
echo "  Then in Android Studio: Build -> Build Bundle(s) / APK(s) -> Build APK(s)"
echo "APK location: android/app/build/outputs/apk/debug/app-debug.apk"
