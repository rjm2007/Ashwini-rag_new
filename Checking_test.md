# Checking & Testing Guide (for absolute beginners)

This file shows you, step by step, how to test the warranty platform after it is running. Every step is explained in plain language. Run all commands in **PowerShell** from inside `c:\Users\rudra\Desktop\Waranty_POC\warranty-platform`.

---

## Part 1 — Is everything running?

Before testing anything, make sure all 5 containers are alive.

```powershell
docker compose ps
```

You should see all 5 with status **`Up`**:

| Container             | Port     | What it is                                  |
|-----------------------|----------|---------------------------------------------|
| `warranty-frontend`   | 3000     | The website you use in the browser          |
| `warranty-backend`    | 3001     | The main API (login, upload, review, chat)  |
| `warranty-ai-service` | 8000     | Does OCR, embedding, and answers questions  |
| `warranty-postgres`   | 5432     | The database                                |
| `warranty-qdrant`     | 6333     | The vector database (stores doc embeddings) |

Quick health pings (each should print `200` or some JSON):

```powershell
(Invoke-WebRequest http://localhost:3000        -UseBasicParsing).StatusCode  # frontend
(Invoke-WebRequest http://localhost:3001/health -UseBasicParsing).StatusCode  # backend (optional)
(Invoke-WebRequest http://localhost:8000/health -UseBasicParsing).StatusCode  # AI service
(Invoke-WebRequest http://localhost:6333/readyz -UseBasicParsing).StatusCode  # Qdrant
```

If any of these fail, run `docker compose up -d` again and re-check.

---

## Part 2 — URLs and demo accounts

Everyone uses the **same website**: `http://localhost:3000`.
What they see depends on which account they log in with.

| Role         | Login email             | Password       | Where they go after login            |
|--------------|--------------------------|----------------|---------------------------------------|
| Admin        | `admin@demo.com`         | `admin123`     | Can upload + final-approve + see all  |
| Reviewer     | `reviewer@demo.com`      | `reviewer123`  | Sees the review queue                 |
| User         | `user@demo.com`          | `user123`      | Can only use chat                     |

Useful URLs:

| Page              | URL                                          | Who uses it     |
|-------------------|----------------------------------------------|-----------------|
| Login             | `http://localhost:3000`                      | Everyone        |
| Dashboard         | `http://localhost:3000/dashboard`            | Everyone        |
| Upload PDF        | `http://localhost:3000/upload`               | Admin           |
| All documents     | `http://localhost:3000/documents`            | Admin/Reviewer  |
| One document      | `http://localhost:3000/documents/<id>`       | Admin/Reviewer  |
| Review queue      | `http://localhost:3000/review`               | Reviewer/Admin  |
| Review one doc    | `http://localhost:3000/review/<id>`          | Reviewer/Admin  |
| Chat list         | `http://localhost:3000/chat`                 | User            |
| One chat session  | `http://localhost:3000/chat/<sessionId>`     | User            |

Backend API base: `http://localhost:3001`
AI service base: `http://localhost:8000`

---

## Part 3 — The full end-to-end test

This is the happy path: upload a PDF as admin, approve it as reviewer, certify it as admin, then ask a question as user.

### Step A. Log in as admin and upload a PDF

1. Open `http://localhost:3000`
2. Log in with `admin@demo.com` / `admin123`
3. Go to `http://localhost:3000/upload`
4. Pick any warranty PDF (a small one is fine for testing)
5. Click **Upload**

You should see a success message. Behind the scenes the backend has:

- Saved the PDF to S3 at `private-session/<documentId>/original.pdf`
- Created a row in the `documents` table with status `uploaded`
- Sent a message to SQS so the AI service starts processing

### Step B. Check the document is being processed

Open `http://localhost:3000/documents` — your new PDF should appear with a status.

The status moves through these stages automatically:

```
uploaded
  → ocr_in_progress       (Textract is reading the PDF)
  → extraction_in_progress (LLM is pulling out make/model/year/coverage)
  → extraction_complete    (metadata saved)
  → ready_for_review       (now reviewer can act on it)
```

If status stays on `uploaded` and never moves, jump to Part 7 (Troubleshooting → SQS).

You can also manually trigger processing without SQS:

```powershell
$docId = "PASTE_DOCUMENT_ID_HERE"
curl.exe -X POST "http://localhost:8000/internal/process/$docId"
```

### Step C. Approve as reviewer

1. Log out (or open a private window)
2. Log in with `reviewer@demo.com` / `reviewer123`
3. Go to `http://localhost:3000/review`
4. Click your document → check the extracted metadata (make, model, year, country, warranty type)
5. Click **Reviewer Approve**

Now the doc moves to repository `reviewer_approved`.

### Step D. Final approve as admin

1. Log back in as admin
2. Go to `http://localhost:3000/review`
3. Click your document → **Admin Approve**

Status becomes `certified` (the document is now searchable by users).
Behind the scenes the AI service updates every Qdrant chunk for this document to `repository: certified`.

### Step E. Ask a question as user

1. Log in as `user@demo.com` / `user123`
2. Go to `http://localhost:3000/chat`
3. Start a new session, ask something like *"Is engine failure covered for a 2022 Toyota Camry?"*
4. The user’s app calls the backend → backend calls the AI service → AI service returns an answer with citations

---

## Part 4 — What happens after upload (behind the scenes)

```
You click Upload
       │
       ▼
Backend (Nest) saves PDF in S3, row in Postgres, sends SQS message
       │
       ▼
AI service (FastAPI) is listening on SQS, picks up the message
       │
       ├─► (1) Textract OCR  ─►  S3: ocr-output/<id>/ocr.json
       ├─► (2) LLM extracts metadata (make/model/year/warranty type)
       │       └► saves to Postgres + S3: extracted-text/<id>/text.json
       ├─► (3) Splits text into small chunks
       ├─► (4) Calls OpenAI to make a vector for each chunk
       ├─► (5) Stores vectors in Qdrant with repository = "pending_review"
       └─► (6) Moves PDF in S3 to pending-review/<id>/original.pdf,
                marks Postgres row as "ready_for_review"
```

Then:

```
Reviewer Approve  → Qdrant chunks repo = "reviewer_approved"
Admin Approve     → Qdrant chunks repo = "certified"  (now usable by chat)
Reject            → document marked rejected, chunks not used in chat
```

---

## Part 5 — Where to check what

### Container logs (see what each service is doing live)

```powershell
docker logs -f warranty-backend       # see API calls hitting backend
docker logs -f warranty-ai-service    # see OCR / embedding / chat work
docker logs -f warranty-postgres
docker logs -f warranty-qdrant
```

Press `Ctrl+C` to stop following.

### Postgres — look at your document’s row

```powershell
docker exec -it warranty-postgres psql -U warranty_user -d warranty
```

Inside psql:

```sql
\x on
SELECT id, original_filename, processing_status, current_repository,
       make, model, year, warranty_type, error_message
FROM documents
ORDER BY uploaded_at DESC
LIMIT 5;
\q
```

This is the **fastest way** to see if your doc was processed and what status it’s in.

### Qdrant — count vectors / browse collections

Open in browser: `http://localhost:6333/dashboard` — Qdrant has a built-in UI.
Or:

```powershell
(Invoke-WebRequest http://localhost:6333/collections -UseBasicParsing).Content
(Invoke-WebRequest http://localhost:6333/collections/warranty_chunks -UseBasicParsing).Content
```

After Step B above, you should see `warranty_chunks` with `points_count` > 0.

### S3 — see what was stored

Use AWS Console (S3 → bucket `warranty-platform-poc`). You should see folders:

```
private-session/<id>/original.pdf        ← right after upload
ocr-output/<id>/ocr.json                 ← after OCR
extracted-text/<id>/text.json            ← after extraction
processing-artifacts/<id>/metadata.json  ← extracted metadata
pending-review/<id>/original.pdf         ← after move (ready for review)
```

---

## Part 6 — How a chat question is answered (step-by-step)

When the user types a question, this is what runs:

```
1. Browser → POST /query/sessions/<id>/messages  (backend)
2. Backend forwards to AI service: POST /query/answer
3. AI service does the following:
   a. Intent classifier (small model): is the question warranty-related?
   b. Metadata extractor: pull make/model/year hints out of the question
      and recent chat history
   c. Embed the question into a vector (OpenAI embedding)
   d. Qdrant search:
        - filter: repository = "certified"
        - extra filters: matching make / model / year / country if present
        - returns the top-K most relevant chunks
   e. Reasoner (large model, currently gpt-5.5):
        - given ONLY those chunks as evidence,
        - produce a JSON with answer + which chunks were used
          + a coverage decision + confidence scores
4. AI service returns this JSON to the backend
5. Backend saves the chat message and returns it to the browser
6. Browser shows the answer with citations (which clause was used)
```

Important: the answer only uses **certified** documents. Anything stuck in `pending_review` or `reviewer_approved` is ignored. That is by design — users can never see content from a doc that hasn’t been fully approved.

---

## Part 7 — Troubleshooting

### "Doc stays in `uploaded` forever / never moves to `ready_for_review`"

Most likely cause: SQS is not configured (your `.env` still has the placeholder
`https://sqs.us-east-1.amazonaws.com/123456789012/warranty-processing-queue`).
The backend successfully sends to SQS, but AWS rejects it because the account
ID in the URL isn’t real, so the AI service never receives a message.

**Quick workaround (no AWS setup):** trigger processing by hand:

```powershell
$docId = "PASTE_DOCUMENT_ID_HERE"
curl.exe -X POST "http://localhost:8000/internal/process/$docId"
```

**Proper fix:** create a real SQS queue in your AWS account, copy its URL into `.env` as `SQS_QUEUE_URL`, then:

```powershell
docker compose down
docker compose up -d
```

### "Cannot connect to AI service" / chat fails

```powershell
docker logs warranty-ai-service --tail 50
```

Look for tracebacks. Most common: OpenAI key invalid (`401`) or the model name is wrong. If the model name is wrong, you’ll see something like
`The model 'gpt-5.5' does not exist`. Edit `.env`, change `LARGE_MODEL` and `SMALL_MODEL` to a model name your OpenAI account actually has, then:

```powershell
docker compose restart ai-service
```

### "TypeOrmModule ECONNREFUSED"

Postgres isn’t up yet. Wait 10 seconds and `docker compose restart backend`.

### "I want to start completely fresh"

```powershell
docker compose down -v   # -v also deletes the database + Qdrant data
docker compose up -d --build
```

---

## Part 8 — Quick API testing with curl (optional)

Get an admin token:

```powershell
$resp = curl.exe -s -X POST http://localhost:3001/auth/login `
  -H "Content-Type: application/json" `
  -d "{\"email\":\"admin@demo.com\",\"password\":\"admin123\"}" | ConvertFrom-Json
$token = $resp.token
$token
```

Upload a PDF:

```powershell
curl.exe -X POST http://localhost:3001/documents/upload `
  -H "Authorization: Bearer $token" `
  -F "file=@C:\path\to\sample.pdf"
```

List documents:

```powershell
curl.exe -H "Authorization: Bearer $token" http://localhost:3001/documents
```

Ask a question directly to the AI service (skip the backend):

```powershell
curl.exe -X POST http://localhost:8000/query/answer `
  -H "Content-Type: application/json" `
  -d "{\"question\":\"Is engine failure covered?\",\"conversationHistory\":[]}"
```

---

## Cheat-sheet

```text
URLs
  Site:     http://localhost:3000
  API:      http://localhost:3001
  AI:       http://localhost:8000
  Qdrant:   http://localhost:6333/dashboard

Demo logins
  admin@demo.com    / admin123
  reviewer@demo.com / reviewer123
  user@demo.com     / user123

Lifecycle
  uploaded → ocr_in_progress → extraction_in_progress
           → extraction_complete → ready_for_review
           → reviewer_approved → certified  (now searchable by users)
```
