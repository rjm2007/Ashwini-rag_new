from openai import OpenAI
from ..config import settings


def embed_chunks(chunks: list[str]) -> list[list[float]]:
    """This function creates embedding vectors for text chunks in batches."""
    if not chunks:
        return []
    client = OpenAI(api_key=settings.openai_api_key)
    response = client.embeddings.create(model="text-embedding-3-small", input=chunks)
    return [item.embedding for item in response.data]
