# Test the RAG pipeline (super simple)

This folder lets you test the whole document → vectors → search → answer flow
**without going through the website**. Perfect for checking the RAG logic step
by step.

## Before you start

1. The stack must be running. From `warranty-platform/`:

   ```powershell
   docker compose up -d
   ```

2. Drop one warranty PDF into this folder and rename it to `sample.pdf`.
   (Or pass a different path to the script — see below.)

## The 3 scripts

Each script does ONE thing. Run them in order.

### Script 1 — Upload + process

```powershell
.\1_upload_and_process.ps1
# or with a custom file:
.\1_upload_and_process.ps1 -PdfPath "C:\path\to\my.pdf"
```

What it does:

1. Logs in as admin and gets a JWT token
2. Uploads your PDF to the backend
3. Calls the AI service's `/internal/process/<id>` to run OCR + extraction +
   chunking + embedding + Qdrant upsert (skips SQS, since SQS isn't configured)
4. Polls the database every 3 seconds until the doc reaches
   `ready_for_review` or `failed`
5. Prints the document ID — copy this for the next scripts

### Script 2 — Inspect Qdrant

```powershell
.\2_check_qdrant.ps1 -DocumentId "PASTE-DOC-ID-HERE"
```

Shows:

- The collection summary (how many points total)
- The first 5 points (vector dimension + chunk text + metadata)
- A count of points belonging to your document

This is the proof the document was vectorised.

### Script 3 — Ask a question (uses the AI service directly)

```powershell
.\3_ask_question.ps1 -Question "What components are covered under the powertrain warranty?"
```

What it does:

1. Calls `POST http://localhost:8000/query/answer`
2. Behind the scenes the AI service:
   - Embeds your question
   - Searches Qdrant filtered by `repository = certified`
   - Sends the matching chunks to the large LLM
   - Returns a structured JSON answer with citations

> Important: until you approve the doc as reviewer **and** admin via the
> website, its chunks have `repository = pending_review` and the search
> returns nothing. Either go through the UI flow OR run
> `.\set_certified.ps1 -DocumentId "..."` (see below) to fast-forward the
> repo flag in Qdrant for testing.

### Bonus — Fast-forward to certified (test only)

```powershell
.\set_certified.ps1 -DocumentId "PASTE-DOC-ID-HERE"
```

Updates every Qdrant point belonging to your document so its
`repository` field becomes `certified`. After this, script 3 can find
the chunks. **Don't use this in production** — it bypasses human review.

## Where to look while it runs

In another terminal, follow the AI service logs to see each step:

```powershell
docker logs -f warranty-ai-service
```

You should see lines like:

```text
[<id>] STEP 1/6 OCR start
[<id>] STEP 1/6 OCR done (pages=23)
[<id>] STEP 2/6 Metadata extraction start
LLM small call model=gpt-5.4-mini prompt_chars=14820
LLM small call ok response_chars=312
[<id>] STEP 2/6 Metadata extracted (make=Freightliner model=Cascadia year=2023 ...)
[<id>] STEP 3/6 DB metadata update done
[<id>] STEP 4/6 Chunking start
[<id>] STEP 4/6 Chunked into 47 pieces
[<id>] STEP 5/6 Embedding 47 chunks
[<id>] STEP 5/6 Embedded 47 vectors
[<id>] STEP 6/6 Upserted 47 chunks into Qdrant
[<id>] DONE pipeline complete -> ready_for_review
```

That's your proof every step ran.

## What "RAG" really does here (in 6 boxes)

```
1. PDF in S3
       │
       ▼
2. AWS Textract turns pages → plain text
       │
       ▼
3. Small LLM extracts make/model/year/coverage as JSON
       │
       ▼
4. Text is split into ~500-token "chunks"
       │
       ▼
5. OpenAI embeds each chunk → 1536-number vectors
       │
       ▼
6. Vectors + chunk text + metadata stored in Qdrant
   (later: question is also embedded, top-K nearest chunks retrieved,
    LLM answers ONLY from those chunks → "RAG")
```
