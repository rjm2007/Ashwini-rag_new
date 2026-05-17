param(
    [Parameter(Mandatory = $true)][string]$DocumentId
)

$ErrorActionPreference = "Stop"

# Test-only helper. Marks every Qdrant point belonging to this document as
# repository = "certified" so it becomes searchable by users without going
# through the reviewer + admin approval flow in the UI.

$body = @{
    payload = @{ repository = "certified" }
    filter  = @{
        must = @(@{ key = "documentId"; match = @{ value = $DocumentId } })
    }
} | ConvertTo-Json -Depth 6

Write-Host "==> Fast-forwarding documentId=$DocumentId in Qdrant to repository=certified" -ForegroundColor Cyan
$resp = Invoke-RestMethod `
    -Uri "http://localhost:6333/collections/warranty_chunks/points/payload?wait=true" `
    -Method Post -ContentType "application/json" -Body $body
$resp | ConvertTo-Json -Depth 4

Write-Host ""
Write-Host "Done. Now run: .\3_ask_question.ps1 -Question '...'" -ForegroundColor Magenta
