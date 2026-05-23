#!/usr/bin/env python3
"""
ingest_v2.py — Ingest warranty PDFs with the new RAG v2 strategy.

Orchestrates: PDF extraction (Textract → Docling → OpenAI Vision fallback)
              → metadata extraction → tiktoken chunking → contextual retrieval
              → dense + sparse embedding → Qdrant upsert.

Usage:
  python ingest_v2.py --pdf-dir ./pdfs                       # all PDFs in folder
  python ingest_v2.py --pdf ./VOLVO_WARRANTY_2019.pdf         # single PDF
  python ingest_v2.py --pdf-dir ./pdfs --no-context           # skip contextual retrieval
  python ingest_v2.py --pdf-dir ./pdfs --auto-certify         # immediately certify
  python ingest_v2.py --pdf-dir ./pdfs --reset                # delete + recreate collection
  python ingest_v2.py --pdf-dir ./pdfs --ocr-method docling   # force specific OCR tier
"""

import argparse
import hashlib
import json
import logging
import sys
import time
from pathlib import Path

from config import load_config
from pdf_reader import PDFReader
from chunker import TiktokenChunker
from sparse_encoder import BM25SparseEncoder
from contextual_retrieval import ContextualRetrieval
from metadata_extractor import extract_metadata
from embedder import embed_texts
from qdrant_manager import QdrantV2Manager

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s :: %(message)s",
)
logger = logging.getLogger("ingest_v2")


def make_document_id(filename: str) -> str:
    """Stable document ID from filename."""
    name = Path(filename).stem.lower().replace(" ", "_")
    short_hash = hashlib.md5(filename.encode()).hexdigest()[:8]
    return f"{name}_{short_hash}"


def process_one_pdf(
    pdf_path: str,
    cfg,
    reader: PDFReader,
    ocr_method: str,
    chunker: TiktokenChunker,
    sparse_enc: BM25SparseEncoder,
    qdrant: QdrantV2Manager,
    contextual: ContextualRetrieval | None,
) -> dict:
    """Full ingestion pipeline for one PDF file."""

    filename = Path(pdf_path).name
    doc_id = make_document_id(filename)
    t0 = time.time()

    logger.info("=" * 60)
    logger.info("PROCESSING: %s → doc_id=%s", filename, doc_id)
    logger.info("=" * 60)

    # ── 1. PDF text extraction (Textract → Docling → OpenAI Vision) ─
    logger.info("STEP 1/6: PDF extraction (method=%s)", ocr_method)
    pages = reader.extract(pdf_path, method=ocr_method)
    full_text = "\n\n".join(p["text"] for p in pages if p.get("text"))

    if len(full_text) < 20:
        logger.warning("  SKIP: too little text from %s (%d chars)", filename, len(full_text))
        return {"filename": filename, "status": "skipped", "reason": "no_text"}

    # ── 2. Metadata extraction ──────────────────────────────────
    logger.info("STEP 2/6: Metadata extraction (%s)", cfg.small_model)
    metadata = extract_metadata(cfg, full_text)

    # ── 3. Tiktoken chunking ────────────────────────────────────
    logger.info("STEP 3/6: Tiktoken chunking (target=%d tokens)", cfg.chunk_target_tokens)
    chunks = chunker.chunk_pages(pages)
    if not chunks:
        logger.warning("  SKIP: no chunks from %s", filename)
        return {"filename": filename, "status": "skipped", "reason": "no_chunks"}

    # ── 4. Contextual retrieval ─────────────────────────────────
    if contextual:
        logger.info("STEP 4/6: Contextual retrieval (%s)", cfg.small_model)
        chunks = contextual.contextualize_chunks(full_text, chunks)
    else:
        logger.info("STEP 4/6: Contextual retrieval — SKIPPED")
        for c in chunks:
            c["contextualizedText"] = c["chunkText"]
            c["contextBlurb"] = ""

    # ── 5. Dense embedding ──────────────────────────────────────
    logger.info("STEP 5/6: Dense embedding (%s, %d dims)", cfg.embedding_model, cfg.embedding_dims)
    texts_to_embed = [c["contextualizedText"] for c in chunks]
    dense_vectors = embed_texts(cfg, texts_to_embed)

    # ── 6. BM25 sparse + Qdrant upsert ─────────────────────────
    logger.info("STEP 6/6: BM25 sparse vectors + Qdrant upsert")
    enriched = []
    for i, chunk in enumerate(chunks):
        sparse_vec = sparse_enc.encode(chunk["contextualizedText"])

        enriched.append({
            # Vectors (consumed by qdrant_manager, not stored as payload)
            "vector": dense_vectors[i],
            "sparse_vector": sparse_vec,
            # Chunk content
            "chunkText": chunk["chunkText"],
            "contextualizedText": chunk["contextualizedText"],
            "contextBlurb": chunk.get("contextBlurb", ""),
            # Chunk position
            "chunkIndex": chunk["chunkIndex"],
            "pageNumber": chunk["pageNumber"],
            "sectionHeading": chunk["sectionHeading"],
            "chunkType": chunk.get("chunkType", "prose"),
            "coverageCodes": chunk.get("coverageCodes") or [],
            "tokenCount": chunk["tokenCount"],
            # Document metadata
            "documentId": doc_id,
            "filename": filename,
            "make": metadata.get("make"),
            "model": metadata.get("model"),
            "year": metadata.get("year"),
            "warrantyType": metadata.get("warranty_type"),
            "country": metadata.get("country"),
            "vin": metadata.get("vin"),
            "chassisId": metadata.get("chassis_id"),
            "coverageSummary": metadata.get("coverage_summary"),
            # Lifecycle
            "repository": "pending_review",
            # Processing info
            "embeddingModel": cfg.embedding_model,
            "chunkStrategy": "warranty_strategic_v2",
            "hasContextBlurb": bool(chunk.get("contextBlurb")),
        })

    upserted = qdrant.upsert_chunks(doc_id, enriched)
    elapsed = round(time.time() - t0, 1)

    logger.info("DONE: %s → %d chunks in %.1fs", filename, upserted, elapsed)

    return {
        "filename": filename,
        "documentId": doc_id,
        "status": "ok",
        "pages": len(pages),
        "totalChars": len(full_text),
        "chunks": len(chunks),
        "metadata": metadata,
        "elapsed_seconds": elapsed,
    }


def main():
    parser = argparse.ArgumentParser(description="Ingest warranty PDFs (RAG v2)")
    src = parser.add_mutually_exclusive_group(required=True)
    src.add_argument("--pdf-dir", help="Directory containing PDF files")
    src.add_argument("--pdf", help="Single PDF file path")
    parser.add_argument("--no-context", action="store_true",
                        help="Skip contextual retrieval (faster, cheaper)")
    parser.add_argument("--auto-certify", action="store_true",
                        help="Set repository=certified immediately (skip review)")
    parser.add_argument("--reset", action="store_true",
                        help="Delete and recreate the Qdrant collection")
    parser.add_argument("--ocr-method", default="auto",
                        choices=["auto", "textract", "docling", "openai_vision"],
                        help="PDF extraction method: auto (fallback chain), textract, docling, or openai_vision")
    parser.add_argument("--env", help="Path to .env file")
    args = parser.parse_args()

    cfg = load_config(args.env)

    # Validate: at minimum we need OpenAI key (for embedding + optional vision OCR)
    if not cfg.openai_api_key:
        logger.error("OPENAI_API_KEY not set. Check your .env file.")
        sys.exit(1)

    # Warn about OCR tiers availability
    if args.ocr_method == "textract" and (not cfg.aws_access_key_id or not cfg.s3_bucket):
        logger.error("Textract requires AWS_ACCESS_KEY_ID + S3_BUCKET_NAME in .env")
        sys.exit(1)

    if args.ocr_method == "docling":
        logger.info("Docling Docker mode: calling %s", cfg.docling_url)

    if args.ocr_method == "auto":
        tiers = []
        if cfg.aws_access_key_id and cfg.s3_bucket:
            tiers.append("Textract")
        tiers.append("Docling Docker (%s)" % cfg.docling_url)
        tiers.append("OpenAI Vision")
        logger.info("OCR fallback chain: %s", " → ".join(tiers))

    # Gather PDF paths
    if args.pdf:
        pdf_paths = [args.pdf]
    else:
        pdf_dir = Path(args.pdf_dir)
        pdf_paths = sorted(str(p) for p in pdf_dir.glob("*.pdf"))
        if not pdf_paths:
            pdf_paths = sorted(str(p) for p in pdf_dir.glob("*.PDF"))
    if not pdf_paths:
        logger.error("No PDF files found")
        sys.exit(1)

    logger.info("Found %d PDF(s) to process", len(pdf_paths))
    logger.info("Collection: %s | Context: %s | Auto-certify: %s | OCR: %s",
                cfg.collection_name, "OFF" if args.no_context else "ON",
                args.auto_certify, args.ocr_method)

    # Initialize modules
    reader = PDFReader(cfg)
    chunker = TiktokenChunker(
        target_tokens=cfg.chunk_target_tokens,
        max_tokens=cfg.chunk_max_tokens,
        min_tokens=cfg.chunk_min_tokens,
        overlap_tokens=cfg.chunk_overlap_tokens,
    )
    sparse_enc = BM25SparseEncoder(vocab_size=cfg.bm25_vocab_size)
    qdrant = QdrantV2Manager(cfg)
    contextual = None if args.no_context else ContextualRetrieval(cfg)

    qdrant.create_collection(recreate=args.reset)

    # Process PDFs
    results = []
    for pdf_path in pdf_paths:
        try:
            result = process_one_pdf(pdf_path, cfg, reader, args.ocr_method,
                                     chunker, sparse_enc, qdrant, contextual)
            results.append(result)

            if args.auto_certify and result.get("status") == "ok":
                n = qdrant.set_repository(result["documentId"], "certified")
                logger.info("  Auto-certified %d chunks", n)
                result["repository"] = "certified"

        except Exception as e:
            logger.exception("FAILED: %s — %s", pdf_path, e)
            results.append({"filename": Path(pdf_path).name, "status": "failed", "error": str(e)})

    # ── Summary ─────────────────────────────────────────────────
    print("\n" + "=" * 60)
    print("INGESTION SUMMARY")
    print("=" * 60)

    ok = [r for r in results if r.get("status") == "ok"]
    total_chunks = sum(r.get("chunks", 0) for r in results)
    print(f"  PDFs processed: {len(results)}")
    print(f"  Successful:     {len(ok)}")
    print(f"  Total chunks:   {total_chunks}")
    print(f"  Collection:     {cfg.collection_name}")
    print()

    for r in results:
        icon = "OK" if r.get("status") == "ok" else "FAIL"
        print(f"  [{icon}] {r.get('filename', '?')}")
        if r.get("status") == "ok":
            m = r.get("metadata", {})
            print(f"        doc_id={r['documentId']}  chunks={r['chunks']}  "
                  f"make={m.get('make')}  model={m.get('model')}  year={m.get('year')}")

    info = qdrant.get_collection_info()
    print(f"\n  Qdrant: {info.get('points_count', '?')} total points in '{cfg.collection_name}'")

    # Save detailed results
    out = Path("ingest_results.json")
    out.write_text(json.dumps(results, indent=2, default=str))
    print(f"  Results saved to {out}\n")


if __name__ == "__main__":
    main()
