# Start the Docling PDF OCR service (Tier 2) for test-rag ingest.
# First run: docker build may take 5-10 minutes.
#
# If scripts are blocked, use instead:
#   Start-Docling.cmd
#   powershell -ExecutionPolicy Bypass -File .\Start-Docling.ps1
Set-Location $PSScriptRoot

Write-Host "Building and starting Docling on http://localhost:5001 ..."
docker compose -f docker-compose.docling.yml up --build -d

Write-Host "Waiting for health check..."
$deadline = (Get-Date).AddMinutes(3)
while ((Get-Date) -lt $deadline) {
    try {
        $r = Invoke-RestMethod -Uri "http://localhost:5001/health" -TimeoutSec 5
        if ($r.status -eq "ok") {
            Write-Host "Docling is ready. converter_loaded=$($r.converter_loaded)"
            exit 0
        }
    } catch {
        Start-Sleep -Seconds 5
    }
}

Write-Host "Docling did not become healthy in time. Check: docker logs warranty-docling"
exit 1
