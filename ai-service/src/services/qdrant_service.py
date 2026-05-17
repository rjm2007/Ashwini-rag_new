from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct, Filter, FieldCondition, MatchValue
from ..config import settings


class QdrantService:
    """This class wraps Qdrant operations for upsert, search, and repository update."""

    def __init__(self) -> None:
        api_key = settings.qdrant_api_key or None
        self.client = QdrantClient(url=settings.qdrant_url, api_key=api_key)
        self.collection = settings.qdrant_collection
        self.ensure_collection()

    def ensure_collection(self) -> None:
        """This function ensures warranty chunk collection exists."""
        existing = [item.name for item in self.client.get_collections().collections]
        if self.collection not in existing:
            self.client.create_collection(
                collection_name=self.collection,
                vectors_config=VectorParams(size=1536, distance=Distance.COSINE),
            )

    def upsert_chunks(self, document_id: str, chunks_with_metadata: list[dict]) -> None:
        """This function stores chunk vectors and metadata in Qdrant."""
        points = []
        for idx, chunk in enumerate(chunks_with_metadata):
            points.append(
                PointStruct(
                    id=abs(hash(f"{document_id}-{idx}")) % (10**12),
                    vector=chunk["vector"],
                    payload=chunk,
                )
            )
        if points:
            self.client.upsert(collection_name=self.collection, points=points)

    SEARCHABLE_KEYS = {"make", "model", "year", "country", "warrantyType"}

    def search(self, query_vector: list[float], filters: dict, top_k: int = 10) -> list:
        """Searches only certified chunks. Only known scalar filter keys are translated to MatchValue."""
        conditions = [FieldCondition(key="repository", match=MatchValue(value="certified"))]
        for key, value in (filters or {}).items():
            if key not in self.SEARCHABLE_KEYS:
                continue
            if value is None:
                continue
            # Qdrant MatchValue only accepts str, int, or bool. Coerce ints stored as floats.
            if isinstance(value, float) and value.is_integer():
                value = int(value)
            if not isinstance(value, (str, int, bool)):
                continue
            conditions.append(FieldCondition(key=key, match=MatchValue(value=value)))
        response = self.client.query_points(
            collection_name=self.collection,
            query=query_vector,
            query_filter=Filter(must=conditions),
            limit=top_k,
            with_payload=True,
        )
        return response.points

    def update_repository(self, document_id: str, new_repo: str) -> int:
        """Sets repository on every chunk that belongs to a document. Returns updated count."""
        document_filter = Filter(
            must=[FieldCondition(key="documentId", match=MatchValue(value=document_id))]
        )
        self.client.set_payload(
            collection_name=self.collection,
            payload={"repository": new_repo},
            points=document_filter,
            wait=True,
        )
        counted = self.client.count(
            collection_name=self.collection,
            count_filter=Filter(
                must=[
                    FieldCondition(key="documentId", match=MatchValue(value=document_id)),
                    FieldCondition(key="repository", match=MatchValue(value=new_repo)),
                ]
            ),
            exact=True,
        )
        return counted.count
