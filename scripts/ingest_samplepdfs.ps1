# ingest_samplepdfs.ps1 — Upload 4 acceptance PDFs from samplepdfs/ through full pipeline
$ErrorActionPreference = "Stop"
$base = "http://localhost:3001"
$aiUrl = "http://localhost:8000"
$sampleSrc = "C:\Users\rudra\Desktop\Waranty_POC\samplepdfs"
$sampleDst = Join-Path $PSScriptRoot "..\sample-docs"
New-Item -ItemType Directory -Force -Path $sampleDst | Out-Null

$pdfs = @(
    @{ label = "Volvo"; src = "1172 WARRENTY.pdf"; dst = "Volvo_1172.pdf" },
    @{ label = "Kenworth"; src = "md-warranty-and-extended-warranty-dec-2016-v2.pdf"; dst = "Kenworth_MD.pdf" },
    @{ label = "Headstart"; src = "Sample-HeavyDuty5-24.pdf"; dst = "Headstart_HDCT.pdf" },
    @{ label = "Premium2000"; src = "p2k-elite.pdf"; dst = "Premium2000_Elite.pdf" }
)

function Write-Step($msg) { Write-Host "`n=== $msg ===" -ForegroundColor Cyan }

function Wait-DocumentStatus($docId, $targetStatuses, $token, $label, $maxMinutes = 45) {
    $deadline = (Get-Date).AddMinutes($maxMinutes)
    do {
        Start-Sleep -Seconds 10
        $doc = Invoke-RestMethod -Uri "$base/documents/$docId" -Headers @{ Authorization = "Bearer $token" }
        $status = $doc.processingStatus
        Write-Host "  [$label] status=$status make=$($doc.make) coverage=$($doc.masterSchemaJson.coverage_components.Count)"
        if ($status -eq "failed") { throw "$label failed: $($doc.errorMessage)" }
        if ($status -in $targetStatuses) { return $doc }
        if ((Get-Date) -gt $deadline) { throw "$label timed out (last=$status)" }
    } while ($true)
}

function Ingest-Pdf($path, $token, $label) {
    Write-Step "Upload $label"
    if (-not (Test-Path $path)) { throw "PDF not found: $path" }
    $uploadRaw = curl.exe -s -X POST "$base/documents/upload" `
        -H "Authorization: Bearer $token" `
        -F "file=@$path"
    $upload = $uploadRaw | ConvertFrom-Json
    if (-not $upload.documentId) {
        if ($uploadRaw -match 'already exists \(id: ([a-f0-9-]+)') {
            $docId = $Matches[1]
            Write-Host "  reusing documentId=$docId"
        } else {
            throw "Upload failed for $label : $uploadRaw"
        }
    } else {
        $docId = $upload.documentId
        Write-Host "  documentId=$docId"
    }

    $doc = Wait-DocumentStatus $docId @("awaiting_certification") $token $label 40

    Write-Step "Admin certify $label"
    Invoke-RestMethod -Method Post -Uri "$base/review/$docId/admin-approve" `
        -Headers @{ Authorization = "Bearer $token" } `
        -ContentType "application/json" `
        -Body (@{ comment = "acceptance ingest" } | ConvertTo-Json) | Out-Null

    $doc = Wait-DocumentStatus $docId @("processing_complete") $token $label 50
    return @{ docId = $docId; doc = $doc; label = $label }
}

Write-Step "Copy PDFs to sample-docs"
foreach ($p in $pdfs) {
    $src = Join-Path $sampleSrc $p.src
    $dst = Join-Path $sampleDst $p.dst
    Copy-Item -Force $src $dst
    Write-Host "  $($p.label): $dst"
}

Write-Step "Pre-flight"
$null = Invoke-WebRequest "$aiUrl/health" -UseBasicParsing -TimeoutSec 15
$null = Invoke-WebRequest "http://localhost:6333/readyz" -UseBasicParsing -TimeoutSec 15
$login = Invoke-RestMethod -Method Post -Uri "$base/auth/login" -ContentType "application/json" `
    -Body (@{ email = "admin@demo.com"; password = "admin123" } | ConvertTo-Json)
$token = $login.token

$results = @()
foreach ($p in $pdfs) {
    $path = Join-Path $sampleDst $p.dst
    $results += Ingest-Pdf $path $token $p.label
}

$out = @{
    timestamp = (Get-Date -Format "yyyy-MM-ddTHH:mm:ss")
    documents = $results | ForEach-Object {
        @{
            label = $_.label
            documentId = $_.docId
            make = $_.doc.make
            coverageCount = @($_.doc.masterSchemaJson.coverage_components).Count
        }
    }
}
$outPath = Join-Path $PSScriptRoot "..\eval\ingest_samplepdfs_result.json"
$out | ConvertTo-Json -Depth 6 | Set-Content -Path $outPath -Encoding UTF8
Write-Step "DONE - $($results.Count) documents ingested"
Write-Host "Results: $outPath"
