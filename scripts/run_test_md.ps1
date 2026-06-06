# run_test_md.ps1 - Execute Planning/test.md with current pipeline
# Upload -> Act 1 (auto parse) -> awaiting_certification -> admin-approve -> Act 2 -> processing_complete -> T01-T10

$ErrorActionPreference = "Stop"
$base = "http://localhost:3001"
$aiUrl = "http://localhost:8000"
$outFile = "C:\Users\rudra\Desktop\Waranty_POC\Planning\test_results_run_002.json"

function Write-Step($msg) { Write-Host "`n=== $msg ===" -ForegroundColor Cyan }

function Wait-DocumentStatus($docId, $targetStatuses, $token, $label, $maxMinutes = 20) {
    $deadline = (Get-Date).AddMinutes($maxMinutes)
    do {
        Start-Sleep -Seconds 8
        $doc = Invoke-RestMethod -Uri "$base/documents/$docId" -Headers @{ Authorization = "Bearer $token" }
        $status = $doc.processingStatus
        Write-Host "  [$label] status=$status requiredFieldsMissing=$($doc.requiredFieldsMissing) make=$($doc.make) model=$($doc.model)"
        if ($status -eq "failed") { throw "$label failed processing" }
        if ($status -in $targetStatuses) { return $doc }
        if ((Get-Date) -gt $deadline) { throw "$label timed out waiting for $($targetStatuses -join ',') (last=$status)" }
    } while ($true)
}

function Ingest-Pdf($path, $token, $label) {
    Write-Step "Upload $label"
    if (-not (Test-Path $path)) { throw "PDF not found: $path" }
    $uploadRaw = curl.exe -s -X POST "$base/documents/upload" `
        -H "Authorization: Bearer $token" `
        -F "file=@$path"
    $upload = $uploadRaw | ConvertFrom-Json
    if (-not $upload.documentId) { throw "Upload failed for $label : $uploadRaw" }
    $docId = $upload.documentId
    Write-Host "  documentId=$docId"

    Write-Host "  Waiting for Act 1 (awaiting_certification)..."
    $doc = Wait-DocumentStatus $docId @("awaiting_certification") $token $label 25

    Write-Step "Admin certify $label"
    Invoke-RestMethod -Method Post -Uri "$base/review/$docId/admin-approve" `
        -Headers @{ Authorization = "Bearer $token" } `
        -ContentType "application/json" `
        -Body (@{ comment = "test.md run" } | ConvertTo-Json) | Out-Null

    Write-Host "  Waiting for Act 2 (processing_complete)..."
    $doc = Wait-DocumentStatus $docId @("processing_complete") $token $label 30

    # Qdrant certified chunk count
    $qBody = @{
        filter = @{
            must = @(
                @{ key = "documentId"; match = @{ value = $docId } },
                @{ key = "repository"; match = @{ value = "certified" } }
            )
        }
    } | ConvertTo-Json -Depth 6
    $qCount = (Invoke-RestMethod -Method Post -Uri "http://localhost:6333/collections/warranty_chunks/points/count" `
        -ContentType "application/json" -Body $qBody).result.count
    Write-Host "  Qdrant certified chunks=$qCount"

    return @{ docId = $docId; doc = $doc; qdrantChunks = $qCount }
}

function Ask-AI($question) {
    $sw = [System.Diagnostics.Stopwatch]::StartNew()
    $body = @{ question = $question; conversationHistory = @() } | ConvertTo-Json -Depth 4
    $resp = Invoke-RestMethod -Method Post -Uri "$aiUrl/query/answer" -ContentType "application/json" -Body $body
    $sw.Stop()
    $evidence = @($resp.evidence)
    $docIds = @($evidence | ForEach-Object { $_.documentId } | Where-Object { $_ } | Select-Object -Unique)
    return @{
        answer = $resp.answer
        coverageDecision = $resp.coverageDecision
        confidence = [double]$resp.confidence
        evidenceCount = $evidence.Count
        evidenceDocumentIds = $docIds
        intent = $resp.intent
        latencyMs = [int]$sw.ElapsedMilliseconds
        filters = $resp.filters
    }
}

function Score-Test($id, $r) {
    $a = ($r.answer + "").ToLower()
    $ev = $r.evidenceCount
    $dec = $r.coverageDecision
    $conf = $r.confidence
    $docs = @($r.evidenceDocumentIds).Count
    switch ($id) {
        "T01" { return ($ev -ge 1 -and $a -match "u030" -and $a -match "72" -and $dec -ne "insufficient_evidence") }
        "T02" { return ($ev -ge 1 -and $a -match "u06" -and $a -match "2021" -and $a -notmatch "still (valid|covered|active)") }
        "T03" { return ($ev -ge 2 -and $a -match "hac49" -and $docs -ge 2 -and $a -match "2023") }
        "T04" { return ($ev -ge 1 -and $a -match "18,?854") }
        "T05" { return ($ev -ge 1 -and $a -match "tow2" -and $a -match "2021" -and $a -notmatch "still covered") }
        "T06" { return ($ev -ge 1 -and ($a -match "u06b" -or $a -match "u13")) }
        "T07" { return ($ev -ge 3 -and ([regex]::Matches($a, "u0|tow|hac").Count -ge 3) -and $a -notmatch "still active") }
        "T08" { return ($ev -ge 2 -and $docs -ge 2 -and $a -match "u065" -and $a -match "2024" -and ($a -match "218364|1169")) }
        "T09" { return ($r.intent -eq "out_of_scope" -and $a -notmatch "\d+\s*psi") }
        "T10" { return ($ev -eq 0 -and $conf -le 0.35) }
        default { return $false }
    }
}

# --- Pre-flight ---
Write-Step "Phase 0 - Pre-flight"
$aiCode = (Invoke-WebRequest "$aiUrl/health" -UseBasicParsing -TimeoutSec 15).StatusCode
$qdrantCode = (Invoke-WebRequest "http://localhost:6333/readyz" -UseBasicParsing -TimeoutSec 15).StatusCode
Write-Host "  $aiUrl/health -> $aiCode"
Write-Host "  qdrant/readyz -> $qdrantCode"
$login = Invoke-RestMethod -Method Post -Uri "$base/auth/login" -ContentType "application/json" `
    -Body (@{ email = "admin@demo.com"; password = "admin123" } | ConvertTo-Json)
$token = $login.token
Write-Host "  backend auth/login -> OK"

# --- Phase 1: Ingest ---
$pdfA = "C:\Users\rudra\Desktop\Waranty_POC\1169 WARRENTY.pdf"
$pdfB = "C:\Users\rudra\Desktop\Waranty_POC\1168 WARRENTY.pdf"
$pdfC = "C:\Users\rudra\Desktop\Waranty_POC\1038 Warranty.pdf"

$resA = Ingest-Pdf $pdfA $token "PDF-A"
$resB = Ingest-Pdf $pdfB $token "PDF-B"
$resC = Ingest-Pdf $pdfC $token "PDF-C"

# --- Phase 2: Chat session (backend) ---
Write-Step "Create chat session"
$userLogin = Invoke-RestMethod -Method Post -Uri "$base/auth/login" -ContentType "application/json" `
    -Body (@{ email = "user@demo.com"; password = "user123" } | ConvertTo-Json)
$userToken = $userLogin.token
$session = Invoke-RestMethod -Method Post -Uri "$base/query/sessions" `
    -Headers @{ Authorization = "Bearer $userToken" } -ContentType "application/json" `
    -Body (@{ title = "Test Run - 3 PDFs" } | ConvertTo-Json)
Write-Host "  sessionId=$($session.id)"

$questions = @(
    @{ id = "T01"; q = "What is the coverage for U030 (Frame and Crossmembers) for chassis 218364?" },
    @{ id = "T02"; q = "My truck (VIN 4V4NC9EH3LN218364) has 280,000 km on it. Is the standard engine warranty U06 still valid?" },
    @{ id = "T03"; q = "Compare the HVAC warranty (HAC49) between chassis 218364 (unit 1169) and chassis 218365 (unit 1168). Are the coverage periods the same?" },
    @{ id = "T04"; q = "What repair work was done on unit 1038 and what was the total invoice amount?" },
    @{ id = "T05"; q = "If unit 1169 (chassis 218364) has an engine failure today, is towing covered and for how long?" },
    @{ id = "T06"; q = "What GHG emission warranties exist for chassis 218365? List the coverage codes and periods." },
    @{ id = "T07"; q = "Which warranties for unit 1169 (VIN 4V4NC9EH3LN218364) are still active today?" },
    @{ id = "T08"; q = "Compare the U065 (Auto/Manual Transmission) warranty between unit 1038 (chassis 929394) and unit 1169 (chassis 218364). Which has a later expiry?" },
    @{ id = "T09"; q = "What is the recommended tire pressure for a Volvo VNL64T truck?" },
    @{ id = "T10"; q = "Is the alternator covered under warranty for a 2023 Peterbilt 389?" }
)

Write-Step "Phase 2 - T01-T10"
$results = @()
$passCount = 0
foreach ($item in $questions) {
    Write-Host "`n[$($item.id)] $($item.q)"
    $r = Ask-AI $item.q
    $pass = Score-Test $item.id $r
    if ($pass) { $passCount++ }
    Write-Host "  pass=$pass decision=$($r.coverageDecision) conf=$($r.confidence) evidence=$($r.evidenceCount) intent=$($r.intent)"
    Write-Host "  answer: $($r.answer.Substring(0, [Math]::Min(200, $r.answer.Length)))..."
    $results += @{
        id = $item.id
        question = $item.q
        answer = $r.answer
        coverageDecision = $r.coverageDecision
        confidence = $r.confidence
        evidenceCount = $r.evidenceCount
        coverageCodesInAnswer = @()
        evidenceDocumentIds = $r.evidenceDocumentIds
        intent = $r.intent
        latencyMs = $r.latencyMs
        pass = $pass
        notes = ""
    }
}

$output = @{
    test_run_id = "run_002"
    timestamp = (Get-Date -Format "yyyy-MM-ddTHH:mm:ss")
    sessionId = $session.id
    documents_ingested = @(
        @{ id = "PDF-A"; documentId = $resA.docId; filename = "1169 WARRENTY.pdf"; chassis = "218364"; vin = "4V4NC9EH3LN218364"; qdrantChunks = $resA.qdrantChunks },
        @{ id = "PDF-B"; documentId = $resB.docId; filename = "1168 WARRENTY.pdf"; chassis = "218365"; vin = "4V4NC9EH5LN218365"; qdrantChunks = $resB.qdrantChunks },
        @{ id = "PDF-C"; documentId = $resC.docId; filename = "1038 Warranty.pdf"; chassis = "929394"; vin = "4V4NC9EH9GN929394"; qdrantChunks = $resC.qdrantChunks }
    )
    pass_count = $passCount
    pass_target = 7
    results = $results
}

$output | ConvertTo-Json -Depth 8 | Set-Content -Path $outFile -Encoding UTF8

Write-Step "DONE - $passCount/10 passed (target >= 7)"
Write-Host "Results saved to $outFile"
