# Docling Ingestion Foundation

Standalone **Docling** microservice + small **FastAPI bridge** for structured PDF extraction (no embeddings, no vector DB).

## Architecture

```
PDF upload
    ↓
docling-serve :5001  (quay.io/docling-project/docling-serve, CPU)
    ↓
Structured document JSON (sections, headings, tables, hierarchy)
    ↓
Downstream warranty ingestion pipeline (ai-service OCR tier)
```

## 1. Start Docling (exact image)

```powershell
cd C:\Users\rudra\Desktop\Waranty_POC\warranty-platform\docling-ingest
docker compose -f docker-compose.docling.yml up -d
```

Or manually:

```powershell
docker pull quay.io/docling-project/docling-serve
docker run -d --name docling-service -p 5001:5001 --restart unless-stopped quay.io/docling-project/docling-serve
```

Wait until healthy (first start can take 2–5 minutes for model load). UI: http://localhost:5001/ui

## 2. Extract a PDF (CLI)

```powershell
cd docling-ingest
pip install -r bridge/requirements.txt
python extract_pdf.py "C:\Users\rudra\Desktop\Waranty_POC\1172 WARRENTY.pdf"
```

Output: `output/1172_WARRENTY_docling_report.txt` and `output/1172_WARRENTY_docling_raw.json`

## 3. Bridge API (optional)

```powershell
pip install -r bridge/requirements.txt
cd bridge
$env:DOCLING_URL="http://localhost:5001"
python app.py
```

- `GET http://localhost:5010/health`
- `POST http://localhost:5010/ingest/pdf` — multipart PDF upload

## Wire into warranty-platform

Set in `.env`:

```
DOCLING_URL=http://localhost:5001
OCR_METHOD=docling
```

Inside Docker network (if docling added to compose): `DOCLING_URL=http://docling-service:5001`
