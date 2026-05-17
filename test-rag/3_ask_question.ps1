param(
    [Parameter(Mandatory = $true)][string]$Question,
    [string[]]$History = @()
)

$ErrorActionPreference = "Stop"

$historyArr = @()
foreach ($h in $History) {
    $historyArr += @{ role = "user"; content = $h }
}

$payload = @{
    question             = $Question
    conversationHistory  = $historyArr
} | ConvertTo-Json -Depth 6

Write-Host "==> Asking AI service" -ForegroundColor Cyan
Write-Host "    Q: $Question" -ForegroundColor Yellow

$resp = Invoke-RestMethod -Uri "http://localhost:8000/query/answer" `
    -Method Post -ContentType "application/json" -Body $payload -TimeoutSec 120

Write-Host ""
Write-Host "==> Answer" -ForegroundColor Cyan
$resp | ConvertTo-Json -Depth 8
