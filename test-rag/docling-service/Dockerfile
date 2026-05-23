FROM python:3.11-slim

WORKDIR /app

# System deps for Docling's PDF parsing (poppler, tesseract for scanned PDFs)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    libgl1 \
    libglib2.0-0 \
    poppler-utils \
    tesseract-ocr \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
# Pin docling to a known-good version; bump as needed
RUN pip install --no-cache-dir \
    "docling>=2.15.0" \
    "fastapi>=0.115.0" \
    "uvicorn[standard]>=0.30.0" \
    "python-multipart>=0.0.9"

# Pre-download Docling's AI models during build (~1GB).
# This avoids a 2-3 minute cold-start on the first request.
RUN python -c "\
from docling.document_converter import DocumentConverter; \
print('Pre-loading Docling models...'); \
_ = DocumentConverter(); \
print('Models cached successfully.')"

COPY app.py .

EXPOSE 5001

# Workers=1 because DocumentConverter holds ~1GB in memory.
# Increase only if you have enough RAM (each worker ≈ 1.5GB).
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "5001", "--workers", "1", "--timeout-keep-alive", "120"]
