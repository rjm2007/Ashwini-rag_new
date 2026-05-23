# RAG System (Current Implementation)

This document explains how RAG works in this project in **easy words**, but with enough technical detail that another AI (or engineer) can reason about the system correctly.

---

## 1) Big Picture

The platform has 3 runtime services:

- `frontend` (Next.js): UI for upload, review, and chat
- `backend` (NestJS): auth, documents/review/query APIs, DB writes, calls AI service
- `ai-service` (FastAPI): OCR, metadata extraction, chunking/embeddings, Qdrant retrieval, reasoning

Storage/infra used by RAG flow:

- Postgres: document + review + chat message/session metadata
- S3: original PDFs and processing artifacts
- Qdrant: vector store for chunk embeddings + chunk metadata payloads
- OpenAI: embeddings + LLM calls (small/large models)

---

## 2) Core Design Decision: One Qdrant Collection + Repository Tag

There is **one** Qdrant collection (default `warranty_chunks`).

Chunks are not moved between collections.  
Instead each chunk has payload field `repository`:

- `pending_review`
- `reviewer_approved`
- `certified`
- `rejected`

Retrieval for answering chat always filters to:

- `repository = certified`

So physical storage is shared, but logical visibility is controlled by payload tags.

---

## 3) Ingestion Pipeline (Document -> Chunks)

Main orchestrator: `ai-service/src/workers/pipeline_orchestrator.py`

**OCR (same as test-rag):** `OcrService` → `PDFReader` with `OCR_METHOD=auto`:
Textract → Docling Docker → OpenAI Vision. Set `OCR_METHOD=openai_vision` if AWS Textract is unavailable.

### Step-by-step (actual code behavior)

1. **Upload entry**
   - Admin uploads PDF via backend `POST /documents/upload`
   - Backend writes `documents` row:
     - `current_repository = pending_review`
     - `processing_status = uploaded`
   - PDF is stored in S3 under:
     - `private-session/<documentId>/original.pdf`

2. **OCR (`STEP 1/6`)**
   - AI service calls `TextractService.run_ocr(s3_path)`
   - OCR implementation:
     - tries AWS Textract async text detection
     - if unavailable/fails, falls back to `pypdf` extraction
   - Stores OCR artifact in S3:
     - `ocr-output/<documentId>/ocr.json`

3. **Metadata extraction (`STEP 2/6`)**
   - Builds plain text from OCR pages
   - Calls extraction LLM (`small model`) to infer fields like:
     - make, model, year, country, warranty_type (+ structured lists)
   - Writes artifacts:
     - `extracted-text/<documentId>/text.json`
     - `processing-artifacts/<documentId>/metadata.json`
   - Updates `documents` table metadata columns + `metadata_json`

4. **Chunking (`STEP 4/6`)**
   - Splits plain text into chunk objects
   - Each chunk keeps text + page-ish context (depending on chunker output)

5. **Embedding (`STEP 5/6`)**
   - Embeds chunk text with `text-embedding-3-small`
   - Enriched chunk payload includes:
     - `documentId`
     - `repository = pending_review`
     - extracted metadata (`make/model/year/country/warrantyType`)
     - vector

6. **Qdrant upsert (`STEP 6/6`)**
   - Upserts all chunks to `warranty_chunks`

7. **Finalize**
   - Moves PDF in S3:
     - `private-session/...` -> `pending-review/<documentId>/original.pdf`
   - Updates Postgres:
     - `s3_path = pending-review/...`
     - `processing_status = ready_for_review`
     - `current_repository = pending_review`

---

## 4) Review Gating (What makes chunks searchable)

Backend service: `backend/src/modules/review/review.service.ts`

### Reviewer approve

- endpoint: `POST /review/:documentId/reviewer-approve`
- writes/updates review row `final_status = reviewer_approved`
- calls AI internal endpoint to flip all Qdrant chunk payloads:
  - `POST /internal/set-repository/:documentId`
  - body `{ "repository": "reviewer_approved" }`

### Admin approve

- endpoint: `POST /review/:documentId/admin-approve`
- requires review status already reviewer-approved
- moves S3 from `pending-review/...` to `certified/<country>/<make>/<model>/<year>/<documentId>/original.pdf`
- updates `documents.current_repository = certified`
- sets review `final_status = certified`
- flips all chunk payloads in Qdrant to `repository = certified`

### Reject

- endpoint: `POST /review/:documentId/reject`
- moves S3 to rejected archive path
- updates `documents.current_repository = rejected`
- sets review `final_status = rejected`
- flips chunk payloads to `repository = rejected`

---

## 5) Query-Time RAG (User asks a question)

Main path:

- frontend -> backend `POST /query/sessions/:id/messages`
- backend -> AI `POST /query/answer`

AI orchestrator: `ai-service/src/query/query_orchestrator.py`

### Runtime stages

1. **Intent classification** (small model; greetings skip retrieval)
   - `classify_intent(question)` → `greeting_or_smalltalk`, `warranty_coverage`, `out_of_scope`, etc.
   - Greetings (`hi`, `hello`) → polite assistant intro, no Qdrant call
   - Out-of-scope / prompt injection → safe fixed reply

2. **Metadata filter extraction**
   - `extract_metadata_filters(question)`
   - LLM returns filter hints (make/model/year/etc)

3. **Retrieve chunks** (v2 hybrid when collection supports it)
   - small model extracts `rewritten_query` + `semantic_keywords`
   - embed rewritten query with `text-embedding-3-small`
   - BM25 sparse encode on question + keywords + component synonyms
   - Qdrant hybrid search: dense + sparse prefetch → RRF fusion
   - dedupe results (max 2 per doc/page)
   - filters: `repository=certified` + optional make/model/year/country/warrantyType

4. **Reason over evidence**
   - sends question + history + retrieved chunks to large model
   - large model outputs structured reasoning including:
     - answer
     - coverage decision
     - evidence indices
     - confidence factors

5. **Assemble response**
   - map evidence indices back to retrieved chunk payloads
   - confidence = average of:
     - evidence_strength
     - clause_clarity
     - metadata_match

6. **Persist**
   - backend stores user + assistant messages in `query_messages`
   - session `last_message_at` updated

---

## 6) Session Naming (Current Behavior)

Query sessions start as `New Chat`.

On first user message, backend auto-renames title from first ~7 words of that message.  
This is cosmetic only; it does not affect RAG logic.

---

## 7) What Filters Are Actually Applied in Retrieval

Qdrant search currently only accepts filter keys:

- `make`
- `model`
- `year`
- `country`
- `warrantyType`

Non-scalar or unsupported keys are ignored for safety.

---

## 8) Important Operational Notes

1. **Certified-only retrieval is strict**
   - If docs are uploaded but not admin-certified, chat should not use them.

2. **Duplicate filename upload is blocked**
   - Backend now blocks uploading a file with same `originalFilename` (case-insensitive).

3. **OCR fallback exists**
   - If Textract is unavailable, system still attempts to extract text via `pypdf`.

4. **Long response latency is mostly large-model time**
   - The large reasoning call can be slow; retrieval itself is usually quick.

5. **Logs are the primary debugger**
   - Pipeline has `STEP 1/6 ... STEP 6/6` logs
   - Review has Qdrant flip logs (`set-repository`)
   - Query has AI request/response status logs

---

## 9) Data Contracts (Useful for AI Agents)

### AI query response shape (to backend)

Typical fields:

- `answer: string`
- `evidence: array` (chunk payloads)
- `confidence: number` (0..1)
- `filters: object`
- `coverageDecision: string`

### Qdrant payload fields per chunk

Common fields:

- `documentId`
- `repository`
- `chunkText`
- `make`, `model`, `year`, `country`, `warrantyType`
- page/chunk metadata from chunker

---

## 10) Current Known Constraints / Next Improvements

Potential improvements (not required for current correctness):

- Add stronger duplicate detection using file hash, not only filename
- Add better queue hygiene for old pending duplicates
- Add streaming responses for chat UX
- Add explicit timeout/retry policy and user-facing “still processing” state
- Add richer ranking/re-ranking on top of pure vector similarity

---

## 11) One-Line Mental Model

**Ingest everything early into one vector collection, but control answer visibility using repository tags, and only retrieve certified chunks during query-time reasoning.**

