# Krones golden-set chat eval (see Planning/kronos_test.md)
param(
  [string]$BaseUrl = "http://localhost:3001",
  [string]$OutFile = "..\..\krones-rag\eval\KRONES_TEST_RESULTS.md"
)

$ErrorActionPreference = "Stop"
$OutDir = Split-Path $OutFile -Parent
if (-not (Test-Path $OutDir)) { New-Item -ItemType Directory -Path $OutDir -Force | Out-Null }

$login = Invoke-RestMethod -Uri "$BaseUrl/auth/login" -Method POST -ContentType "application/json" `
  -Body '{"email":"admin@demo.com","password":"admin123"}'
$token = $login.token
if (-not $token) { $token = $login.accessToken }
$headers = @{ Authorization = "Bearer $token" }

$docs = (Invoke-RestMethod -Uri "$BaseUrl/documents" -Headers $headers).data
$kronesDocs = @($docs | Where-Object { $_.documentType -eq "krones_supplier_doc" -and $_.currentRepository -eq "certified" })
$d1 = ($kronesDocs | Where-Object { $_.originalFilename -match "Supplier_Handbook|handbook" } | Select-Object -First 1).id
$d2 = ($kronesDocs | Where-Object { $_.originalFilename -match "supplier_declaratoin|LTSD|ltsd|Declaration" } | Select-Object -First 1).id
$d3 = ($kronesDocs | Where-Object { $_.originalFilename -match "Jira_information|ticket|SRSM" } | Select-Object -First 1).id

function Ask-Doc($docId, $question) {
  $sess = Invoke-RestMethod -Uri "$BaseUrl/query/sessions" -Method POST -Headers $headers `
    -ContentType "application/json" -Body (@{ title = "Krones test" } | ConvertTo-Json)
  return Invoke-RestMethod -Uri "$BaseUrl/query/sessions/$($sess.id)/messages" -Method POST -Headers $headers `
    -ContentType "application/json" -Body (@{ content = $question; documentId = $docId } | ConvertTo-Json)
}

$tests = @(
  @{ Id = "H1"; Doc = $d1; Q = "What quality management standard does Krones require?"; Expect = "9001" },
  @{ Id = "H2"; Doc = $d1; Q = "How long must a supplier archive quality records?"; Expect = "five|5 year" },
  @{ Id = "H3"; Doc = $d1; Q = "How much advance notice is required before discontinuing a product?"; Expect = "twelve|12 month" },
  @{ Id = "H4"; Doc = $d1; Q = "What are the supplier assessment (QPI) bands?"; Expect = "90" },
  @{ Id = "H5"; Doc = $d1; Q = "Which packaging materials are not permitted from 2025?"; Expect = "foam|bubble" },
  @{ Id = "H6"; Doc = $d1; Q = "Is delivery time counted in working days or calendar days?"; Expect = "calendar|7-day" },
  @{ Id = "H7"; Doc = $d1; Q = "What's the deadline to implement corrective measures after a notice of defects?"; Expect = "14" },
  @{ Id = "H8"; Doc = $d1; Q = "What reports can Krones require for a notice of defects?"; Expect = "4D|8D" },
  @{ Id = "H9"; Doc = $d1; Q = "Which certificate standard applies to acceptance test certificates?"; Expect = "10204" },
  @{ Id = "H10"; Doc = $d1; Q = "By when must packaging move to reusable/recyclable?"; Expect = "2028" },
  @{ Id = "H11"; Doc = $d1; Q = "Name the three ESG pillars Krones requires suppliers to address."; Expect = "Environmental|Social|Governance" },
  @{ Id = "H12"; Doc = $d1; Q = "What is the warranty coverage period for the engine?"; ExpectStatus = "not_in_document" },
  @{ Id = "H13"; Doc = $d1; Q = "What does this warranty cover?"; ExpectStatus = "not_in_document"; NoClarify = $true },
  @{ Id = "L1"; Doc = $d2; Q = "Why is submitting an LTSD important?"; Expect = "preferential|origin" },
  @{ Id = "L2"; Doc = $d2; Q = 'Can I put "EU" as the country of origin?'; Expect = "specific|ISO|not allowed" },
  @{ Id = "L3"; Doc = $d2; Q = "Where do I send the signed original LTSD?"; Expect = "Debrecen|Hungary|post" },
  @{ Id = "L4"; Doc = $d2; Q = "Who can I contact about the LTSD?"; Expect = "krones.hu|Szőllősi|Szendrei" },
  @{ Id = "L5"; Doc = $d2; Q = "Where do I mark that goods qualify for preferential status?"; Expect = "left|qualif" },
  @{ Id = "L6"; Doc = $d2; Q = "I need to change one field on a submitted LTSD - what do I do?"; Expect = "revoke|new" },
  @{ Id = "L7"; Doc = $d2; Q = "What's the validity period of an LTSD?"; Expect = "24|12 month" },
  @{ Id = "L8"; Doc = $d2; Q = "What is Krones' QPI scoring?"; ExpectStatus = "not_in_document" },
  @{ Id = "T1"; Doc = $d3; Q = "How do I register for the Supplier Requests Service Management portal?"; Expect = "srsm-jira.registration@krones.com" },
  @{ Id = "T2"; Doc = $d3; Q = "Which email address did the ticket system replace?"; Expect = "supplier.request@krones.com" },
  @{ Id = "T3"; Doc = $d3; Q = "How many request types exist and in how many categories?"; Expect = "13|three" },
  @{ Id = "T4"; Doc = $d3; Q = "How do I submit a material certificate?"; Expect = "portal|material certificate" },
  @{ Id = "T5"; Doc = $d3; Q = "What is the portal URL?"; Expect = "atlassian.net/servicedesk" },
  @{ Id = "T6"; Doc = $d3; Q = "How do I keep a ticket covered while I'm on leave?"; Expect = "Share|substitute|Jira" },
  @{ Id = "T7"; Doc = $d3; Q = "What does a ticket number look like?"; Expect = "SRSM" },
  @{ Id = "T8"; Doc = $d3; Q = "What's the main advantage of the ticket system?"; Expect = "submission|complete|email" },
  @{ Id = "T9"; Doc = $d3; Q = "What packaging is banned from 2025?"; ExpectStatus = "not_in_document" },
  @{ Id = "N1"; Doc = $d1; Q = "hi"; ExpectGreeting = $true },
  @{ Id = "N4"; Doc = $d1; Q = "What does this cover?"; ExpectStatus = "not_in_document"; NoClarify = $true }
)

$lines = @(
  "# Krones Test Results",
  "",
  "Run: $(Get-Date -Format 'yyyy-MM-dd HH:mm') | API: $BaseUrl",
  "",
  "D1=$d1 | D2=$d2 | D3=$d3",
  "",
  "| Q# | pass | status | evidence | notes |",
  "|----|------|--------|----------|-------|"
)

$passCount = 0
$runCount = 0
foreach ($t in $tests) {
  if (-not $t.Doc) {
    $lines += "| $($t.Id) | skip | - | - | Krones document not in DB (upload D1/D2/D3 as krones_supplier_doc) |"
    continue
  }
  $runCount++
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
  if ($pass) { $passCount++ }
  $lines += "| $($t.Id) | $(if ($pass) {'pass'} else {'FAIL'}) | $status | $evCount | $($notes -join '; ') |"
}

$lines += ""
$lines += "**Summary:** $passCount / $runCount executed (rest skipped - upload Krones PDFs to run full suite)"
$lines | Set-Content -Path $OutFile -Encoding utf8
Write-Host "Wrote $OutFile ($passCount/$runCount passed)"
