# scan-secrets.ps1 - checks that no file under e2e-min/ or tests/magnitude/
# contains a hardcoded AGNES_API_KEY assignment. Never displays a value;
# only paths + line numbers. Usage:
#   powershell -NoProfile -ExecutionPolicy Bypass -File e2e-min/scan-secrets.ps1
$q1 = [char]39   # single quote
$q2 = [char]34   # double quote
$bs = [regex]::Escape('AGNES_API_KEY')
$pattern = $bs + '\s*=\s*[' + $q1 + $q2 + '][^' + $q1 + $q2 + ']+'
Write-Host ("pattern = " + $pattern)
Get-ChildItem 'e2e-min' -Recurse -File | Select-String -Pattern $pattern | Select-Object Path,LineNumber
Get-ChildItem 'tests\magnitude' -Recurse -File | Select-String -Pattern $pattern | Select-Object Path,LineNumber
Write-Host 'scan done - no lines above means the key is not in any file'
