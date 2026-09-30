$ErrorActionPreference = 'Stop'
$conns = Get-NetTCPConnection -LocalPort 8080 -State Listen -ErrorAction SilentlyContinue
if ($conns) {
  $pids = $conns | Select-Object -ExpandProperty OwningProcess -Unique
  foreach ($p in $pids) {
    $proc = Get-Process -Id $p -ErrorAction SilentlyContinue
    Write-Host ("  PID {0} - {1}" -f $p, $proc.ProcessName)
    Stop-Process -Id $p -Force
  }
  Start-Sleep -Milliseconds 500
  $still = Get-NetTCPConnection -LocalPort 8080 -State Listen -ErrorAction SilentlyContinue
  if ($still) {
    Write-Host "[cleanup] ERREUR : port 8080 encore occupe."
    exit 1
  }
  Write-Host "[cleanup] Port 8080 libere."
} else {
  Write-Host "[cleanup] Aucun listener sur 8080."
}
Write-Host "[cleanup] Le webServer est demarre par Playwright (reuseExistingServer: false)."
