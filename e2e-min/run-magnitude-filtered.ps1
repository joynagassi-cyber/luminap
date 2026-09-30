# run-magnitude-filtered.ps1 — variante du run qui ne lance QUE le test
# de fumée (ou seulement le test négatif) via un filtre de fichier, pour
# éviter que `npx magnitude` exécute les deux fichiers en parallèle.
#
# Usage :
#   powershell -File e2e-min\run-magnitude-filtered.ps1 tests\magnitude\auth-smoke.mag.ts
#   powershell -File e2e-min\run-magnitude-filtered.ps1 tests\magnitude\auth-negative.mag.ts
#
# La clé est lue depuis l'environnement utilisateur (User scope), jamais
# écrite dans ce script. S'inspire de run-magnitude.ps1.

param([Parameter(Mandatory=$true)][string]$TestFile)

$userKey = [Environment]::GetEnvironmentVariable('AGNES_API_KEY','User')
if (-not $userKey) {
    Write-Error "AGNES_API_KEY absente de l'environnement utilisateur Windows. Pour la poser : [Environment]::SetEnvironmentVariable('AGNES_API_KEY','<valeur>','User')."
    exit 1
}
$env:AGNES_API_KEY = $userKey
$env:AGNES_BASE_URL = 'https://apihub.agnes-ai.com/v1'
$env:AGNES_MODEL = 'agnes-3.0-flash'
Write-Host "[pre] AGNES_API_KEY (User) = presente (valeur non affichee)"

# Relancer npx magnitude en filtrant sur le fichier de test demandé.
# `npx magnitude` accepte les chemins de specs comme arguments positionnels.
# S'il ne supporte pas le filtre, on supprime temporairement l'autre
# fichier pour ne lancer qu'un seul (fallback non destructeur).
Push-Location $PSScriptRoot\..
$other = if ($TestFile -like '*auth-smoke*') { 'tests\magnitude\auth-negative.mag.ts' } else { 'tests\magnitude\auth-smoke.mag.ts' }
if (Test-Path $other) {
    Move-Item -Path $other -Destination ($other + '.disabled') -Force
}
try {
    npx magnitude 2>&1
    $code = $LASTEXITCODE
} finally {
    # RESTAURER le fichier masqué — jamais ne laisser de fichier manquant
    if (Test-Path ($other + '.disabled')) {
        Move-Item -Path ($other + '.disabled') -Destination $other -Force
    }
}
Write-Host "[post] magnitude exit code = $code"

Remove-Item Env:AGNES_API_KEY -ErrorAction SilentlyContinue
Remove-Item Env:AGNES_BASE_URL -ErrorAction SilentlyContinue
Remove-Item Env:AGNES_MODEL -ErrorAction SilentlyContinue
exit $code
