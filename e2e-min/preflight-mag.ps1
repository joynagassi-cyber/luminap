# preflight-mag.ps1 — exécute UNE seule fois `npx magnitude` (test auth-smoke),
# puis écrit le verdict dans e2e/PREFLIGHT.md.
# La clé API est lue depuis l'environnement utilisateur Windows (scope User) ;
# elle n'est JAMAIS affichée.

$userKey = [Environment]::GetEnvironmentVariable('AGNES_API_KEY','User')
if (-not $userKey) {
    Write-Host "AGNES_API_KEY absente — MAGNITUDE=KO (clé manquante)."
    $verdict = "PLAYWRIGHT=OK MAGNITUDE=KO"
    $detail  = "AGNES_API_KEY absente de l'environnement utilisateur Windows."
} else {
    $env:AGNES_API_KEY  = $userKey
    $env:AGNES_BASE_URL = 'https://apihub.agnes-ai.com/v1'
    $env:AGNES_MODEL    = 'agnes-3.0-flash'

    Write-Host "Exécution de magnitude-test (auth-smoke, 1 appel payant)..."
    $t0 = (Get-Date).UnixTimeAllMilliseconds
    & npx magnitude tests/magnitude/auth-smoke.mag.ts
    $exitCode = $LASTEXITCODE
    $t1 = (Get-Date).UnixTimeAllMilliseconds
    $elapsedSec = [math]::Round(($t1 - $t0) / 1000, 1)

    if ($exitCode -eq 0) {
        $verdict = "PLAYWRIGHT=OK MAGNITUDE=OK"
        $detail  = "auth-smoke réussi en ${elapsedSec} s (exit code 0)."
    } else {
        $verdict = "PLAYWRIGHT=OK MAGNITUDE=KO"
        $detail  = "auth-smoke échoué (exit code ${exitCode}) après ${elapsedSec} s."
    }
}

# Écrit le verdict dans e2e/PREFLIGHT.md (jamais de valeur de clé).
$outFile = Join-Path $PSScriptRoot '..' 'e2e' 'PREFLIGHT.md'
if (Test-Path $outFile) { Remove-Item $outFile }
$content = @"
# Pré-vol — Lumina E2E (session 2026-09-29)

## Verdict
`` ` ``
${verdict}
`` ` ``

## Détail
- ${detail}

## Horodatage
- $(Get-Date -Format 'HH:mm:ss')

"@
Set-Content -Path $outFile -Value $content -Encoding UTF8
Write-Host "PREFLIGHT.md écrit dans ${outFile}"
Write-Host "Verdict : ${verdict}"
