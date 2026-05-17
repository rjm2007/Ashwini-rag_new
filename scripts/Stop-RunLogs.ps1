<#
.SYNOPSIS
  Stops per-run Docker log capture started by Start-RunLogs.ps1.
#>
$ErrorActionPreference = "SilentlyContinue"
$PlatformRoot = Resolve-Path (Join-Path $PSScriptRoot "..")

$runDir = $env:WARRANTY_RUN_LOG_DIR
if (-not $runDir -or -not (Test-Path $runDir)) {
    $latestFile = Join-Path $PlatformRoot "logs\runs\latest.txt"
    if (Test-Path $latestFile) {
        $runDir = (Get-Content $latestFile -Raw).Trim()
    }
}

if (-not $runDir -or -not (Test-Path $runDir)) {
    Write-Host "No active run log folder found. Start one with .\scripts\Start-RunLogs.ps1" -ForegroundColor Yellow
    exit 1
}

$pidsPath = Join-Path $runDir ".capturer-pids.txt"
if (Test-Path $pidsPath) {
    Get-Content $pidsPath | ForEach-Object {
        $pid = [int]$_
        if ($pid -gt 0) {
            Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
        }
    }
    Remove-Item $pidsPath -Force -ErrorAction SilentlyContinue
}

$manifestPath = Join-Path $runDir "manifest.json"
if (Test-Path $manifestPath) {
    $manifest = Get-Content $manifestPath -Raw | ConvertFrom-Json
    $manifest | Add-Member -NotePropertyName endedAt -NotePropertyValue (Get-Date).ToUniversalTime().ToString("o") -Force
    $manifest | ConvertTo-Json -Depth 5 | Set-Content -Path $manifestPath -Encoding UTF8
}

Remove-Item Env:WARRANTY_RUN_LOG_DIR -ErrorAction SilentlyContinue
Remove-Item Env:WARRANTY_RUN_ID -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "Run log capture STOPPED" -ForegroundColor Green
Write-Host "  Logs saved in: $runDir"
Write-Host ""
Get-ChildItem $runDir -Filter "*.log" | ForEach-Object {
    $kb = [math]::Round($_.Length / 1KB, 1)
    Write-Host ("  {0,-16} {1,8} KB" -f $_.Name, $kb)
}
Write-Host ""
