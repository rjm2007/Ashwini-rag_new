"""
sparse_encoder.py — BM25-style sparse vector encoder for Qdrant hybrid search.

Produces sparse vectors where:
  - Indices = hash of each token modulo vocab_size (consistent mapping)
  - Values  = BM25 term-frequency score per token

Qdrant's Modifier.IDF on the sparse vector config multiplies each value
by the inverse document frequency computed across the collection,
giving us proper BM25 ranking without needing a separate IDF dictionary.

Why BM25 sparse alongside dense (from RAG research doc §3.1):
  Dense embeddings blur exact tokens. Warranty queries depend on exact
  matches for part numbers (P0420), VINs, coverage codes (D0001, ET460),
  and model codes (VNL64T). BM25 catches these precisely.
"""

import re
from collections import Counter

from qdrant_client.models import SparseVector

STOPWORDS = frozenset({
    "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
    "have", "has", "had", "do", "does", "did", "will", "would", "could",
    "should", "may", "might", "can", "shall", "to", "of", "in", "for",
    "on", "with", "at", "by", "from", "as", "into", "through", "during",
    "before", "after", "above", "below", "between", "out", "off", "over",
    "under", "again", "further", "then", "once", "here", "there", "when",
    "where", "why", "how", "all", "each", "every", "both", "few", "more",
    "most", "other", "some", "such", "no", "nor", "not", "only", "own",
    "same", "so", "than", "too", "very", "just", "because", "but", "and",
    "or", "if", "while", "that", "this", "it", "its", "they", "them",
    "their", "we", "our", "you", "your", "he", "him", "his", "she", "her",
    "page", "see", "also", "may", "must", "per", "any", "which",
})


class BM25SparseEncoder:

    def __init__(self, vocab_size: int = 262144, k1: float = 1.2, b: float = 0.75):
        self.vocab_size = vocab_size
        self.k1 = k1
        self.b = b
        self.avg_dl = 400  # approximate avg doc length in tokens

    @staticmethod
    def tokenize(text: str) -> list[str]:
        """Lowercase, split on non-alphanumeric, filter stopwords and tiny tokens."""
        tokens = re.findall(r"[a-z0-9]+", text.lower())
        return [t for t in tokens if len(t) > 1 and t not in STOPWORDS]

    def encode(self, text: str) -> SparseVector:
        """Convert text to a Qdrant SparseVector with BM25 TF scores."""
        tokens = self.tokenize(text)
        if not tokens:
            # Qdrant requires at least one index/value pair
            return SparseVector(indices=[0], values=[0.001])

        tf = Counter(tokens)
        doc_len = len(tokens)

        indices: list[int] = []
        values: list[float] = []

        # Qdrant requires unique sparse indices — merge hash collisions.
        merged: dict[int, float] = {}
        for token, count in tf.items():
            idx = abs(hash(token)) % self.vocab_size
            tf_score = (count * (self.k1 + 1)) / (
                count + self.k1 * (1 - self.b + self.b * doc_len / self.avg_dl)
            )
            merged[idx] = merged.get(idx, 0.0) + float(tf_score)

        indices = list(merged.keys())
        values = list(merged.values())
        return SparseVector(indices=indices, values=values)
