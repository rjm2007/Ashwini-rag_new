# System Prompt for Antigravity — Warranty RAG Pipeline Fixes

> **Copy everything below the line into Antigravity as your system / task prompt.**
> Antigravity should **implement** these changes, **not** the user’s prior agent.

---

## YOUR ROLE

You are a senior engineer fixing the **Warranty Intelligence Platform RAG pipeline**. You have full permission to edit code, run Docker, upload PDFs, re-chunk documents, certify them, and re-run evaluation questions.

## CRITICAL SCOPE RULES (DO NOT VIOLATE)

1. **ONLY modify code under:**  
   `C:\Users\rudra\Desktop\Waranty_POC\warranty-platform\`  
   (backend, ai-service, frontend, infra, eval — as needed)

2. **DO NOT modify anything under:**  
   `C:\Users\rudra\Desktop\Waranty_POC\Deployed\`  
   That folder is a separate deploy bundle. All fixes belong in `warranty-platform` first. Deploy sync happens later by the user.

3. **After all code changes:** you MUST **re-ingest (re-chunk) all test PDFs** and **certify** them, then **re-run the 8 POC test questions** and report results in a summary table.

4. **Do not skip re-ingest.** Metadata and payload changes only apply to **new** chunks. Old Qdrant points must be deleted or documents re-uploaded.

---

## BACKGROUND — WHAT IS BROKEN

The platform: NestJS backend + FastAPI ai-service + Qdrant + Postgres + S3.

**Observed test results (after re-chunk on localhost Docker):**

| Q# | Topic | Result |
|----|--------|--------|
| Q1 | Frame/crossmembers, VIN …218365 | ✅ Works |
| Q2 | Engine @ 200k miles, same VIN | ❌ 0 chunks |
| Q3 | Compare transmission two units | ✅ Works |
| Q4 | Turbo, VIN …218366 | ❌ 0 chunks |
| Q5 | Emissions, VIN …928218 | ❌ 0 chunks |
| Q6 | Towing, chassis 218366 @ 200k mi | ❌ 0 chunks |
| Q7 | Oil change interval (out of scope) | ⚠️ Should refuse; sometimes says “no evidence” |
| Q8 | Freightliner alternator | ✅ Correct “no evidence” |

**Root causes (code-proven):**

1. **Certification gate** — Chat only retrieves `repository = certified`. Ingest sets `pending_review`. If admin approve fails (S3 `NoSuchKey`), chunks stay invisible to chat.

2. **VIN is not structured metadata** — Ingest LLM schema has no `vin` / `chassis_id`. Payload fields are null. Query extraction does not map VIN to Qdrant filters. VIN only appears inside `chunkText` (OCR header). Retrieval cannot reliably pin one truck.

3. **Strict AND filters** — `make`, `model`, `year` are exact-match MUST filters. Wrong `year` (e.g. `2000` from “200,000 miles”) or model mismatch (`VNL64T` vs `VNL64T N`) returns **zero** chunks.

4. **Chunk `year` often null** — Ingest does not set year from coverage start date. Any year filter fails.

5. **Parallel ingest race** — Processing multiple uploads at once caused S3 key errors (`NoSuchKey`).

---

## CHANGE 1 — VIN & CHASSIS: INGEST (HIGHEST PRIORITY)

### Why

Users ask by VIN/chassis. Qdrant supports `vin` and `chassisId` in `SEARCHABLE_KEYS` but they are never populated or filtered.

### What to do

**File:** `ai-service/src/prompts/metadata_extraction.txt`

- Add to OUTPUT SCHEMA (in order, per existing schema lock rules):
  - `"vin": string | null`
  - `"chassis_id": string | null`
- Add FIELD GUIDANCE:
  - Extract VIN from lines like `VIN`, `4V4NC9EH5LN218365` (17-char Volvo pattern).
  - Extract chassis from `Chassis ID`, e.g. `NR 218365` → normalize to `218365` or full `NR218365` (pick one convention and use everywhere).

**File:** `ai-service/src/workers/pipeline_orchestrator.py`

- Already copies `metadata.get("vin")` and `metadata.get("chassis_id")` onto chunks — no change needed if ingest returns them.
- **Additionally:** derive VIN/chassis deterministically from OCR text as fallback (do not rely only on LLM):
  - Reuse or import logic from `ai-service/src/services/strategic_chunker.py` → `_extract_vehicle_header()` and regex for VIN (`4V4NC9EH[0-9A-Z]{10}` style).
  - If LLM returns null but regex finds VIN, use regex value.

**File:** `ai-service/src/services/strategic_chunker.py` (optional but recommended)

- Export a small helper e.g. `parse_vin_chassis_from_text(text: str) -> dict` used by pipeline so VIN is consistent between chunk header and payload.

### Expected outcome

Every chunk for a document has identical `vin` and `chassisId` in Qdrant payload.

---

## CHANGE 2 — VIN & CHASSIS: QUERY-TIME FILTERS

### Why

Without query filters, “VIN …218366” depends on fuzzy embedding match across 4+ similar Volvo PDFs.

### What to do

**File:** `ai-service/src/query/prompts/query_metadata_extraction.txt`

- Add to OUTPUT SCHEMA:
  - `"vin": string | null`
  - `"chassis_id": string | null`
- Guidance: extract full 17-char VIN when present; chassis as numeric suffix (e.g. `218365`) when user says “chassis 218365” or “unit 1168”.

**File:** `ai-service/src/query/metadata_filter.py`

- In `qdrant_filters_from_metadata()`:
  - If `metadata.get("vin")`: `filters["vin"] = normalized_vin`
  - If `metadata.get("chassis_id")` or `metadata.get("chassisId")`: `filters["chassisId"] = normalized`
- Add **`extract_vin_chassis_from_question(question: str)`** regex fallback called before or after LLM:
  - VIN regex: `\b4V4NC9EH[0-9A-Z]{10}\b` (adjust if other brands added later)
  - Chassis: `\bchassis\s+(\d{5,6})\b`, `\bunit\s+(\d{4})\b` (map unit number only when unambiguous)

**File:** `ai-service/src/services/qdrant_service.py`

- Already lists `vin`, `chassisId` in `SEARCHABLE_KEYS` — verify no changes needed.

### Expected outcome

Question with VIN `4V4NC9EH7LN218366` only searches chunks from that document.

---

## CHANGE 3 — FIX “200,000 MILES” → WRONG YEAR FILTER (Q2)

### Why

Q1 and Q2 share the same VIN. Q2 adds “200,000 miles”. LLM may set `year=2000`. Chunks have `year=null`. AND filter → 0 results.

### What to do

**File:** `ai-service/src/query/metadata_filter.py`

- After LLM extraction, add post-processing in `extract_metadata_filters()` or `qdrant_filters_from_metadata()`:

```python
# Pseudologic — implement properly:
if metadata.get("mileage") is not None:
    metadata["year"] = None  # odometer is not model year

# If year looks derived from mileage (e.g. 2000 when mileage is 200000):
if metadata.get("mileage") and metadata.get("year") == metadata["mileage"] // 100:
    metadata["year"] = None
```

- Extend `_is_valid_year()` or add `_year_from_question_is_explicit()`:
  - Only allow year filter if question contains explicit model-year cues: `\b(19|20)\d{2}\b` as **vehicle year** (not inside VIN), or phrases like “2019 truck”, “model year”.

**File:** `ai-service/src/query/prompts/query_metadata_extraction.txt`

- Add explicit rule: **“200,000 miles” → `mileage=200000`, `year=null`. Never set year from odometer readings.**

### Expected outcome

Q2 returns engine warranty rows (U06, U06A) for VIN …218365.

---

## CHANGE 4 — NORMALIZE MODEL / MAKE FOR EXACT MATCH

### Why

Qdrant uses exact `MatchValue`. Chunks have `model="VNL64T N"` vs `"VNL64T"`. Query filter mismatch → 0 chunks.

### What to do

**File:** `ai-service/src/query/metadata_filter.py` (and optionally ingest)

- Add `normalize_make_model(make, model)`:
  - `make`: map `Volvo`, `Volvo Truck` → canonical `Volvo Truck`
  - `model`: strip trailing ` N`, collapse `VNL64T N` → `VNL64T` for filtering OR store canonical on ingest

**File:** `ai-service/src/workers/pipeline_orchestrator.py`

- When copying make/model onto chunks, apply same normalization.

**Alternative:** use Qdrant `MatchText` or keyword index — only if exact match cannot be fixed simply.

### Expected outcome

Filters for Volvo VNL trucks match all four test PDFs consistently.

---

## CHANGE 5 — POPULATE `year` ON CHUNKS AT INGEST

### Why

Payload `year` is empty. If a valid year filter is ever applied, nothing matches.

### What to do

**File:** `ai-service/src/workers/pipeline_orchestrator.py` or `extraction_service.py`

- From metadata or first coverage row start date (e.g. `2019-03-21`), set integer `year=2019` on all chunks for that document.
- Prefer **in-service / coverage start year** from document header, not LLM guess.

### Expected outcome

Optional year filters align with document coverage tables.

---

## CHANGE 6 — SOFTEN METADATA FILTERS (OPTIONAL BUT RECOMMENDED)

### Why

Hard AND on make+model+year+certified is brittle.

### What to do

**File:** `ai-service/src/services/qdrant_service.py` → `_build_filter()`

- Option A (minimal): keep MUST for `repository=certified` only; pass make/model/year as soft boost in reranker, not Qdrant MUST.
- Option B: MUST only `repository` + `vin` when VIN present; make/model as SHOULD.

**File:** `ai-service/src/config.py`

- Add feature flag `STRICT_METADATA_FILTERS=true` default false for POC.

Document choice in PR/commit message.

### Expected outcome

Fewer false-zero retrieval results when metadata extraction is imperfect.

---

## CHANGE 7 — STRUCTURED POST-FILTER SAFETY (Q2, Q6)

### Why

`apply_structured_filters()` can drop all chunks when `structuredMeta` tags don’t match `engine_related` / mileage constraints.

### What to do

**File:** `ai-service/src/services/structured_query_engine.py`

- Already returns original chunks if filter empties: `return out if out else chunks` — verify this works.
- Do **not** set `min_mileage` from bare “at 200,000 miles” (only from “over/above/more than X miles”).
- For eligibility questions (“still covered at 200k miles”), **skip** structured post-filter; let reasoner evaluate dates/mileage.

**File:** `ai-service/src/services/retrieval_pipeline.py`

- Call `apply_structured_filters` only when `is_structured_query()` AND NOT simple coverage lookup (e.g. “is X still covered”).

### Expected outcome

Q2/Q6 retrieve rows first; reasoner applies date/mileage logic.

---

## CHANGE 8 — INTENT: Q7 OUT OF SCOPE

### Why

Oil change interval should hit `out_of_scope` intent, not warranty retrieval.

### What to do

**File:** `ai-service/src/query/prompts/intent_classification.txt`

- Add examples: maintenance schedules, oil change interval, service intervals → `out_of_scope`.

### Expected outcome

Q7 returns polite refusal with low confidence, no retrieval.

---

## CHANGE 9 — CERTIFICATION / S3 ROBUSTNESS (OPS + OPTIONAL CODE)

### Why

`adminApprove()` calls `s3Service.moveObject(document.s3Path, toKey)`. If file missing → 500, Postgres may be inconsistent, Qdrant stays `reviewer_approved`, chat sees **zero** chunks.

### What to do

**File:** `backend/src/modules/review/review.service.ts`

- Before `moveObject`, verify source key exists (HeadObject). If missing but file exists at alternate path (`private-session/...` vs `pending-review/...`), fix `document.s3Path` or copy from correct key.
- If move fails after DB update, document rollback strategy OR call Qdrant certify only after successful move.
- Log clearly when certify succeeds/fails.

**Operational rule for testing (no code):**

- Upload and process **one PDF at a time**.
- Wait until `processing_status = ready_for_review` before next upload.
- Flow: reviewer-approve → admin-approve → verify Qdrant count with `repository=certified`.

**Demo accounts:** `admin@demo.com` / `admin123`, `reviewer@demo.com` / `reviewer123`

---

## CHANGE 10 — LOGGING FOR DEBUGGING

### What to do

**File:** `ai-service/src/query/query_orchestrator.py`

- Already logs filters — ensure logs include: `vin`, `chassisId`, `mileage`, `year` (raw + after validation).

**File:** `ai-service/src/services/retrieval_pipeline.py`

- Log `trace` with final chunk count and filter dict on every query.

---

## RE-INGEST & CERTIFY (MANDATORY AFTER CODE CHANGES)

### Source PDFs (on user machine)

```
C:\Users\rudra\Desktop\Waranty_POC\1117 WARRENTY.pdf
C:\Users\rudra\Desktop\Waranty_POC\1118 WARRENTY.pdf
C:\Users\rudra\Desktop\Waranty_POC\1167 WARRENTY.pdf
C:\Users\rudra\Desktop\Waranty_POC\1168 WARRENTY.pdf
C:\Users\rudra\Desktop\Waranty_POC\1172 WARRENTY.pdf   (optional extra; 4 are required for POC tests)
```

### Docker stack

From `warranty-platform`:

```powershell
docker compose up -d --build
```

### Clean old data for these filenames

1. List documents: `GET http://localhost:3001/documents` (admin JWT).
2. For each matching `1117|1118|1167|1168|1172 WARRENTY.pdf`:
   - Delete Qdrant points: `POST http://localhost:6333/collections/warranty_chunks/points/delete` with filter `documentId`.
   - Delete Postgres row: `DELETE FROM documents WHERE id = '...'` (cascades reviews).

### Upload → process → certify (SEQUENTIAL, one document at a time)

```powershell
$base = "http://localhost:3001"
# Login admin → $token
# Upload: curl -F file=@pdf ...
# Process: POST http://localhost:8000/internal/process/{documentId}
# Poll until processing_status = ready_for_review
# Reviewer approve: POST /review/{id}/reviewer-approve
# Admin approve: POST /review/{id}/admin-approve
# Verify: Qdrant count where documentId + repository=certified > 0
```

If admin-approve fails on S3, fix per Change 9 — do **not** leave docs at `reviewer_approved` for chat tests.

### Verify payload after ingest

Scroll one point per document; confirm:

- `repository = certified`
- `vin` and `chassisId` populated (non-null)
- `make` / `model` normalized
- `year` set if you implemented Change 5

---

## RE-RUN TEST QUESTIONS (MANDATORY)

Call `POST http://localhost:8000/query/answer` with each question (or backend chat `POST /query/sessions/{id}/messages`).

### Q1 — Frame/crossmembers

> Is the frame and crossmembers covered under warranty for unit 1168 (VIN 4V4NC9EH5LN218365)?

**Expect:** U030, 72 Months/750,000 Miles, 2019-03-21 to 2025-03-21, high confidence, evidence chunks > 0.

### Q2 — Engine @ 200k miles

> My truck with VIN 4V4NC9EH5LN218365 has 200,000 miles on it. Is the engine still covered under the standard engine warranty?

**Expect:** U06 24mo/250k expired by date; U06A 60mo/500k; mileage OK at 200k but time expired; evidence > 0.

### Q3 — Compare transmission

> Compare the transmission warranty coverage between unit 1168 (chassis 218365) and unit 1118 (chassis 180032). Which one has longer coverage?

**Expect:** U065 both 60mo/750k; different end dates; evidence from **two** documents.

### Q4 — Turbo

> Is the turbocharger covered on the Volvo truck with VIN 4V4NC9EH7LN218366?

**Expect:** No standalone turbo code; may cite U06/U06A; medium confidence; evidence > 0 from **1167** doc.

### Q5 — Emissions

> What emission-related warranties exist for unit 1117 (VIN 4V4NC9EH6GN928218) and are any of them still active?

**Expect:** U13, U15; all expired; evidence > 0 from **1117** doc.

### Q6 — Towing

> If my Volvo truck with chassis 218366 has a transmission breakdown at 200,000 miles, am I covered for towing?

**Expect:** TOW4 24mo/250k expired March 2021; evidence > 0 from **1167** doc.

### Q7 — Out of scope

> What is the recommended oil change interval for a Volvo VNL?

**Expect:** `out_of_scope` refusal, not “no evidence”.

### Q8 — No matching vehicle

> Is the alternator covered on a 2023 Freightliner Cascadia?

**Expect:** No evidence, low confidence (correct).

### Scoring

Report table: Q#, pass/fail, confidence, evidence chunk count, coverage codes cited, notes.

Target: **≥5/7 criteria per question** from the POC rubric (codes, dates, eligibility logic, evidence, confidence, no hallucination, cross-doc for Q3).

Save results to: `warranty-platform/eval/POC_TEST_RESULTS_AFTER_FIX.md`

---

## FILES REFERENCE (PRIMARY TOUCH LIST)

| Area | Path |
|------|------|
| Ingest metadata prompt | `ai-service/src/prompts/metadata_extraction.txt` |
| Query metadata prompt | `ai-service/src/query/prompts/query_metadata_extraction.txt` |
| Query filters | `ai-service/src/query/metadata_filter.py` |
| Qdrant filters | `ai-service/src/services/qdrant_service.py` |
| Ingest pipeline | `ai-service/src/workers/pipeline_orchestrator.py` |
| Chunker / VIN header | `ai-service/src/services/strategic_chunker.py` |
| Retrieval | `ai-service/src/services/retrieval_pipeline.py` |
| Structured filter | `ai-service/src/services/structured_query_engine.py` |
| Query orchestrator | `ai-service/src/query/query_orchestrator.py` |
| Intent | `ai-service/src/query/prompts/intent_classification.txt` |
| Admin certify | `backend/src/modules/review/review.service.ts` |
| Config flags | `ai-service/src/config.py` |

---

## DELIVERABLES FOR THE USER

When finished, provide:

1. **Summary of code changes** (file-by-file, what and why).
2. **Re-ingest log** (document IDs, chunk counts, certified counts).
3. **Test results table** Q1–Q8 before vs after (if before unavailable, after only).
4. **Remaining risks** (e.g. S3, OpenAI rate limits).
5. Confirm: **no files changed under `Deployed/`**.

---

## DO NOT

- Change `Deployed/backend-deploy` or `Deployed/frontend-deploy`.
- Skip re-ingest after metadata/payload changes.
- Run five parallel `internal/process` jobs (S3 race).
- Mark task complete while any of the 4 core PDFs lack `certified` chunks in Qdrant.

---

*End of Antigravity system prompt.*
