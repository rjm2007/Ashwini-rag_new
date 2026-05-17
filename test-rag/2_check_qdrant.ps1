param(
    [Parameter(Mandatory = $true)][string]$DocumentId
)

$ErrorActionPreference = "Stop"

Write-Host "==> Collection summary" -ForegroundColor Cyan
$summary = (Invoke-WebRequest "http://localhost:6333/collections/warranty_chunks" `
    -UseBasicParsing).Content | ConvertFrom-Json
$summary.result | Select-Object status, points_count, indexed_vectors_count, segments_count |
    Format-List

Write-Host "==> First 5 points (any document)" -ForegroundColor Cyan
$body = '{"limit": 5, "with_payload": true, "with_vector": false}'
$first = Invoke-RestMethod -Uri "http://localhost:6333/collections/warranty_chunks/points/scroll" `
    -Method Post -ContentType "application/json" -Body $body
$first.result.points | ForEach-Object {
    $p = $_.payload
    [pscustomobject]@{
        id           = $_.id
        repository   = $p.repository
        documentId   = $p.documentId
        pageNumber   = $p.pageNumber
        chunkPreview = if ($p.chunkText) { $p.chunkText.Substring(0, [Math]::Min(120, $p.chunkText.Length)) } else { "" }
    }
} | Format-Table -AutoSize -Wrap

Write-Host "==> Points belonging to documentId=$DocumentId" -ForegroundColor Cyan
$filterBody = @{
    limit          = 50
    with_payload   = $true
    with_vector    = $false
    filter         = @{
        must = @(@{ key = "documentId"; match = @{ value = $DocumentId } })
    }
} | ConvertTo-Json -Depth 6
$mine = Invoke-RestMethod -Uri "http://localhost:6333/collections/warranty_chunks/points/scroll" `
    -Method Post -ContentType "application/json" -Body $filterBody
$count = $mine.result.points.Count
Write-Host "    Found $count chunks for this document." -ForegroundColor Green
$mine.result.points | Select-Object -First 5 | ForEach-Object {
    $p = $_.payload
    [pscustomobject]@{
        page         = $p.pageNumber
        repository   = $p.repository
        chunkPreview = if ($p.chunkText) { $p.chunkText.Substring(0, [Math]::Min(140, $p.chunkText.Length)) } else { "" }
    }
} | Format-Table -AutoSize -Wrap

Write-Host ""
Write-Host "Open the Qdrant dashboard for full view: http://localhost:6333/dashboard" -ForegroundColor Magenta
