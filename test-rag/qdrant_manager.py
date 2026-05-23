"""
qdrant_manager.py — Manages the warranty_chunks_v2 Qdrant collection.

Collection schema:
  Named vectors:
    "dense"       — 1536-dim cosine (OpenAI text-embedding-3-small)
    "bm25_sparse" — sparse BM25 with Modifier.IDF (Qdrant computes IDF internally)

  Payload indexes (pushed into HNSW traversal for fast filtered search):
    repository, documentId, make, model, year, warrantyType, filename

Hybrid search pattern (from RAG research doc §3.2):
  1. Prefetch top-N from dense vector index
  2. Prefetch top-N from sparse BM25 index
  3. Reciprocal Rank Fusion (RRF) merges both ranked lists
  4. Return top-K fused results
"""

import hashlib
import logging

from qdrant_client import QdrantClient
from qdrant_client.models import (
    Distance,
    FieldCondition,
    Filter,
    Fusion,
    FusionQuery,
    MatchValue,
    Modifier,
    PayloadSchemaType,
    PointStruct,
    Prefetch,
    SparseVector,
    SparseVectorParams,
    VectorParams,
)

from config import RagConfig

logger = logging.getLogger("qdrant_manager")


class QdrantV2Manager:

    def __init__(self, cfg: RagConfig):
        self.cfg = cfg
        api_key = cfg.qdrant_api_key or None
        self.client = QdrantClient(
            url=cfg.qdrant_url,
            api_key=api_key,
            check_compatibility=False,
        )
        logger.info("Qdrant client → %s (collection=%s)", cfg.qdrant_url, cfg.collection_name)
        self.collection = cfg.collection_name

    # ── Collection lifecycle ────────────────────────────────────

    def create_collection(self, recreate: bool = False) -> None:
        """Create the v2 collection with dense + sparse vector configs."""
        existing = [c.name for c in self.client.get_collections().collections]

        if self.collection in existing:
            if recreate:
                logger.info("Deleting existing collection '%s'", self.collection)
                self.client.delete_collection(self.collection)
            else:
                logger.info("Collection '%s' already exists", self.collection)
                return

        logger.info("Creating collection '%s' (dense=%d dims + BM25 sparse)",
                     self.collection, self.cfg.embedding_dims)

        self.client.create_collection(
            collection_name=self.collection,
            vectors_config={
                "dense": VectorParams(
                    size=self.cfg.embedding_dims,
                    distance=Distance.COSINE,
                )
            },
            sparse_vectors_config={
                "bm25_sparse": SparseVectorParams(
                    modifier=Modifier.IDF,
                )
            },
        )

        # Create payload indexes for filtered HNSW traversal
        index_fields = [
            ("repository", PayloadSchemaType.KEYWORD),
            ("documentId", PayloadSchemaType.KEYWORD),
            ("make", PayloadSchemaType.KEYWORD),
            ("model", PayloadSchemaType.KEYWORD),
            ("year", PayloadSchemaType.INTEGER),
            ("warrantyType", PayloadSchemaType.KEYWORD),
            ("filename", PayloadSchemaType.KEYWORD),
        ]
        for field_name, schema in index_fields:
            try:
                self.client.create_payload_index(
                    collection_name=self.collection,
                    field_name=field_name,
                    field_schema=schema,
                )
            except Exception:
                pass  # index may already exist

        logger.info("Collection '%s' created with %d payload indexes",
                     self.collection, len(index_fields))

    # ── Upsert ──────────────────────────────────────────────────

    def upsert_chunks(self, document_id: str, chunks: list[dict]) -> int:
        """
        Upsert chunks with both dense and sparse vectors.

        Each chunk dict MUST contain:
          - "vector": list[float]         (dense embedding)
          - "sparse_vector": SparseVector (BM25 sparse)
          - everything else becomes payload
        """
        points: list[PointStruct] = []

        for idx, chunk in enumerate(chunks):
            # Deterministic point ID from document + chunk index
            id_str = f"{document_id}-{idx}"
            point_id = int(hashlib.md5(id_str.encode()).hexdigest()[:12], 16)

            # Separate vectors from payload
            dense_vec = chunk.pop("vector")
            sparse_vec = chunk.pop("sparse_vector")

            points.append(PointStruct(
                id=point_id,
                vector={
                    "dense": dense_vec,
                    "bm25_sparse": sparse_vec,
                },
                payload=chunk,  # everything else is payload
            ))

        # Batch upsert (100 points per batch)
        for i in range(0, len(points), 100):
            batch = points[i: i + 100]
            self.client.upsert(collection_name=self.collection, points=batch)

        logger.info("Upserted %d chunks for doc '%s'", len(points), document_id)
        return len(points)

    # ── Hybrid Search (Dense + BM25 + RRF) ──────────────────────

    def hybrid_search(
        self,
        dense_vector: list[float],
        sparse_vector: SparseVector,
        filters: dict | None = None,
        top_k: int = 10,
        prefetch_limit: int = 50,
    ) -> list:
        """
        Hybrid search: dense + BM25 sparse vectors fused with RRF.

        This is the core retrieval strategy from RAG research doc §3.2:
          - Prefetch top-N candidates from each index independently
          - Reciprocal Rank Fusion combines the ranked lists
          - Returns top-K fused results

        RRF formula: score(d) = Σ 1/(k + rank_i(d)) with k=60
        It is parameter-free, robust, and doesn't need score normalization.
        """
        query_filter = self._build_filter(filters)

        results = self.client.query_points(
            collection_name=self.collection,
            prefetch=[
                Prefetch(
                    query=dense_vector,
                    using="dense",
                    limit=prefetch_limit,
                    filter=query_filter,
                ),
                Prefetch(
                    query=sparse_vector,
                    using="bm25_sparse",
                    limit=prefetch_limit,
                    filter=query_filter,
                ),
            ],
            query=FusionQuery(fusion=Fusion.RRF),
            limit=top_k,
            with_payload=True,
        )

        logger.info("Hybrid search returned %d results (prefetch=%d per index)",
                     len(results.points), prefetch_limit)
        return results.points

    # ── Dense-only search (for comparison) ──────────────────────

    def dense_search(
        self,
        dense_vector: list[float],
        filters: dict | None = None,
        top_k: int = 10,
    ) -> list:
        """Plain dense search without BM25 — for A/B comparison."""
        query_filter = self._build_filter(filters)

        results = self.client.query_points(
            collection_name=self.collection,
            query=dense_vector,
            using="dense",
            query_filter=query_filter,
            limit=top_k,
            with_payload=True,
        )
        return results.points

    # ── Repository management ───────────────────────────────────

    def set_repository(self, document_id: str, repository: str) -> int:
        """Set repository tag on all chunks for a document. Returns count updated."""
        doc_filter = Filter(
            must=[FieldCondition(key="documentId", match=MatchValue(value=document_id))]
        )
        self.client.set_payload(
            collection_name=self.collection,
            payload={"repository": repository},
            points=doc_filter,
            wait=True,
        )
        count = self.client.count(
            collection_name=self.collection,
            count_filter=Filter(must=[
                FieldCondition(key="documentId", match=MatchValue(value=document_id)),
                FieldCondition(key="repository", match=MatchValue(value=repository)),
            ]),
            exact=True,
        )
        logger.info("Set repository=%s on %d chunks for doc '%s'",
                     repository, count.count, document_id)
        return count.count

    def count_by_document(self, document_id: str) -> int:
        """Count chunks belonging to a document."""
        result = self.client.count(
            collection_name=self.collection,
            count_filter=Filter(
                must=[FieldCondition(key="documentId", match=MatchValue(value=document_id))]
            ),
            exact=True,
        )
        return result.count

    def get_collection_info(self) -> dict:
        """Get collection stats for display."""
        try:
            info = self.client.get_collection(self.collection)
            return {
                "name": self.collection,
                "points_count": info.points_count,
                "status": str(info.status),
            }
        except Exception:
            return {"name": self.collection, "error": "not found"}

    # ── Internal helpers ────────────────────────────────────────

    @staticmethod
    def _build_filter(filters: dict | None) -> Filter | None:
        """Build a Qdrant Filter from a simple key-value dict."""
        if not filters:
            return None

        conditions = []
        for key, value in filters.items():
            if value is None:
                continue
            if isinstance(value, float) and value.is_integer():
                value = int(value)
            if isinstance(value, (str, int, bool)):
                conditions.append(
                    FieldCondition(key=key, match=MatchValue(value=value))
                )

        return Filter(must=conditions) if conditions else None
