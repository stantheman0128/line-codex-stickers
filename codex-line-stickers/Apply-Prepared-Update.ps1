$ErrorActionPreference = 'Stop'
$stage = Join-Path $PSScriptRoot 'update-v2'
$marker = Join-Path $PSScriptRoot 'applied-v2.json'
if (!(Test-Path -LiteralPath (Join-Path $stage 'manifest.json'))) { return }
$manifest = Get-Content -LiteralPath (Join-Path $stage 'manifest.json') -Raw | ConvertFrom-Json
if (Test-Path -LiteralPath $marker) {
    $applied = Get-Content -LiteralPath $marker -Raw | ConvertFrom-Json
    if ($applied.asarSHA256 -eq $manifest.asarSHA256 -and $applied.exeSHA256 -eq $manifest.exeSHA256) {
        $currentExe=Join-Path $PSScriptRoot 'app\ChatGPT.exe'
        $currentAsar=Join-Path $PSScriptRoot 'app\resources\app.asar'
        if ((Test-Path -LiteralPath $currentExe) -and (Test-Path -LiteralPath $currentAsar)) {
            if ((Get-FileHash -LiteralPath $currentExe -Algorithm SHA256).Hash -ieq $manifest.exeSHA256 -and (Get-FileHash -LiteralPath $currentAsar -Algorithm SHA256).Hash -ieq $manifest.asarSHA256) { return }
        }
    }
}
if (@(Get-CimInstance Win32_Process -Filter "Name='ChatGPT.exe'").Count -gt 0) {
    throw 'Quit Codex before applying the prepared update. No running app was changed.'
}
$appRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot 'app'))
$exe = Join-Path $appRoot 'ChatGPT.exe'
$asar = Join-Path $appRoot 'resources\app.asar'
$backup = Join-Path $PSScriptRoot 'rollback-v1'
foreach ($item in @(@('ChatGPT.exe',$manifest.exeSHA256),@('app.asar',$manifest.asarSHA256))) {
    $hash = (Get-FileHash -LiteralPath (Join-Path $stage $item[0]) -Algorithm SHA256).Hash
    if ($hash -ine $item[1]) { throw ('Prepared update hash mismatch: ' + $item[0]) }
}
New-Item -ItemType Directory -Path $backup -Force | Out-Null
if (!(Test-Path -LiteralPath (Join-Path $backup 'ChatGPT.exe'))) { Copy-Item -LiteralPath $exe -Destination (Join-Path $backup 'ChatGPT.exe') }
if (!(Test-Path -LiteralPath (Join-Path $backup 'app.asar'))) { Copy-Item -LiteralPath $asar -Destination (Join-Path $backup 'app.asar') }
try {
    Copy-Item -LiteralPath (Join-Path $stage 'app.asar') -Destination $asar -Force
    Copy-Item -LiteralPath (Join-Path $stage 'ChatGPT.exe') -Destination $exe -Force
    if ((Get-FileHash -LiteralPath $asar -Algorithm SHA256).Hash -ine $manifest.asarSHA256) { throw 'Installed archive verification failed.' }
    if ((Get-FileHash -LiteralPath $exe -Algorithm SHA256).Hash -ine $manifest.exeSHA256) { throw 'Installed executable verification failed.' }
    $manifest | ConvertTo-Json | Set-Content -LiteralPath $marker -Encoding utf8
    Write-Host 'Prepared LINE composer v2 update applied.'
} catch {
    Copy-Item -LiteralPath (Join-Path $backup 'app.asar') -Destination $asar -Force
    Copy-Item -LiteralPath (Join-Path $backup 'ChatGPT.exe') -Destination $exe -Force
    throw
}
