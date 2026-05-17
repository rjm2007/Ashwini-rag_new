# RUN_TEST — Upload `Freightliner_Cascadia_2023_Warranty_Manual.pdf` end-to-end with full logging

This runbook walks through:

1. Confirming all five services are up
2. Streaming **every container log to a file** so we can read the entire pipeline after the run
3. Uploading the PDF, triggering processing, approving, and asking a question
4. Where to look for each step in the captured log

The PDF you want to upload is at:

```
C:\Users\rudra\Desktop\Waranty_POC\pdf\Freightliner_Cascadia_2023_Warranty_Manual.pdf
```

> All commands below assume you are in `c:\Users\rudra\Desktop\Waranty_POC\warranty-platform` in PowerShell, unless said otherwise.

---

## What was changed in code (so you know what new logs to expect)

1. **AI service – new endpoint:** `POST /internal/set-repository/{document_id}` with body `{"repository":"certified|reviewer_approved|rejected|pending_review"}`. It flips the `repository` payload on every Qdrant chunk that belongs to that document and returns how many chunks were touched.
2. **AI service – fixed `qdrant_service.update_repository`:** the old call passed `points=[]` and a separate `filter=` argument which the qdrant-client API does not accept. Now uses a Filter as the `points` selector and reads back the count.
3. **AI service – fixed `qdrant_service.search`:** old code called `client.search()` (removed in qdrant-client 1.18) and passed every filter value into `MatchValue` (which only accepts str/int/bool, breaking on dict ranges and floats). Now uses `client.query_points()`, restricts to known filter keys (`make`, `model`, `year`, `country`, `warrantyType`), and only forwards scalar values.
4. **AI service – real OCR:** `TextractService` was a hardcoded stub returning 58 chars of fake text. Now it tries AWS Textract async (`StartDocumentTextDetection` → poll `GetDocumentTextDetection`) and falls back to in-process `pypdf` for text-based PDFs. Both paths log every step.
5. **AI service – pipeline now updates `s3_path` in Postgres** when the file is moved from `private-session/` to `pending-review/`. Without this, admin-approve later tried to move from a stale path and got `NoSuchKey`.
6. **AI service – LLM service is tolerant of newer reasoning models:** if a model rejects a custom `temperature`, the call retries once without it. Logs the retry warning.
7. **Backend – `ReviewService` now actually flips Qdrant tags:**
   - `reviewerApprove` → flips Qdrant chunks to `reviewer_approved`
   - `adminApprove` → flips Qdrant chunks to `certified` (this was the bug: chat couldn't find approved docs because chunks stayed at `pending_review`)
   - `reject` → flips Qdrant chunks to `rejected`
8. **Backend – `DocumentEntity.currentRepository`** now also accepts `reviewer_approved` (added to enum).
9. **Backend – Logger added** to `DocumentsService.uploadDocument` and every method in `ReviewService` so each S3, Postgres, SQS, and Qdrant step shows a log line with the document id.
10. **Backend – `QueryService.sendMessage` is hardened:** if the AI service is unreachable or returns non-JSON, the chat now returns a clean error message instead of crashing the request handler. Each step is logged.

### Verified end-to-end with the Freightliner manual

A real run with `Freightliner_Cascadia_2023_Warranty_Manual.pdf` produced:

- 11 pages OCR'd, 15,044 chars of real text
- Make/model/year correctly extracted
- 5 chunks embedded and stored in Qdrant
- Reviewer + admin approval each flipped 5 chunks to the next repository tag
- A chat question (*"What does the Freightliner Cascadia 2023 powertrain warranty cover?"*) returned a citation-laced answer at confidence 0.9

---

## 0. Confirm services are up

```powershell
docker compose ps
```

You should see all five `Up`:
  
- `warranty-postgres`
- `warranty-qdrant`
- `warranty-ai-service`
- `warranty-backend`
- `warranty-frontend`

If any is missing, `docker compose up -d` and re-check.

---

## 1. Open TWO PowerShell windows

You will use:

- **Terminal A — log capture.** Creates a **new folder per run** under `logs/runs/` (one file per service + `combined.log`). See `logs/README.md` for the full layout.
- **Terminal B — driver.** Runs the upload + curl commands.

### Terminal A — start per-run log capture

```powershell
cd c:\Users\rudra\Desktop\Waranty_POC\warranty-platform
.\scripts\Start-RunLogs.ps1
# Optional: name the folder after the document id once you have it:
# .\scripts\Start-RunLogs.ps1 -DocumentId "<paste-document-id-here>"
```

This creates something like:

```
logs/runs/2026-05-16_12-30-00_run/
  manifest.json
  ai-service.log
  backend.log
  frontend.log
  postgres.log
  qdrant.log
  combined.log
```

Leave Terminal A open until the test finishes, then run:

```powershell
.\scripts\Stop-RunLogs.ps1
```

The AI service also mirrors logs to `logs/services/ai-service/app.log` while Docker is running (rotating file, survives short restarts).

---

## 2. Terminal B — drive the test

### 2a. Log in as admin and grab a JWT

```powershell
$base = "http://localhost:3001"

$login = Invoke-RestMethod -Method Post -Uri "$base/auth/login" `
  -ContentType "application/json" `
  -Body (@{ email = "admin@demo.com"; password = "admin123" } | ConvertTo-Json)

$token = $login.token
"Got admin token: $($token.Substring(0,40))..."
```

Expected line in `logs/runs/<run-folder>/backend.log` or `combined.log`:

```
[Nest] ... POST /auth/login ...
```

### 2b. Upload the Freightliner PDF

`Invoke-RestMethod` in Windows PowerShell 5.1 does not support `-Form`, and PowerShell mangles inline JSON sent through curl with `-d`. Use `curl.exe` for the multipart upload, and write JSON request bodies to small files when needed.

```powershell
$pdf = "C:\Users\rudra\Desktop\Waranty_POC\pdf\Freightliner_Cascadia_2023_Warranty_Manual.pdf"

$uploadJson = & curl.exe -s -X POST "$base/documents/upload" `
  -H "Authorization: Bearer $token" `
  -F "file=@$pdf"

$uploadJson
$documentId = ($uploadJson | ConvertFrom-Json).documentId
"Uploaded documentId = $documentId"
```

Expected lines in your run logs (`logs/runs/<run-folder>/`) (backend, our new logs):

```
DocumentsService uploadDocument start documentId=<id> userId=<uid> filename="Freightliner_Cascadia_2023_Warranty_Manual.pdf" sizeBytes=219... mime=application/pdf
DocumentsService uploadDocument s3 put -> private-session/<id>/original.pdf
DocumentsService uploadDocument s3 put done documentId=<id>
DocumentsService uploadDocument postgres row created documentId=<id>
DocumentsService uploadDocument sqs enqueued documentId=<id>     # OR a "SQS_QUEUE_URL not set" warning
DocumentsService uploadDocument done documentId=<id>
```

> If the **dummy SQS URL** in `.env` causes the enqueue to fail, you will see an `uploadDocument sqs enqueue failed` line and we will trigger processing manually in step 2c. The upload itself will still succeed.

### 2c. Trigger AI processing for this document

```powershell
Invoke-RestMethod -Method Post -Uri "http://localhost:8000/internal/process/$documentId"
```

Expected lines in your run logs (`logs/runs/<run-folder>/`) (ai-service — our pipeline logger), in order:

```
pipeline :: [<id>] STEP 1/6 OCR start (s3=private-session/<id>/original.pdf)
pipeline :: [<id>] STEP 1/6 OCR done (pages=N)
pipeline :: [<id>] STEP 2/6 Metadata extraction start
src.services.llm_service :: LLM call model=gpt-4o-mini ...
pipeline :: [<id>] STEP 2/6 Metadata extracted (make=Freightliner model=Cascadia year=2023 text_chars=...)
pipeline :: [<id>] STEP 3/6 DB metadata update done
pipeline :: [<id>] STEP 4/6 Chunking start
pipeline :: [<id>] STEP 4/6 Chunked into N pieces
pipeline :: [<id>] STEP 5/6 Embedding N chunks
pipeline :: [<id>] STEP 5/6 Embedded N vectors
pipeline :: [<id>] STEP 6/6 Upserted N chunks into Qdrant
pipeline :: [<id>] DONE pipeline complete -> ready_for_review
```

> If **Step 1** errors out, it almost always means AWS Textract creds in `.env` are missing/invalid. The `FAILED pipeline error: ...` line will tell you which AWS call failed.

### 2d. Confirm the document hit `ready_for_review`

```powershell
$doc = Invoke-RestMethod -Method Get -Uri "$base/documents/$documentId" -Headers @{ Authorization = "Bearer $token" }
$doc | Select-Object id, originalFilename, processingStatus, currentRepository, make, model, year
```

Expected:

```
processingStatus  : ready_for_review
currentRepository : pending_review
make              : Freightliner
model             : Cascadia
year              : 2023
```

### 2e. Confirm chunks landed in Qdrant with `repository = pending_review`

```powershell
$body = @{
  filter = @{ must = @( @{ key = "documentId"; match = @{ value = $documentId } } ) }
  exact  = $true
} | ConvertTo-Json -Depth 10

Invoke-RestMethod -Method Post -Uri "http://localhost:6333/collections/warranty_chunks/points/count" -ContentType "application/json" -Body $body
```

You should get something like `{ "result": { "count": N } }` where N matches the chunk count from the pipeline log.

### 2f. Reviewer approves

```powershell
$reviewerLogin = Invoke-RestMethod -Method Post -Uri "$base/auth/login" `
  -ContentType "application/json" `
  -Body (@{ email = "reviewer@demo.com"; password = "reviewer123" } | ConvertTo-Json)
$reviewerToken = $reviewerLogin.token

# Write the JSON body to a file so curl doesn't have to deal with PowerShell quoting.
'{"comment":"Looks good"}' | Out-File -Encoding ascii -FilePath rev_body.json
& curl.exe -s -X POST "$base/review/$documentId/reviewer-approve" `
  -H "Authorization: Bearer $reviewerToken" `
  -H "Content-Type: application/json" `
  --data "@rev_body.json"
Remove-Item rev_body.json
```

Expected lines in your run logs (`logs/runs/<run-folder>/`) (backend, our new logs):

```
ReviewService reviewerApprove start documentId=<id> userId=<reviewerUid>
ReviewService reviewerApprove postgres saved documentId=<id> finalStatus=reviewer_approved
ReviewService Qdrant flip request -> http://ai-service:8000/internal/set-repository/<id> repository=reviewer_approved
ReviewService Qdrant flip ok documentId=<id> repository=reviewer_approved response={"status":"ok",...,"updatedChunks":N}
ReviewService reviewerApprove done documentId=<id>
```

And on the ai-service side:

```
src.api.routes :: [set-repository] documentId=<id> -> repository=reviewer_approved
src.api.routes :: [set-repository] documentId=<id> repository=reviewer_approved updatedChunks=N
```

### 2g. Admin final-approves (this is where the old bug was)

```powershell
'{"comment":"Certified"}' | Out-File -Encoding ascii -FilePath admin_body.json
& curl.exe -s -X POST "$base/review/$documentId/admin-approve" `
  -H "Authorization: Bearer $token" `
  -H "Content-Type: application/json" `
  --data "@admin_body.json"
Remove-Item admin_body.json
```

Expected lines in your run logs (`logs/runs/<run-folder>/`):

```
ReviewService adminApprove start documentId=<id> ...
ReviewService adminApprove moving s3 pending-review/<id>/original.pdf -> certified/USA/Freightliner/Cascadia/2023/<id>/original.pdf
ReviewService adminApprove documents row updated to certified documentId=<id>
ReviewService adminApprove reviews row updated documentId=<id> finalStatus=certified
ReviewService Qdrant flip request -> http://ai-service:8000/internal/set-repository/<id> repository=certified
ReviewService Qdrant flip ok documentId=<id> repository=certified response={"status":"ok",...,"updatedChunks":N}
ReviewService adminApprove done documentId=<id>
```

Verify Qdrant tags really flipped:

```powershell
$body = @{
  filter = @{ must = @(
    @{ key = "documentId"; match = @{ value = $documentId } },
    @{ key = "repository"; match = @{ value = "certified" } }
  ) }
  exact  = $true
} | ConvertTo-Json -Depth 10
Invoke-RestMethod -Method Post -Uri "http://localhost:6333/collections/warranty_chunks/points/count" -ContentType "application/json" -Body $body
```

`count` should equal the number of chunks for the document. That's the bug fix proven.

### 2h. Ask a chat question as a regular user

```powershell
$userLogin = Invoke-RestMethod -Method Post -Uri "$base/auth/login" `
  -ContentType "application/json" `
  -Body (@{ email = "user@demo.com"; password = "user123" } | ConvertTo-Json)
$userToken = $userLogin.token

'{"title":"Freightliner test"}' | Out-File -Encoding ascii -FilePath sb.json
$session = & curl.exe -s -X POST "$base/query/sessions" `
  -H "Authorization: Bearer $userToken" `
  -H "Content-Type: application/json" `
  --data "@sb.json" | ConvertFrom-Json
$sessionId = $session.id

'{"content":"What does the Freightliner Cascadia 2023 powertrain warranty cover?"}' |
  Out-File -Encoding ascii -FilePath qb.json
$answer = & curl.exe -s --max-time 120 -X POST "$base/query/sessions/$sessionId/messages" `
  -H "Authorization: Bearer $userToken" `
  -H "Content-Type: application/json" `
  --data "@qb.json"

Remove-Item sb.json, qb.json
$answer
```

Expected lines in your run logs (`logs/runs/<run-folder>/`) (ai-service):

```
src.query.intent_classifier :: classified intent=warranty_question
src.query.metadata_filter :: extracted hints make=Freightliner model=Cascadia year=2023
src.query.retriever :: qdrant search topK=... filters=... hits=N
src.query.reasoner :: LLM reasoning model=gpt-... evidence_chunks=N
```

If `hits=0`, the `repository=certified` filter found nothing — meaning the bug fix did not flip Qdrant. Check the lines from step 2g.

---

## 3. Stop the log streamer

Once the test is done, in **Terminal A** run `.\scripts\Stop-RunLogs.ps1`. The full trace is in `logs/runs/<run-folder>/`. Open `combined.log` and search for the document id to follow one document end-to-end.

---

## 4. Quick reference: which container does which thing

| Action                                  | Container that logs it | Log marker to grep |
| --------------------------------------- | ---------------------- | ------------------ |
| User login                              | backend                | `POST /auth/login` |
| File upload to S3 + DB row + SQS        | backend                | `DocumentsService uploadDocument` |
| Manual processing trigger               | ai-service             | `POST /internal/process/` |
| OCR / extract / chunk / embed / Qdrant  | ai-service             | `STEP 1/6` … `STEP 6/6` |
| Reviewer approve                        | backend + ai-service   | `reviewerApprove`, `[set-repository]` |
| Admin approve                           | backend + ai-service   | `adminApprove`, `[set-repository] ... certified` |
| Chat question                           | backend + ai-service   | `POST /query/answer`, `intent_classifier`, `retriever` |

---

## 5. If something fails — paste me the relevant 30 lines

After running, do this in any terminal:

```powershell
$runDir = Get-Content .\logs\runs\latest.txt
Select-String -Path "$runDir\combined.log" -Pattern "<documentId>" | Select-Object -Last 80
```

…and paste the output. Because every line is tagged with the document id, this gives me a full per-document trace.
