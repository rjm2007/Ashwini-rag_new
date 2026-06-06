# Run T01-T10 against existing certified docs (run_003)
$ErrorActionPreference = "Stop"
$aiUrl = "http://localhost:8000"
$base = "http://localhost:3001"
$outFile = "C:\Users\rudra\Desktop\Waranty_POC\Planning\test_results_run_003.json"

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
        "T02" { return ($ev -ge 1 -and $a -match "u06" -and ($a -match "expir" -or $a -match "ended" -or $a -match "not (still )?valid" -or $a -match "no longer")) }
        "T03" { return ($ev -ge 2 -and $a -match "hac49" -and $docs -ge 2 -and $a -match "2023") }
        "T04" { return ($ev -ge 1 -and $a -match "18,?854") }
        "T05" { return ($ev -ge 1 -and $a -match "tow2" -and $a -match "2021" -and $a -notmatch "still covered") }
        "T06" { return ($ev -ge 1 -and ($a -match "u06b" -or $a -match "u13")) }
        "T07" { return ($ev -ge 1 -and ($a -match "20\d\d-\d\d") -and (([regex]::Matches($a, "u0|tow|hac|et\d|d00").Count -ge 3) -or $a -match "no (warranties|coverage)" -or $a -match "none (are|is|of)" -or $a -match "not active")) }
        "T08" { return ($ev -ge 2 -and $docs -ge 2 -and $a -match "u065" -and $a -match "2024" -and ($a -match "218364|1169")) }
        "T09" { return ($r.intent -eq "out_of_scope" -and $a -notmatch "\d+\s*psi") }
        "T10" { return ($ev -eq 0 -and $conf -le 0.35) }
        default { return $false }
    }
}

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

$results = @()
$passCount = 0
foreach ($item in $questions) {
    Write-Host "`n[$($item.id)] $($item.q)"
    $r = Ask-AI $item.q
    $pass = Score-Test $item.id $r
    if ($pass) { $passCount++ }
    Write-Host "  pass=$pass decision=$($r.coverageDecision) conf=$($r.confidence) evidence=$($r.evidenceCount) intent=$($r.intent)"
    Write-Host "  answer: $($r.answer.Substring(0, [Math]::Min(280, $r.answer.Length)))..."
    $results += @{
        id = $item.id
        question = $item.q
        answer = $r.answer
        coverageDecision = $r.coverageDecision
        confidence = $r.confidence
        evidenceCount = $r.evidenceCount
        evidenceDocumentIds = $r.evidenceDocumentIds
        intent = $r.intent
        latencyMs = $r.latencyMs
        pass = $pass
        notes = ""
    }
}

$output = @{
    test_run_id = "run_003"
    timestamp = (Get-Date -Format "yyyy-MM-ddTHH:mm:ss")
    documents_reprocessed = @(
        @{ documentId = "b815d50d-fd11-4be3-a178-a403f7ef8170"; filename = "1169 WARRENTY.pdf"; coverageCodesInSchema = 25 },
        @{ documentId = "5360f979-c1bb-4ea5-8e32-776bef9c33b8"; filename = "1168 WARRENTY.pdf"; coverageCodesInSchema = 25 },
        @{ documentId = "0d4746db-0115-4fc5-aeac-ce11e576c3b7"; filename = "1038 Warranty.pdf"; coverageCodesInSchema = 25 }
    )
    pass_count = $passCount
    pass_target = 8
    results = $results
}

$output | ConvertTo-Json -Depth 8 | Set-Content -Path $outFile -Encoding UTF8
Write-Host "`nDONE - $passCount/10 passed" -ForegroundColor Cyan
Write-Host "Results: $outFile"
