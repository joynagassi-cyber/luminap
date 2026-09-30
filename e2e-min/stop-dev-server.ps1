# stop-dev-server.ps1 - stop the Vite dev server on port 8080.
$proc = Get-NetTCPConnection -LocalPort 8080 -State Listen -ErrorAction SilentlyContinue |
  Select-Object -First 1 -ExpandProperty OwningProcess
if ($proc) {
  Write-Host ("Stopping process PID " + $proc + " (vite on 8080) ...")
  Stop-Process -Id $proc -Force
  Start-Sleep -Seconds 3
  $still = Get-NetTCPConnection -LocalPort 8080 -State Listen -ErrorAction SilentlyContinue
  if ($still) {
    Write-Host "Port 8080 still in use - check manually."
  } else {
    Write-Host "Port 8080 freed."
  }
} else {
  Write-Host "No process is listening on port 8080."
}
