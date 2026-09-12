#!/bin/bash
# Unzip the downloaded Cypress 16.0.0 win-x64 binary into the global cache
# and branch it. Run AFTER the download at /tmp/cypress-win-x64-16.0.0.zip
# is complete (expect ~270 MB).
set -e

CACHE_DIR="$LOCALAPPDATA/Cypress/Cache/16.0.0"
BIN_ZIP="/tmp/cypress-win-x64-16.0.0.zip"
INSTALL_TARGET="$CACHE_DIR/Cypress"

echo "=== 1. Verify zip integrity ==="
# 250 MB+ zip, quick CRC check
if ! unzip -t "$BIN_ZIP" >/dev/null 2>&1; then
  echo "ERROR: zip failed integrity check (corrupt or incomplete download)."
  exit 1
fi
echo "OK — zip is valid"

echo "=== 2. Wipe incomplete cache dir ==="
rm -rf "$CACHE_DIR/16.0.0"
rm -rf "$INSTALL_TARGET"

echo "=== 3. Unzip into the global cache root ==="
# The zip has a top-level 'Cypress/' folder; extract to $CACHE_DIR so it lands
# at $CACHE_DIR/16.0.0/  (Cypress's stateModule.getBinaryDir('16.0.0')
# returns $CACHE_DIR/16.0.0/Cypress — verify below).
mkdir -p "$CACHE_DIR/16.0.0"
unzip -q "$BIN_ZIP" -d "$CACHE_DIR/16.0.0/"

# Some Cypress zips nest as `Cypress/...`; the state dir expects a folder named
# exactly `Cypress` directly under the version folder. If unzip produced
# `$CACHE_DIR/16.0.0/Cypress/Cypress/` (double-nested), flatten it.
if [ -d "$CACHE_DIR/16.0.0/Cypress/Cypress" ]; then
  echo "(flattening double-nested Cypress/)"
  mv "$CACHE_DIR/16.0.0/Cypress/Cypress/"* "$CACHE_DIR/16.0.0/Cypress/" 2>/dev/null || true
fi

echo "=== 4. Verify resources/app exists ==="
if [ ! -d "$CACHE_DIR/16.0.0/Cypress/resources/app" ]; then
  echo "ERROR: resources/app missing after extraction. The zip layout differs."
  echo "  Listing top of extracted dir:"
  ls "$CACHE_DIR/16.0.0/Cypress/" | head -20
  exit 1
fi

echo "=== 5. Mark the binary as used by cypress state ==="
# Cypress's state.json lives at $LOCALAPPDATA/Cypress/Cache/; it's refreshed
# on next `cypress verify`.
echo "Extraction complete. Now run:  cypress verify"
echo "  Expected output: Cypress binary version: 16.0.0"
