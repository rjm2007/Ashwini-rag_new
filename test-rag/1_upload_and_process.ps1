param(
    [string]$PdfPath = ".\sample.pdf",
    [string]$Email = "admin@demo.com",
    [string]$Password = "admin123"
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $PdfPath)) {
    Write-Error "PDF not found at $PdfPath. Drop a file named sample.pdf in this folder, or pass -PdfPath."
    exit 1
}

Write-Host "==> Step 1/4: Logging in as $Email" -ForegroundColor Cyan
$loginBody = @{ email = $Email; password = $Password } | ConvertTo-Json
$loginResp = Invoke-RestMethod -Uri "http://localhost:3001/auth/login" `
    -Method Post -ContentType "application/json" -Body $loginBody
$token = $loginResp.token
if (-not $token) { Write-Error "Login failed"; exit 1 }
Write-Host "    Got JWT (length=$($token.Length))" -ForegroundColor Green

Write-Host "==> Step 2/4: Uploading $PdfPath" -ForegroundColor Cyan
$absolute = (Resolve-Path $PdfPath).Path
$uploadResp = curl.exe -s -X POST "http://localhost:3001/documents/upload" `
    -H "Authorization: Bearer $token" `
    -F "file=@$absolute" | ConvertFrom-Json
$documentId = $uploadResp.documentId
if (-not $documentId) {
    Write-Error "Upload failed. Server said: $($uploadResp | ConvertTo-Json)"
    exit 1
}
Write-Host "    Uploaded. documentId = $documentId" -ForegroundColor Green

Write-Host "==> Step 3/4: Triggering AI processing (skip SQS)" -ForegroundColor Cyan
Invoke-RestMethod -Uri "http://localhost:8000/internal/process/$documentId" `
    -Method Post -TimeoutSec 600 | Out-Null
Write-Host "    Triggered. Watching status..." -ForegroundColor Green

Write-Host "==> Step 4/4: Polling document status (up to 5 min)" -ForegroundColor Cyan
$deadline = (Get-Date).AddMinutes(5)
$last = ""
while ((Get-Date) -lt $deadline) {
    $status = (docker exec warranty-postgres psql -U warranty_user -d warranty -At -c `
        "SELECT processing_status FROM documents WHERE id = '$documentId';").Trim()
    if ($status -ne $last) {
        Write-Host "    status = $status" -ForegroundColor Yellow
        $last = $status
    }
    if ($status -in @("ready_for_review", "failed")) { break }
    Start-Sleep -Seconds 3
}

Write-Host ""
Write-Host "================================" -ForegroundColor Magenta
Write-Host "Final status: $last"            -ForegroundColor Magenta
Write-Host "Document ID:  $documentId"       -ForegroundColor Magenta
Write-Host "================================" -ForegroundColor Magenta
Write-Host "Next: .\2_check_qdrant.ps1 -DocumentId $documentId"
