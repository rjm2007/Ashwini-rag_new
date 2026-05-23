# Legacy test-rag — Production pipeline via backend API

`ocr_textract.py` is superseded by `pdf_reader.py` (Textract → Docling Docker → OpenAI Vision). Kept for reference only.

These PowerShell scripts test the **existing production pipeline** (backend → ai-service → Qdrant collection `warranty_chunks`). They are kept for A/B comparison against the Python v2 scripts in this folder.

See [README.md](./README.md) for the new v2 hybrid RAG workflow (`warranty_chunks_v2`).

## Prerequisites

1. Stack running from `warranty-platform/`:

   ```powershell
   docker compose up -d
   ```

2. Optional: place a PDF in this folder as `sample.pdf`.

## Scripts (run in order)

### 1 — Upload + process

```powershell
.\1_upload_and_process.ps1
.\1_upload_and_process.ps1 -PdfPath "C:\path\to\my.pdf"
```

### 2 — Inspect Qdrant

```powershell
.\2_check_qdrant.ps1 -DocumentId "PASTE-DOC-ID-HERE"
```

### 3 — Ask a question

```powershell
.\3_ask_question.ps1 -Question "What components are covered under the powertrain warranty?"
```

Until the document is certified in the UI (or via `set_certified.ps1`), search returns nothing because production filters `repository = certified`.

### Fast-forward certify (test only)

```powershell
.\set_certified.ps1 -DocumentId "PASTE-DOC-ID-HERE"
```

Updates Qdrant collection `warranty_chunks` only — not `warranty_chunks_v2`.
