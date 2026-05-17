from openai import OpenAI
from ..config import settings
from ..services.qdrant_service import QdrantService


def retrieve_chunks(question: str, filters: dict) -> list[dict]:
    """This function performs certified-only semantic retrieval from Qdrant."""
    client = OpenAI(api_key=settings.openai_api_key)
    embedding = client.embeddings.create(model="text-embedding-3-small", input=[question]).data[0].embedding
    qdrant = QdrantService()
    results = qdrant.search(embedding, filters, top_k=10)
    return [
      {
          "score": item.score,
          "payload": item.payload,
      }
      for item in results
    ]
