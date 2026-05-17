<#
.SYNOPSIS
  Starts per-run log capture for all Docker Compose services.

.DESCRIPTION
  Creates logs/runs/<timestamp>[_documentId]/ with one .log file per service
  plus combined.log. Writes manifest.json and logs/runs/latest.txt.

.EXAMPLE
  .\scripts\Start-RunLogs.ps1
  .\scripts\Start-RunLogs.ps1 -DocumentId "5555388a-8045-456a-885f-2f9628abc90e"
  .\scripts\Start-RunLogs.ps1 -Label "freightliner-upload"
#>
param(
    [string]$DocumentId = "",
    [string]$Label = ""
)

$ErrorActionPreference = "Stop"
$PlatformRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $PlatformRoot

$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$suffix = if ($DocumentId) { $DocumentId.Substring(0, [Math]::Min(36, $DocumentId.Length)) }
          elseif ($Label) { ($Label -replace '[^\w\-]', '_') }
          else { "run" }
$runName = "${timestamp}_${suffix}"
$runDir = Join-Path $PlatformRoot "logs\runs\$runName"
New-Item -ItemType Directory -Force -Path $runDir | Out-Null

$services = @("ai-service", "backend", "frontend", "postgres", "qdrant")
$manifest = [ordered]@{
    runId      = $runName
    startedAt  = (Get-Date).ToUniversalTime().ToString("o")
    documentId = $DocumentId
    label      = $Label
    services   = $services
    runDir     = $runDir
}
$manifest | ConvertTo-Json -Depth 5 | Set-Content -Path (Join-Path $runDir "manifest.json") -Encoding UTF8
Set-Content -Path (Join-Path $PlatformRoot "logs\runs\latest.txt") -Value $runDir -Encoding UTF8

$pidsPath = Join-Path $runDir ".capturer-pids.txt"
@() | Set-Content -Path $pidsPath -Encoding ASCII

foreach ($svc in $services) {
    $outFile = Join-Path $runDir "$svc.log"
    $cmd = "docker compose logs -f --no-color --tail=0 $svc > `"$outFile`" 2>&1"
    $proc = Start-Process -FilePath "cmd.exe" -ArgumentList "/c", $cmd -WindowStyle Hidden -PassThru
    Add-Content -Path $pidsPath -Value $proc.Id
}

$combinedFile = Join-Path $runDir "combined.log"
$combinedCmd = "docker compose logs -f --no-color --tail=0 $($services -join ' ') > `"$combinedFile`" 2>&1"
$combinedProc = Start-Process -FilePath "cmd.exe" -ArgumentList "/c", $combinedCmd -WindowStyle Hidden -PassThru
Add-Content -Path $pidsPath -Value $combinedProc.Id

$env:WARRANTY_RUN_LOG_DIR = $runDir
$env:WARRANTY_RUN_ID = $runName

Write-Host ""
Write-Host "Run log capture STARTED" -ForegroundColor Green
Write-Host "  Run id:    $runName"
Write-Host "  Folder:    $runDir"
Write-Host ""
Write-Host "  Per-service files:"
foreach ($svc in $services) {
    Write-Host "    - $svc.log"
}
Write-Host "    - combined.log"
Write-Host ""
Write-Host "When finished, run:  .\scripts\Stop-RunLogs.ps1" -ForegroundColor Yellow
Write-Host "Search this run:     Select-String -Path `"$runDir\combined.log`" -Pattern `"<documentId>`"" -ForegroundColor DarkGray
Write-Host ""
