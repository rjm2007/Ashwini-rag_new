# Understanding — test-rag v2 (for Cursor / AI agents)

> Read this file FIRST before touching any code in this folder.

---

## What is this folder?

`test-rag/` is a **standalone RAG testing pipeline** that lives OUTSIDE the main
warranty platform (backend + ai-service + frontend). It directly processes PDFs,
chunks them, embeds them, and stores them in Qdrant — bypassing the NestJS
backend, SQS queue, and FastAPI ai-service entirely.

**Purpose:** Test the new RAG strategy (from `/Rag-Stratergy` research doc)
on real warranty PDFs before integrating into the production `ai-service/`.

**Once the strategy is validated here, the proven code moves into:**
- `ai-service/src/services/chunking_service.py` (replaces word-based chunker)
- `ai-service/src/services/embedding_service.py` (adds sparse vectors)
- `ai-service/src/services/qdrant_service.py` (adds hybrid search)
- `ai-service/src/query/retriever.py` (uses hybrid instead of dense-only)

---

## Architecture: How the pieces connect

```
                        test-rag/ folder
                        ================

  PDF files on disk
       │
       ▼
  ┌─────────────────┐     Three-tier fallback:
  │  pdf_reader.py   │     1. AWS Textract (best, needs AWS creds)
  │                  │     2. Docling Docker REST (:5001, see docling-service/)
  │  PDFReader       │     3. OpenAI Vision (render→GPT-4o-mini)
  └────────┬────────┘
           │ per-page text
           ▼
  ┌─────────────────┐
  │  chunker.py      │  tiktoken cl100k_base, 700 tokens target,
  │                  │  15% overlap, recursive structure-aware split
  └────────┬────────┘
           │ chunk dicts
           ▼
  ┌──────────────────────┐
  │ contextual_retrieval │  (optional) LLM adds 2-3 sentence context
  │ .py                  │  blurb to each chunk before embedding
  └────────┬─────────────┘
           │ chunks with contextualizedText
           ▼
  ┌─────────────────┐     ┌────────────────────┐
  │  embedder.py     │────►│ OpenAI embedding    │
  │                  │     │ text-embedding-3-sm  │
  └────────┬────────┘     └────────────────────┘
           │ dense vectors (1536-dim)
           ▼
  ┌──────────────────┐
  │ sparse_encoder   │  BM25-style TF scores, hash-based indices
  │ .py              │  Qdrant Modifier.IDF handles IDF automatically
  └────────┬────────┘
           │ sparse vectors
           ▼
  ┌──────────────────┐     ┌────────────────────┐
  │ qdrant_manager   │────►│ Qdrant (localhost:  │
  │ .py              │     │ 6333)              │
  └──────────────────┘     │ collection:        │
                            │ warranty_chunks_v2 │
                            └────────────────────┘

  At QUERY time:

  User question
       │
       ▼
  ┌─────────────────┐
  │  search_v2.py    │
  │                  │
  │  1. Embed query  │──► dense vector + BM25 sparse vector
  │  2. Hybrid search│──► Qdrant prefetch(dense, sparse) + RRF fusion
  │  3. LLM reason   │──► OpenAI large model with retrieved chunks
  │  4. Print answer │
  └─────────────────┘
```

---

## File-by-file reference

| File | Lines | What it does | Key classes/functions |
|------|-------|-------------|----------------------|
| `config.py` | ~75 | Loads `.env`, returns `RagConfig` dataclass | `RagConfig`, `load_config()` |
| `pdf_reader.py` | ~220 | **Three-tier PDF extraction**: Textract → Docling → OpenAI Vision | `PDFReader.extract()` |
| `ocr_textract.py` | ~120 | Textract-only OCR (used by pdf_reader as Tier 1) | `TextractOCR.upload_and_ocr()` |
| `chunker.py` | ~210 | Tiktoken recursive splitter with structure awareness + overlap | `TiktokenChunker.chunk_pages()` |
| `sparse_encoder.py` | ~75 | BM25 TF scoring with hash-based token→index mapping | `BM25SparseEncoder.encode()` |
| `contextual_retrieval.py` | ~100 | Calls OpenAI to generate context blurb per chunk | `ContextualRetrieval.contextualize_chunks()` |
| `metadata_extractor.py` | ~73 | Calls OpenAI to extract make/model/year/warranty_type from text | `extract_metadata()` |
| `embedder.py` | ~51 | Batch dense embedding via OpenAI | `embed_texts()` |
| `qdrant_manager.py` | ~280 | Creates v2 collection, upserts with dual vectors, hybrid search | `QdrantV2Manager` |
| `ingest_v2.py` | ~275 | **Main ingestion script** — orchestrates the full pipeline | `process_one_pdf()`, `main()` |
| `search_v2.py` | ~248 | **Main search script** — hybrid retrieval + LLM answer | `search_and_answer()`, `main()` |
| `set_certified.py` | ~122 | Flips repository tag on all chunks for a document | standalone script |

---

## Key design decisions (WHY, not just WHAT)

### 1. Three-tier PDF extraction with automatic fallback (pdf_reader.py)

Not everyone has AWS credentials. The system tries three extraction methods
in order, falling back automatically on failure:

| Tier | Method | Needs | Quality | Cost |
|------|--------|-------|---------|------|
| 1 | AWS Textract | AWS creds + S3 bucket | Best (handles tables, handwriting) | ~$1.50/1000 pages |
| 2 | Docling (Docker) | `docker compose -f docker-compose.docling.yml up -d` | Very good (layout-aware, tables) | Free |
| 3 | OpenAI Vision | OPENAI_API_KEY | Good (GPT-4o-mini reads page images) | ~$0.01/page |

You can force a specific tier: `--ocr-method docling` or `--ocr-method openai_vision`.

**Without AWS credentials**, the system silently skips Textract and calls the Docling
container at `DOCLING_URL` (default `http://localhost:5001`). Start it with
`Start-Docling.ps1` or `docker compose -f docker-compose.docling.yml up -d`.
If Docling is down, it falls back to OpenAI Vision (renders each PDF page as PNG
at 200 DPI and sends to GPT-4o-mini).

### 2. Tiktoken chunking instead of word-based (chunker.py)

The OLD `ai-service/src/services/chunking_service.py` splits on **word count**
(500 words, 50-word overlap). This is broken for warranty documents because:
- Word count ≠ token count. Legal English has 20-40% more tokens than words.
- No structure awareness — cuts mid-sentence, mid-table, mid-clause.
- No minimum size filter — produces tiny useless fragments.

The NEW chunker uses `tiktoken cl100k_base` (same tokenizer as
`text-embedding-3-small`) and splits on a hierarchy of separators:
`\n\n` → `\n` → `. ` → `, ` → ` ` — preserving document structure.

**Config:** 700 token target, 1024 max, 50 min, 100 overlap (~15%).

### 2. Hybrid search (dense + BM25 sparse) instead of dense-only

The OLD retriever does pure cosine similarity on dense vectors. This misses
exact-token matches critical for warranty queries: part numbers (P0420),
VINs, coverage codes (D0001, ET460), model codes (VNL64T).

The NEW retriever stores **two vectors per chunk**:
- `dense`: 1536-dim cosine (OpenAI text-embedding-3-small)
- `bm25_sparse`: hash-based BM25 TF scores (Qdrant Modifier.IDF handles IDF)

At query time, both are searched independently, then fused via **Reciprocal
Rank Fusion (RRF)** — a parameter-free rank combination that consistently
outperforms either retriever alone.

**Qdrant API used:** `query_points()` with `prefetch=[]` + `FusionQuery(Fusion.RRF)`.

### 3. Contextual Retrieval (contextual_retrieval.py)

Before embedding a chunk, we call OpenAI to generate a 2-3 sentence context:
"This chunk is from the Volvo VNL64T 2020 Standard Engine Warranty Certificate.
It describes the covered standard engine components list with a 24-month/250,000
mile coverage period."

This context is **prepended to the chunk text before embedding**, so the vector
captures document-level context that isolated chunks lose (pronouns like "this
warranty", "the vehicle" become grounded).

Per Anthropic's published benchmarks: **35% retrieval failure reduction** from
this alone, **49%** when combined with BM25.

### 4. Separate Qdrant collection (warranty_chunks_v2)

The production system uses `warranty_chunks`. We use `warranty_chunks_v2` so
testing never breaks the live data. The v2 collection has a different schema:
- Named vector `"dense"` instead of the default unnamed vector
- Additional sparse vector `"bm25_sparse"`
- Richer payload with `contextualizedText`, `contextBlurb`, `tokenCount`, etc.

### 5. Repository tagging (same pattern as production)

Chunks start with `repository: "pending_review"`. Use `set_certified.py` or
`--auto-certify` flag to flip to `"certified"`. Search always filters by
`repository=certified` to match production behavior.

---

## The Qdrant collection schema

```
Collection: warranty_chunks_v2

Vectors:
  dense:        VectorParams(size=1536, distance=COSINE)
  bm25_sparse:  SparseVectorParams(modifier=IDF)

Payload indexes (keyword filters pushed into HNSW traversal):
  repository    KEYWORD     "pending_review" | "certified" | "rejected"
  documentId    KEYWORD     "volvo_warranty_2019_a1b2c3d4"
  make          KEYWORD     "Volvo"
  model         KEYWORD     "VNL64T"
  year          INTEGER     2020
  warrantyType  KEYWORD     "Standard Engine Warranty"
  filename      KEYWORD     "VOLVO_WARRANTY_2019.pdf"

Other payload fields (not indexed, stored for retrieval):
  chunkText             Original chunk text (sent to LLM)
  contextualizedText    Context blurb + original (used for embedding)
  contextBlurb          Just the generated context
  chunkIndex            0-based position within document
  pageNumber            Source PDF page
  sectionHeading        Inferred section heading
  tokenCount            Tiktoken token count
  country, vin, chassisId, coverageSummary
  embeddingModel, chunkStrategy, hasContextBlurb
```

---

## How to run (step by step)

```bash
# 1. Install deps
pip install -r requirements.txt

# 2. Make sure .env exists in warranty-platform/ root with:
#    OPENAI_API_KEY, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY,
#    S3_BUCKET_NAME, QDRANT_URL (default http://localhost:6333)

# 3. Make sure Qdrant is running (docker compose up qdrant)

# 4. Ingest PDFs (with contextual retrieval + auto-certify for quick testing)
python ingest_v2.py --pdf-dir /path/to/pdfs --auto-certify

# 5. Search
python search_v2.py --question "What components are covered under the standard engine warranty?"

# 6. Or without contextual retrieval (faster):
python ingest_v2.py --pdf-dir /path/to/pdfs --no-context --auto-certify
```

---

## What changes to port back to ai-service

When the v2 strategy is validated, these production files need updating:

1. **`ai-service/src/services/chunking_service.py`**
   - Replace `chunk_text()` / `chunk_pages()` with `TiktokenChunker` logic
   - Add `tiktoken` to `requirements.txt`

2. **`ai-service/src/services/qdrant_service.py`**
   - Change collection schema to named vectors (dense + bm25_sparse)
   - Replace `client.query_points()` with hybrid prefetch + RRF fusion
   - Add `BM25SparseEncoder` for sparse vector computation

3. **`ai-service/src/services/embedding_service.py`**
   - Add contextual retrieval step before embedding
   - Store both `chunkText` and `contextualizedText` in payload

4. **`ai-service/src/query/retriever.py`**
   - Compute both dense + sparse query vectors
   - Call hybrid search instead of dense-only

5. **`ai-service/src/workers/pipeline_orchestrator.py`**
   - Wire up the new chunker + contextualizer + dual-vector embedding

6. **`infra/postgres/init.sql`**
   - No schema changes needed (Qdrant handles the vector schema)

---

## Relationship to existing test-rag/ scripts

The old PowerShell scripts (`1_upload_and_process.ps1`, `2_check_qdrant.ps1`,
`3_ask_question.ps1`, `set_certified.ps1`) test the **old pipeline** through
the backend API. They are NOT replaced — keep them for A/B comparison.

The new Python scripts (`ingest_v2.py`, `search_v2.py`, `set_certified.py`)
test the **new RAG strategy** directly against Qdrant, bypassing the backend.

Both can run simultaneously because they use different Qdrant collections:
- Old: `warranty_chunks`
- New: `warranty_chunks_v2`
