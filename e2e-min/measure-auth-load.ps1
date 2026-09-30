# measure-auth-load.ps1 - mesure le temps de chargement de /auth.
# TTFB (premier octet) + total + HTTP code. Etc
$r = curl.exe --max-time 30 -s -o NUL -w '%{http_code} %{time_starttransfer} %{time_total}' http://localhost:8080/auth
$parts = $r -split ' '
$code = $parts[0]; $ttfb = [double]$parts[1]; $total = [double]$parts[2]
Write-Host ("HTTP code = " + $code)
Write-Host ("TTFB (time_starttransfer) = " + [math]::Round($ttfb,2) + " s")
Write-Host ("total (time_total) = " + [math]::Round($total,2) + " s")
