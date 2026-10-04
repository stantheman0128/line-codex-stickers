param([int]$Limit = 50)
$ErrorActionPreference = 'Stop'
$root = Join-Path $env:LOCALAPPDATA 'LINE\Data\Sticker'
if (-not (Test-Path -LiteralPath $root)) { throw "Desktop LINE stickers not found: $root" }
Get-ChildItem -LiteralPath $root -Directory | ForEach-Object {
  $pack = $_.Name
  Get-ChildItem -LiteralPath $_.FullName -Recurse -File -Include *.png,*.apng | Select-Object -First $Limit | ForEach-Object {
    [pscustomobject]@{ pack = $pack; file = $_.FullName; bytes = $_.Length }
  }
} | Select-Object -First $Limit | Format-Table -AutoSize
