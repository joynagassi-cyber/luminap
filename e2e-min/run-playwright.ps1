# run-playwright.ps1 - runs the given Playwright spec against the NEW
# env-isolated dev server (fake VITE_* values, port 8080), writes output
# to a log file, does NOT display it.

param(
  [Parameter(Mandatory)][string]$Spec
)

$root = (Get-Location).Path
$logFile = Join-Path $root ("e2e-min/logs/playwright-" + ([guid]::NewGuid().ToString("n").Substring(0,8)) + ".log")

# Start the dev server in the background with fake env values (rule n° 4).
$env:VITE_SUPABASE_URL = "https://example-dummy.supabase.co"
$env:VITE_SUPABASE_ANON_KEY = "dummy-anon-key-0000000000000000"
$env:VITE_POWERSYNC_URL = "https://example-dummy.powersync.local"
$env:VITE_ONESIGNAL_APP_ID = "00000000-0000-0000-0000-000000000000"

# Check if the port is already in use; reuse it (already a fake-env server).
$listener = Get-NetTCPConnection -LocalPort 8080 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not $listener) {
  $devServer = Start-Process -FilePath "npm" -ArgumentList "run","dev" -WorkingDirectory $root -PassThru -NoNewWindow
  Write-Host "Started dev server PID " + $devServer.Id + " (fake env, log to process stdout, not captured)."
  Start-Sleep -Seconds 30
} else {
  Write-Host "Port 8080 already in use (PID " + $listener.OwningProcess + ") - reusing."
}

# Run Playwright with output redirected to a log file (never displayed).
$runTime = Get-Date
Write-Host ("Writing Playwright run output to: " + $logFile)
npx playwright test --config=e2e/playwright.config.ts $Spec --repeat-each=2 *> $logFile
$exitCode = $LASTEXITCODE
Write-Host ("Playwright run finished with exit code: " + $exitCode + " at " + (Get-Date -Format 'HH:mm:ss'))
Write-Host ("Output saved to: " + $logFile)
exit $exitCode
