"""
embedder.py — Dense vector embedding via OpenAI text-embedding-3-small.

Handles batching automatically (OpenAI accepts up to 2048 inputs per request).
Uses the model configured in RagConfig.embedding_model (default: text-embedding-3-small, 1536 dims).
"""

import logging

from openai import OpenAI

from config import RagConfig

logger = logging.getLogger("embedder")


def embed_texts(cfg: RagConfig, texts: list[str]) -> list[list[float]]:
    """
    Batch embed a list of texts. Returns vectors in the same order.

    Uses batches of 512 to stay well under the 2048-input API limit
    while keeping throughput high.
    """
    if not texts:
        return []

    client = OpenAI(api_key=cfg.openai_api_key)
    all_embeddings: list[list[float]] = []
    batch_size = 512

    for i in range(0, len(texts), batch_size):
        batch = texts[i: i + batch_size]
        logger.info("  Embedding batch %d-%d of %d", i, i + len(batch), len(texts))

        resp = client.embeddings.create(
            model=cfg.embedding_model,
            input=batch,
        )
        # Sort by index to guarantee order matches input
        sorted_data = sorted(resp.data, key=lambda x: x.index)
        all_embeddings.extend([item.embedding for item in sorted_data])

    logger.info("Embedded %d texts → %d vectors (%d dims)",
                len(texts), len(all_embeddings), len(all_embeddings[0]) if all_embeddings else 0)
    return all_embeddings


def embed_single(cfg: RagConfig, text: str) -> list[float]:
    """Embed a single text (convenience for query-time)."""
    vecs = embed_texts(cfg, [text])
    return vecs[0] if vecs else []
