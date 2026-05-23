#!/usr/bin/env python3
"""
search_v2.py — Hybrid search + LLM reasoning over the warranty_chunks_v2 collection.

Pipeline:
  1. Embed question → dense vector (text-embedding-3-small)
  2. Encode question → BM25 sparse vector
  3. Hybrid search Qdrant (dense + sparse prefetch → RRF fusion)
  4. Format retrieved chunks as numbered evidence
  5. LLM reasoning with chain-of-thought + mandatory citations
  6. Print answer + sources

Usage:
  python search_v2.py --question "What engine components are covered?"
  python search_v2.py --question "Is the turbocharger covered?" --top-k 5
  python search_v2.py --question "Coverage for VIN 4V4NC9EH0LN218368?" --make Volvo
  python search_v2.py --question "What are the exclusions?" --dense-only   # A/B test
"""

import argparse
import json
import logging
import sys

from openai import OpenAI

from openai_compat import chat_create_kwargs

from config import load_config, RagConfig
from embedder import embed_single
from sparse_encoder import BM25SparseEncoder
from qdrant_manager import QdrantV2Manager
from retrieval_utils import dedupe_search_results

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s :: %(message)s",
)
logger = logging.getLogger("search_v2")


REASONING_PROMPT = """You are a warranty coverage analyst. You answer questions ONLY from
the provided evidence chunks. Each chunk has an index [1], [2], etc.

RULES:
1. Every factual claim MUST cite at least one evidence index like [1] or [2][3].
2. If the evidence does not contain the answer, say "The available warranty documents
   do not address this." Do NOT guess.
3. Include specific numbers (mileage limits, time periods, coverage codes) when present.
4. Be concise — 3-5 sentences max unless the question requires more detail.

QUESTION: {question}

EVIDENCE CHUNKS:
{evidence}

Answer with citations:"""


def format_evidence(results: list) -> str:
    """Format Qdrant search results as numbered evidence for the LLM."""
    parts = []
    for i, point in enumerate(results, 1):
        p = point.payload
        header = f"[{i}] page={p.get('pageNumber', '?')} | doc={p.get('filename', '?')}"
        if p.get("chunkType"):
            header += f" | type={p.get('chunkType')}"
        if p.get("make"):
            header += f" | {p.get('make')} {p.get('model', '')} {p.get('year', '')}"
        codes = p.get("coverageCodes") or []
        if codes:
            header += f" | codes={','.join(codes[:5])}"
        text = p.get("chunkText", "")
        parts.append(f"{header}\n{text}")
    return "\n\n---\n\n".join(parts)


def search_and_answer(
    question: str,
    cfg: RagConfig,
    qdrant: QdrantV2Manager,
    sparse_enc: BM25SparseEncoder,
    filters: dict | None = None,
    top_k: int = 10,
    dense_only: bool = False,
) -> dict:
    """
    Full search → answer pipeline.

    Returns: {
        "question": str,
        "answer": str,
        "sources": [{"page": int, "filename": str, "score": float, "preview": str}],
        "chunks_retrieved": int,
        "search_mode": "hybrid" | "dense_only",
    }
    """
    # Always filter to certified-only (matches production behavior)
    search_filters = {"repository": "certified"}
    if filters:
        search_filters.update(filters)

    # ── 1. Embed question ───────────────────────────────────────
    logger.info("Embedding question: '%s'", question[:80])
    dense_vec = embed_single(cfg, question)

    if dense_only:
        # A/B comparison: dense-only search
        logger.info("Dense-only search (top_k=%d)", top_k)
        fetch_k = min(max(top_k * 3, top_k), 30)
        results = qdrant.dense_search(dense_vec, filters=search_filters, top_k=fetch_k)
        results = dedupe_search_results(results, top_k)
        search_mode = "dense_only"
    else:
        # ── 2. BM25 sparse vector ──────────────────────────────
        sparse_vec = sparse_enc.encode(question)

        # ── 3. Hybrid search (dense + sparse + RRF) ────────────
        logger.info("Hybrid search (dense + BM25 + RRF, top_k=%d)", top_k)
        fetch_k = min(max(top_k * 3, top_k), 30)
        results = qdrant.hybrid_search(
            dense_vector=dense_vec,
            sparse_vector=sparse_vec,
            filters=search_filters,
            top_k=fetch_k,
        )
        results = dedupe_search_results(results, top_k)
        search_mode = "hybrid"

    if not results:
        return {
            "question": question,
            "answer": "No certified warranty documents found matching your query. "
                      "Make sure documents are ingested and certified.",
            "sources": [],
            "chunks_retrieved": 0,
            "search_mode": search_mode,
        }

    logger.info("Retrieved %d chunks", len(results))

    # ── 4. Format evidence ──────────────────────────────────────
    evidence_text = format_evidence(results)

    # ── 5. LLM reasoning ───────────────────────────────────────
    logger.info("LLM reasoning (%s)", cfg.large_model)
    client = OpenAI(api_key=cfg.openai_api_key)

    try:
        resp = client.chat.completions.create(
            model=cfg.large_model,
            messages=[
                {"role": "system", "content": "You are a warranty coverage analyst. Always cite evidence by index."},
                {"role": "user", "content": REASONING_PROMPT.format(
                    question=question,
                    evidence=evidence_text,
                )},
            ],
            **chat_create_kwargs(cfg.large_model, 800),
        )
        answer = resp.choices[0].message.content or "No answer generated."
    except Exception as e:
        logger.error("LLM call failed: %s", e)
        answer = f"LLM reasoning failed: {e}"

    # ── 6. Build sources list ───────────────────────────────────
    sources = []
    for i, point in enumerate(results, 1):
        p = point.payload
        sources.append({
            "index": i,
            "page": p.get("pageNumber"),
            "filename": p.get("filename"),
            "documentId": p.get("documentId"),
            "make": p.get("make"),
            "model": p.get("model"),
            "chunkType": p.get("chunkType"),
            "sectionHeading": p.get("sectionHeading"),
            "coverageCodes": p.get("coverageCodes") or [],
            "score": round(point.score, 4) if point.score else None,
            "preview": (p.get("chunkText") or "")[:150],
            "hasContextBlurb": p.get("hasContextBlurb", False),
        })

    return {
        "question": question,
        "answer": answer,
        "sources": sources,
        "chunks_retrieved": len(results),
        "search_mode": search_mode,
    }


def main():
    parser = argparse.ArgumentParser(description="Search warranty docs (RAG v2 hybrid)")
    parser.add_argument("--question", "-q", required=True, help="Question to ask")
    parser.add_argument("--top-k", type=int, default=10, help="Number of chunks to retrieve")
    parser.add_argument("--make", help="Filter by make (e.g. Volvo)")
    parser.add_argument("--model", help="Filter by model (e.g. VNL64T)")
    parser.add_argument("--year", type=int, help="Filter by year")
    parser.add_argument("--dense-only", action="store_true",
                        help="Use dense-only search (for A/B comparison)")
    parser.add_argument("--env", help="Path to .env file")
    parser.add_argument("--show-sources", action="store_true",
                        help="Print full source details")
    args = parser.parse_args()

    cfg = load_config(args.env)
    if not cfg.openai_api_key:
        logger.error("OPENAI_API_KEY not set")
        sys.exit(1)

    qdrant = QdrantV2Manager(cfg)
    sparse_enc = BM25SparseEncoder(vocab_size=cfg.bm25_vocab_size)

    # Build optional metadata filters
    filters = {}
    if args.make:
        filters["make"] = args.make
    if args.model:
        filters["model"] = args.model
    if args.year:
        filters["year"] = args.year

    result = search_and_answer(
        question=args.question,
        cfg=cfg,
        qdrant=qdrant,
        sparse_enc=sparse_enc,
        filters=filters if filters else None,
        top_k=args.top_k,
        dense_only=args.dense_only,
    )

    # ── Display ─────────────────────────────────────────────────
    print("\n" + "=" * 60)
    print(f"QUESTION: {result['question']}")
    print(f"MODE: {result['search_mode']} | CHUNKS: {result['chunks_retrieved']}")
    print("=" * 60)
    print()
    print(result["answer"])
    print()

    if result["sources"]:
        print("-" * 40)
        print(f"SOURCES ({len(result['sources'])} chunks):")
        for i, src in enumerate(result["sources"], 1):
            ctx_mark = " [+ctx]" if src.get("hasContextBlurb") else ""
            print(f"  [{i}] {src['filename']} p.{src['page']} "
                  f"({src.get('make', '?')} {src.get('model', '')}){ctx_mark}")
            if args.show_sources:
                print(f"       {src['preview']}...")
        print()

    # Save to JSON
    out = "search_result.json"
    with open(out, "w") as f:
        json.dump(result, f, indent=2, default=str)
    print(f"Full result saved to {out}\n")


if __name__ == "__main__":
    main()
