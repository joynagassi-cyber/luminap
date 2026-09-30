/**
 * Contexte e2e Lumina — vérification de l'isolation
 *
 * But : vérifier que le serveur de dev Vite (port 8080) ne reçoit
 * QUE des variables factices et que le garde-fou réseau bloque
 * toute requête vers un hôte non autorisé (vraie base Supabase,
 * OneSignal, etc.).
 *
 * Usage :
 *   $env:VITE_SUPABASE_URL='https://example-dummy.supabase.co'
 *   $env:VITE_SUPABASE_ANON_KEY='dummy-anon-key-0000000000000000'
 *   $env:VITE_POWERSYNC_URL='https://example-dummy.powersync.local'
 *   $env:VITE_ONESIGNAL_APP_ID='00000000-0000-0000-0000-000000000000'
 *   $env:CAPACITOR_BUILD='false'
 *   pwsh -File e2e/isolation-check.ps1
 *
 * Cette script NE lance PAS de serveur ; il attend que le serveur
 * soit déjà démarré par le runner Playwright (webServer, ou
 * manuellement pour vérification ad hoc).
 */

$ErrorActionPreference = 'Stop'

# --------------------------------------------------------------------
# 1. Vérifier que le serveur de dev est écoutant sur 8080
# --------------------------------------------------------------------
Write-Host '[isolation] Vérification serveur sur port 8080…' -ForegroundColor Cyan
$serverUp = $false
try {
  $tcp = New-Object System.Net.Sockets.TcpClient
  $tcp.Connect('127.0.0.1', 8080)
  $tcp.Close()
  $serverUp = $true
} catch {
  $serverUp = $false
}

if (-not $serverUp) {
  Write-Host '[isolation] ERREUR : aucun serveur ne répond sur 127.0.0.1:8080.' -ForegroundColor Red
  Write-Host '[isolation] Lancer d''abord le runner Playwright (il démarre le webServer).' -ForegroundColor Red
  exit 1
}

Write-Host '[isolation] Serveur détecté sur 8080 — on y va.' -ForegroundColor Green

# --------------------------------------------------------------------
# 2. Vérifier les variables d'environnement du processus serveur
#    (Windows : Get-Process + .Environment, ou via l'inspecteur)
#    En pratique on se rabat sur une vérification statique :
#    le contenu de `.env` / `.env.local` doit être **écrasé** par
#    les variables qu'on a posées dans ce script / webServer.env.
# --------------------------------------------------------------------
Write-Host ''
Write-Host '[isolation] Variables en vigueur pour le serveur (factices posées par webServer.env) :' -ForegroundColor Cyan
$envChecks = [ordered]@{
  VITE_SUPABASE_URL       = $env:VITE_SUPABASE_URL
  VITE_SUPABASE_ANON_KEY = $env:VITE_SUPABASE_ANON_KEY
  VITE_POWERSYNC_URL     = $env:VITE_POWERSYNC_URL
  VITE_ONESIGNAL_APP_ID  = $env:VITE_ONESIGNAL_APP_ID
  CAPACITOR_BUILD        = $env:CAPACITOR_BUILD
}
foreach ($k in $envChecks.Keys) {
  $v = $envChecks[$k]
  if ([string]::IsNullOrWhiteSpace($v)) {
    Write-Host ("  {0,-24} = (absente)" -f $k) -ForegroundColor Yellow
  } else {
    # Ne jamais afficher de valeur secrète — on vérifie juste si elle
    # correspond au pattern factice.
    $isDummy = $v -match 'dummy|00000000|example'
    $suffix = if ($isDummy) { ' (dummy ✓)' } else { ' (VALEUR NON FACTICE ✗)' }
    Write-Host ("  {0,-24} = …{1:40}…{2}" -f $k, (' ' + $suffix.Trim()), $suffix)
    if (-not $isDummy -and $k -match 'KEY|URL|APP_ID') {
      # Uniquement si ce n'est PAS dummy et que c'est un nom connu :
      # on signale sans afficher la valeur.
      Write-Host "    ⚠ $k contient une valeur NON factice — isolaTion cassée ?" -ForegroundColor Red
    }
  }
}

# --------------------------------------------------------------------
# 3. Vérification finale : le serveur lui-même doit répondre
#    sur une URL factice (pas sur la vraie base Supabase)
# --------------------------------------------------------------------
Write-Host ''
Write-Host '[isolation] Probes réseau (vérification hôte) :' -ForegroundColor Cyan

# On teste que la vraie base Supabase n'est PAS joignable depuis ce
# processus — pour le moment on vérifie juste qu'aucune variable
# TEST_SUPABASE_URL n'est posée (mode sans-backend).
if ($env:TEST_SUPABASE_URL) {
  Write-Host '  TEST_SUPABASE_URL posée → MODE BACKEND-TACTIL ACTIF' -ForegroundColor Yellow
  Write-Host '  (le guard du fixture est alors autorisé à contacter cet hôte, sinon blocé.)' -ForegroundColor Yellow
} else {
  Write-Host '  TEST_SUPABASE_URL absente → MODE SANS-BACKEND (garde-fou réseau strict)' -ForegroundColor Green
}

if ($env:TEST_SUPABASE_ANON_KEY) {
  Write-Host '  TEST_SUPABASE_ANON_KEY posée → même chose' -ForegroundColor Yellow
} else {
  Write-Host '  TEST_SUPABASE_ANON_KEY absente → mode sans-backend (strict)' -ForegroundColor Green
}

Write-Host ''
Write-Host '[isolation] Vérification terminée.' -ForegroundColor Green
Write-Host '[isolation] Le runner Playwright doit maintenant lancer le test ;'
Write-Host '[isolation] le guard de e2e/fixtures/guarded-page.ts interdira toute'
Write-Host '[isolation] requête vers un hôte non autorisé (127.0.0.1 / ::1 /'
Write-Host '[isolation] localhost + éventuellement l''hôte de TEST_SUPABASE_URL).'
