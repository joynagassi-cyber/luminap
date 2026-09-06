#!/bin/bash
# Trigger Android Build Workflow

echo "🚀 Lumina Android Build Trigger"
echo "================================"
echo ""

# Check if running in debug or release mode
if [ "$1" == "debug" ]; then
    RELEASE_TYPE="debug"
elif [ "$1" == "release" ]; then
    RELEASE_TYPE="release"
else
    echo "Usage: ./trigger-build.sh [debug|release]"
    echo ""
    echo "Examples:"
    echo "  ./trigger-build.sh debug   # Build debug APK"
    echo "  ./trigger-build.sh release # Build signed release APK"
    exit 1
fi

VERSION="${2:-1.0.0}"

echo "Triggering build:"
echo "  Version: $VERSION"
echo "  Type: $RELEASE_TYPE"
echo ""

gh workflow run android-build.yml \
    -f version=$VERSION \
    -f release_type=$RELEASE_TYPE

echo ""
echo "✅ Workflow triggered!"
echo "   Check progress at: https://github.com/joynagassi-cyber/luminap/actions"
