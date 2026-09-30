# run-magnitude.ps1 — exécute le test Magnitude `auth-smoke` (1 seul, payant).
# La clé API est lue depuis l'environnement utilisateur Windows (scope User) ;
# elle n'est JAMAIS affichée, journalisée ni écrite dans un fichier.

# 1. Récupère la clé depuis le scope utilisateur Windows (jamais affichée).
$userKey = [Environment]::GetEnvironmentVariable('AGNES_API_KEY','User')
if (-not $userKey) {
    Write-Error "AGNES_API_KEY absente de l'environnement utilisateur Windows."
    Write-Error "Pour la poser : [Environment]::SetEnvironmentVariable('AGNES_API_KEY','<valeur>','User')"
    exit 1
}

# 2. Pose les variables dans le scope process (pas dans un fichier).
$env:AGNES_API_KEY = $userKey
$env:AGNES_BASE_URL = 'https://apihub.agnes-ai.com/v1'
$env:AGNES_MODEL = 'agnes-3.0-flash'

# 3. Exécute Magnitude avec le test de fumée auth (1 appel payant).
Write-Host "Exécution de magnitude-test (auth-smoke, 1 appel payant) ..."
& npx magnitude

exit $LASTEXITCODE
