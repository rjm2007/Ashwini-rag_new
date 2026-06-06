# Re-parse + re-process the 3 run_002 test documents (no re-upload)
$ErrorActionPreference = "Stop"
$base = "http://localhost:3001"
$aiUrl = "http://localhost:8000"
$qdrant = "http://localhost:6333"

$docIds = @(
    "b815d50d-fd11-4be3-a178-a403f7ef8170",
    "5360f979-c1bb-4ea5-8e32-776bef9c33b8",
    "0d4746db-0115-4fc5-aeac-ce11e576c3b7"
)

function Wait-Status($docId, $targets, $label, $maxMin = 30) {
    $deadline = (Get-Date).AddMinutes($maxMin)
    do {
        Start-Sleep -Seconds 10
        $doc = Invoke-RestMethod -Uri "$base/documents/$docId" -Headers @{ Authorization = "Bearer $token" }
        Write-Host "  [$label] status=$($doc.processingStatus)"
        if ($doc.processingStatus -eq "failed") { throw "$label failed" }
        if ($doc.processingStatus -in $targets) { return $doc }
        if ((Get-Date) -gt $deadline) { throw "$label timed out (last=$($doc.processingStatus))" }
    } while ($true)
}

function Clear-QdrantDoc($docId) {
    $body = @{
        filter = @{
            must = @(@{ key = "documentId"; match = @{ value = $docId } })
        }
    } | ConvertTo-Json -Depth 6
    Invoke-RestMethod -Method Post -Uri "$qdrant/collections/warranty_chunks/points/delete?wait=true" `
        -ContentType "application/json" -Body $body | Out-Null
}

$login = Invoke-RestMethod -Method Post -Uri "$base/auth/login" -ContentType "application/json" `
    -Body (@{ email = "admin@demo.com"; password = "admin123" } | ConvertTo-Json)
$token = $login.token

foreach ($docId in $docIds) {
    Write-Host "`n=== Reprocess $docId ===" -ForegroundColor Cyan
    Clear-QdrantDoc $docId
    curl.exe -s -X POST "$aiUrl/internal/parse/$docId" | Out-Null
    Wait-Status $docId @("awaiting_certification") "parse" 25 | Out-Null
    curl.exe -s -X POST "$aiUrl/internal/process/$docId" | Out-Null
    Wait-Status $docId @("processing_complete") "process" 35 | Out-Null

    $summary = Invoke-RestMethod -Uri "$aiUrl/internal/summary/$docId"
    $codes = @($summary.profiles.coverage_code_table.coverage_codes)
    Write-Host "  coverage_codes count=$($codes.Count)"
}

Write-Host "`nReprocess complete." -ForegroundColor Green
