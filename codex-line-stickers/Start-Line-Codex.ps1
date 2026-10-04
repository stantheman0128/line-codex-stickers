param([switch]$Admitted, [switch]$ValidateOnly)
$ErrorActionPreference = 'Stop'
$workPath = Join-Path (Split-Path -Parent (Split-Path -Parent $PSScriptRoot)) 'work'
$launchLog = Join-Path $workPath 'line-launcher.log'
function Write-LaunchLog([string]$Message) {
    if (!$ValidateOnly) {
        New-Item -ItemType Directory -Path $workPath -Force | Out-Null
        Add-Content -LiteralPath $launchLog -Value ((Get-Date -Format o) + ' ' + $Message) -Encoding utf8
    }
}
trap {
    Write-LaunchLog ('error=' + $_.Exception.Message)
    throw $_
}
Write-LaunchLog ('entered admitted=' + $Admitted)
$appPath = Join-Path $PSScriptRoot 'app\ChatGPT.exe'
$sentinelPath = 'C:\Users\stans\Projects\resource-sentinel\scripts\invoke-sentinel.ps1'
if (!(Test-Path -LiteralPath $appPath) -or !(Test-Path -LiteralPath $sentinelPath)) {
    throw 'The modified app or Resource Sentinel launcher is missing.'
}
$profilePath = $env:CODEX_ELECTRON_USER_DATA_PATH
if ([string]::IsNullOrWhiteSpace($profilePath)) {
    $profilePath = Join-Path ([Environment]::GetFolderPath('ApplicationData')) 'Codex\web\Codex'
}
$profilePath = [IO.Path]::GetFullPath($profilePath)
if (!(Test-Path -LiteralPath (Join-Path $profilePath 'Local State') -PathType Leaf)) {
    throw "Existing Codex profile was not found: $profilePath"
}
$activeApps = @(Get-CimInstance Win32_Process -Filter "Name='ChatGPT.exe'")
if ($ValidateOnly) {
    [pscustomobject]@{App=$appPath;Profile=$profilePath;RunningAppProcesses=$activeApps.Count;LaunchPerformed=$false}
    return
}
if ($activeApps.Count -gt 0) {
    Write-LaunchLog ('blocked runningPids=' + (($activeApps | ForEach-Object {$_.ProcessId}) -join ','))
    throw 'Codex is still running. Save your work, quit Codex normally, then run this launcher again. No process was stopped.'
}
if (!$Admitted) {
    $quotedScript = '"' + $PSCommandPath + '"'
    & $sentinelPath -Command ("powershell -NoProfile -ExecutionPolicy Bypass -File $quotedScript -Admitted") -Priority P2 -ResourceClass MEDIUM -CpuUnits 1.5 -RamGiB 1.5 -IoSlots 1
    exit $LASTEXITCODE
}
$savedProfile = $env:CODEX_ELECTRON_USER_DATA_PATH
try {
    & (Join-Path $PSScriptRoot 'Apply-Prepared-Update.ps1')
    $env:CODEX_ELECTRON_USER_DATA_PATH = $profilePath
    Write-LaunchLog ('starting app=' + $appPath + ' profile=' + $profilePath)
    # Both switches refer to the same profile. Do not copy credentials or override CODEX_HOME.
    $runtimeLog = Join-Path $workPath 'line-native-runtime.log'
    $launchedApp = Start-Process -FilePath $appPath -ArgumentList @('--user-data-dir="' + $profilePath + '"','--enable-logging','--log-file="' + $runtimeLog + '"') -PassThru
    Write-LaunchLog ('started pid=' + $launchedApp.Id)
    $launchedApp.WaitForExit()
    Write-LaunchLog ('exited code=' + $launchedApp.ExitCode)
} finally {
    $env:CODEX_ELECTRON_USER_DATA_PATH = $savedProfile
}
