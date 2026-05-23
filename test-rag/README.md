# test-rag v2 — New RAG Strategy Testing

Test the upgraded RAG pipeline **directly against Qdrant** without going through
the backend or ai-service. Uses a separate collection (`warranty_chunks_v2`) so
the production data is untouched.

## What changed vs the old pipeline

| Aspect | Old (ai-service) | New (test-rag v2) |
|--------|-------------------|-------------------|
| **Chunking** | Word-count (500 words, 50 overlap) | Strategic tiktoken: coverage rows, policy clauses, prose |
| **Splitting** | Blind word split | Table rows intact; numbered sections (23. GLASS); prose fallback |
| **Vectors** | Dense only (1536-dim) | Dense + BM25 sparse (hybrid) |
| **Search** | Cosine similarity | Dense + BM25 prefetch → RRF fusion |
| **Context** | None | Contextual Retrieval (LLM blurb prepended before embedding) |
| **Metadata** | Basic (make/model/year) | Rich (coverage codes, VIN, chassis, summary + payload indexes) |
| **Collection** | `warranty_chunks` | `warranty_chunks_v2` (isolated) |

## Prerequisites

- Python 3.11+
- Docker running with Qdrant (`docker compose up qdrant`)
- `.env` file in `warranty-platform/` root with at least:
  - `OPENAI_API_KEY` (required — embedding, reasoning, and fallback Vision OCR)
  - `AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY` + `S3_BUCKET_NAME` (optional — for Textract OCR)

**No AWS? No problem.** The system falls back to Docling (Docker) or OpenAI Vision automatically.

## Setup

```powershell
cd warranty-platform\test-rag
pip install -r requirements.txt

# Tier 2 OCR: start Docling in Docker (first build ~5–10 min)
Start-Docling.cmd
# If .ps1 is blocked: powershell -ExecutionPolicy Bypass -File .\Start-Docling.ps1
# Or: docker compose -f docker-compose.docling.yml up --build -d
```

Set `DOCLING_URL=http://localhost:5001` in `warranty-platform/.env` (default). Inside the main Docker network use `http://docling:5001`.

## Step 1 — Ingest PDFs

```powershell
# Quick ingest (Docling OCR + auto-certify; start Docling first)
Run-Ingest.cmd

# AUTO mode — tries Textract → Docling → OpenAI Vision
python ingest_v2.py --pdf-dir "C:\Users\rudra\Desktop\Waranty_POC\pdf" --auto-certify

# Force Docling Docker only (no AWS; start docling container first)
python ingest_v2.py --pdf-dir ./pdfs --ocr-method docling --auto-certify

# Force OpenAI Vision only (no AWS, no Docling container needed)
python ingest_v2.py --pdf-dir ./pdfs --ocr-method openai_vision --auto-certify

# Skip contextual retrieval (faster + cheaper)
python ingest_v2.py --pdf-dir ./pdfs --ocr-method docling --no-context --auto-certify

# Start fresh (delete old collection)
python ingest_v2.py --pdf-dir ./pdfs --reset --auto-certify
```

What happens for each PDF:
1. **PDF extraction** (auto-fallback: Textract → Docling → OpenAI Vision) → per-page text
2. GPT-4o-mini extracts make/model/year/warranty_type
3. Strategic chunking (coverage tables / policy sections / prose, 700-token target)
4. GPT-4o-mini generates 2-3 sentence context blurb per chunk (optional)
5. OpenAI embeds contextualized text → 1536-dim dense vector
6. BM25 sparse vector computed via hash-based encoder
7. Both vectors + rich payload upserted to Qdrant `warranty_chunks_v2`

## Step 2 — Search

```bash
# Basic question (hybrid search: dense + BM25 + RRF)
python search_v2.py -q "What engine components are covered under the standard warranty?"

# With metadata filter
python search_v2.py -q "What is the turbocharger coverage?" --make Volvo

# Dense-only search (for A/B comparison against hybrid)
python search_v2.py -q "What components are covered?" --dense-only

# Show full source previews
python search_v2.py -q "What are the exclusions?" --show-sources --top-k 5
```

## Step 3 — Manage document status

```bash
# List all ingested documents
python set_certified.py --list

# Certify a specific document
python set_certified.py --doc-id volvo_warranty_2019_a1b2c3d4

# Certify ALL at once (testing shortcut)
python set_certified.py --all
```

## File structure

```
test-rag/
  requirements.txt            # Python dependencies
  understanding.md            # For Cursor AI — read FIRST before editing
  README.md                   # You are here
  config.py                   # Loads .env → RagConfig dataclass
  pdf_reader.py               # Three-tier extraction: Textract → Docling → OpenAI Vision
  ocr_textract.py             # Textract-only OCR (used by pdf_reader as Tier 1)
  chunker.py                  # Tiktoken recursive chunker (700 tok, 15% overlap)
  sparse_encoder.py           # BM25 sparse vector encoder (hash-based)
  contextual_retrieval.py     # LLM context blurb generation (OpenAI)
  metadata_extractor.py       # LLM warranty metadata extraction
  embedder.py                 # OpenAI dense embedding (text-embedding-3-small)
  qdrant_manager.py           # Qdrant v2 collection: create, upsert, hybrid search
  ingest_v2.py                # Main ingestion orchestrator
  search_v2.py                # Main search + LLM answer
  set_certified.py            # Repository tag management
```

## Comparison: old scripts vs new

The old PowerShell scripts (`1_upload_and_process.ps1` etc.) test the **existing
production pipeline** through the backend API → ai-service. They use collection
`warranty_chunks`.

The new Python scripts test the **upgraded RAG strategy** directly against Qdrant.
They use collection `warranty_chunks_v2`. Both can run simultaneously.

## Qdrant dashboard

Open http://localhost:6333/dashboard to inspect the `warranty_chunks_v2` collection,
browse points, and verify payloads.
