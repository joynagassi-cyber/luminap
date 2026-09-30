#!/usr/bin/env bash
# it10-server-start.sh — démarre le serveur Vite en arrière-plan sur 8080 et
# enregistre sa PID dans e2e-min/vite.pid pour la suite du run.
set -u
cd /c/Users/joyda/dyad-apps/lumina
mkdir -p e2e-min/logs
nohup pnpm exec vite --port 8080 > e2e-min/logs/vite-stdout.log 2>&1 &
echo $! > e2e-min/vite.pid
sleep 3
echo "vite PID: $(cat e2e-min/vite.pid)"
echo "vite log (premier tiers):"
head -40 e2e-min/logs/vite-stdout.log
