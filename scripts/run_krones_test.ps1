# Krones golden-set chat eval (see Planning/kronos_test.md)
param(
  [string]$BaseUrl = "http://localhost:3001",
  [string]$OutFile = "..\..\krones-rag\eval\KRONES_TEST_RESULTS.md"
)

$ErrorActionPreference = "Stop"
$OutDir = Split-Path $OutFile -Parent
if (-not (Test-Path $OutDir)) { New-Item -ItemType Directory -Path $OutDir -Force | Out-Null }

# Login
$login = Invoke-RestMethod -Uri "$BaseUrl/auth/login" -Method POST -ContentType "application/json" `
  -Body '{"email":"admin@demo.com","password":"admin123"}'
$token = $login.accessToken
$headers = @{ Authorization = "Bearer $token" }

# Resolve doc IDs by filename substring (upload D1/D2/D3 first)
$docs = (Invoke-RestMethod -Uri "$BaseUrl/documents" -Headers $headers).data
$d1 = ($docs | Where-Object { $_.originalFilename -match "handbook|1169" } | Select-Object -First 1).id
$d2 = ($docs | Where-Object { $_.originalFilename -match "LTSD|ltsd" } | Select-Object -First 1).id
$d3 = ($docs | Where-Object { $_.originalFilename -match "ticket|SRSM" } | Select-Object -First 1).id

function Ask-Doc($docId, $question) {
  $sess = Invoke-RestMethod -Uri "$BaseUrl/query/sessions" -Method POST -Headers $headers `
    -ContentType "application/json" -Body (@{ title = "Krones test" } | ConvertTo-Json)
  $msg = Invoke-RestMethod -Uri "$BaseUrl/query/sessions/$($sess.id)/messages" -Method POST -Headers $headers `
    -ContentType "application/json" -Body (@{ content = $question; documentId = $docId } | ConvertTo-Json)
  return $msg
}

$tests = @(
  @{ Id = "H1"; Doc = $d1; Q = "What quality management standard does Krones require?"; Expect = "ISO 9001" },
  @{ Id = "H12"; Doc = $d1; Q = "What is the warranty coverage period for the engine?"; ExpectStatus = "not_in_document" },
  @{ Id = "H13"; Doc = $d1; Q = "What does this warranty cover?"; ExpectStatus = "not_in_document"; NoClarify = $true },
  @{ Id = "N1"; Doc = $d1; Q = "hi"; ExpectGreeting = $true },
  @{ Id = "N4"; Doc = $d1; Q = "What does this cover?"; ExpectStatus = "not_in_document"; NoClarify = $true }
)

$lines = @("# Krones Test Results", "", "| Q# | pass | status | evidence | notes |", "|----|------|--------|----------|-------|")

foreach ($t in $tests) {
  if (-not $t.Doc) {
    $lines += "| $($t.Id) | skip | - | - | document not in DB |"
    continue
  }
  $ans = Ask-Doc $t.Doc $t.Q
  $content = $ans.content
  $status = $ans.coverageDecision
  $evCount = @($ans.evidenceJson).Count
  $pass = $true
  $notes = @()
  if ($t.Expect -and $content -notmatch $t.Expect) { $pass = $false; $notes += "missing expected fact" }
  if ($t.ExpectStatus -and $status -ne $t.ExpectStatus) { $pass = $false; $notes += "status=$status" }
  if ($t.NoClarify -and $content -match "which vehicle|which warranty document") { $pass = $false; $notes += "warranty clarification bug" }
  if ($t.ExpectGreeting -and $content -notmatch "Krones|Hi") { $pass = $false; $notes += "not a greeting" }
  $lines += "| $($t.Id) | $(if ($pass) {'pass'} else {'FAIL'}) | $status | $evCount | $($notes -join '; ') |"
}

$lines | Set-Content -Path $OutFile -Encoding utf8
Write-Host "Wrote $OutFile"
