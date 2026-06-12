# Upload + certify the three Krones sample PDFs from krones-rag/sample-docs
param(
  [string]$BaseUrl = "http://localhost:3001",
  [string]$SampleDir = "..\..\krones-rag\sample-docs"
)

$ErrorActionPreference = "Stop"
$SampleDir = (Resolve-Path $SampleDir).Path

$login = Invoke-RestMethod -Uri "$BaseUrl/auth/login" -Method POST -ContentType "application/json" `
  -Body '{"email":"admin@demo.com","password":"admin123"}'
$token = $login.token
if (-not $token) { throw "Login failed - no token" }
$headers = @{ Authorization = "Bearer $token" }

$pdfs = @(
  @{ File = "Supplier_Handbook.pdf"; Role = "D1" },
  @{ File = "supplier_declaratoin_instruction.pdf"; Role = "D2" },
  @{ File = "Jira_information_for_Krones_suppliers.pdf"; Role = "D3" }
)

function Wait-Processing($docId, $targetStatus, $maxSec = 900) {
  $deadline = (Get-Date).AddSeconds($maxSec)
  while ((Get-Date) -lt $deadline) {
    $doc = Invoke-RestMethod -Uri "$BaseUrl/documents/$docId" -Headers $headers
    $st = $doc.processingStatus
    Write-Host "  [$docId] status=$st"
    if ($st -eq $targetStatus) { return $doc }
    if ($st -eq "failed") { throw "Pipeline failed for $docId" }
    Start-Sleep -Seconds 15
  }
  throw "Timeout waiting for $targetStatus on $docId"
}

$uploaded = @()
foreach ($p in $pdfs) {
  $path = Join-Path $SampleDir $p.File
  if (-not (Test-Path $path)) { throw "Missing $path" }
  Write-Host "Uploading $($p.Role): $($p.File)"
  $resp = curl.exe -s -X POST "$BaseUrl/documents/upload" `
    -H "Authorization: Bearer $token" `
    -F "file=@$path" `
    -F "documentType=krones_supplier_doc" | ConvertFrom-Json
  $id = $resp.documentId
  if (-not $id) { $id = $resp.id }
  if (-not $id) { throw "Upload failed for $($p.File): $($resp | ConvertTo-Json -Compress)" }
  Write-Host "  -> documentId=$id"
  $uploaded += @{ Role = $p.Role; Id = $id; File = $p.File }
}

Write-Host "`nWaiting for Act 1 (awaiting_certification)..."
foreach ($u in $uploaded) {
  Wait-Processing $u.Id "awaiting_certification" | Out-Null
}

Write-Host "`nAdmin certifying (Act 2)..."
foreach ($u in $uploaded) {
  Write-Host "Certify $($u.Role) $($u.Id)"
  Invoke-RestMethod -Uri "$BaseUrl/review/$($u.Id)/admin-approve" -Method POST -Headers $headers `
    -ContentType "application/json" -Body '{"comment":"Krones sample ingest"}' | Out-Null
}

Write-Host "`nWaiting for Act 2 (processing_complete)..."
foreach ($u in $uploaded) {
  Wait-Processing $u.Id "processing_complete" 1200 | Out-Null
}

Write-Host "`nDone. Uploaded:"
$uploaded | ForEach-Object { Write-Host "  $($_.Role) $($_.File) -> $($_.Id)" }
