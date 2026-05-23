"""
config.py — Loads environment variables into a typed RagConfig dataclass.

Searches for .env in CWD, then walks up parent directories (so you can
run from test-rag/ and it finds warranty-platform/.env).
"""

import os
from dataclasses import dataclass
from pathlib import Path
from dotenv import load_dotenv


@dataclass
class RagConfig:
    """All settings for the test-rag v2 pipeline."""

    # AWS (required for Textract OCR)
    aws_region: str = "us-east-1"
    aws_access_key_id: str = ""
    aws_secret_access_key: str = ""
    s3_bucket: str = ""

    # OpenAI
    openai_api_key: str = ""
    small_model: str = "gpt-4o-mini"       # metadata extraction, contextual retrieval
    large_model: str = "gpt-4o"            # final reasoning / answering
    embedding_model: str = "text-embedding-3-small"
    embedding_dims: int = 1536

    # Qdrant
    qdrant_url: str = "http://localhost:6333"
    qdrant_api_key: str = ""
    collection_name: str = "warranty_chunks_v2"

    # Docling Docker service (Tier 2 OCR)
    docling_url: str = "http://localhost:5001"

    # Chunking (from RAG research doc §1.2)
    chunk_target_tokens: int = 700         # sweet spot for warranty clauses
    chunk_max_tokens: int = 1024           # hard cap
    chunk_min_tokens: int = 50             # filter tiny orphans
    chunk_overlap_tokens: int = 100        # ~15% of 700

    # BM25 sparse encoder
    bm25_vocab_size: int = 262144          # 2^18 hash buckets

    # Textract
    textract_poll_interval: int = 3        # seconds between polls
    textract_timeout: int = 600            # 10 minutes max wait


def resolve_qdrant_url() -> str:
    """
    Pick a Qdrant URL that works from the current machine.

    warranty-platform/.env often sets QDRANT_URL=http://qdrant:6333 for containers.
    That hostname does not resolve on the Windows host when you run test-rag scripts
    locally — use localhost instead.
    """
    explicit = (os.getenv("QDRANT_URL_LOCAL") or "").strip()
    if explicit:
        return explicit

    url = (os.getenv("QDRANT_URL") or "http://localhost:6333").strip()
    host = url.split("://", 1)[-1].split("/", 1)[0].lower()
    if host.startswith("qdrant:") or host == "qdrant":
        return "http://localhost:6333"
    return url


def load_config(env_path: str | None = None) -> RagConfig:
    """
    Load config from .env file.
    If env_path is not given, walks up from CWD to find the nearest .env.
    """
    if env_path:
        load_dotenv(env_path)
    else:
        for parent in [Path.cwd()] + list(Path.cwd().parents):
            candidate = parent / ".env"
            if candidate.exists():
                load_dotenv(candidate)
                break

    return RagConfig(
        aws_region=os.getenv("AWS_REGION", "us-east-1"),
        aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID", ""),
        aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY", ""),
        s3_bucket=os.getenv("S3_BUCKET_NAME", ""),
        openai_api_key=os.getenv("OPENAI_API_KEY", ""),
        small_model=os.getenv("SMALL_MODEL", "gpt-4o-mini"),
        large_model=os.getenv("LARGE_MODEL", "gpt-4o"),
        qdrant_url=resolve_qdrant_url(),
        qdrant_api_key=os.getenv("QDRANT_API_KEY", ""),
        collection_name=os.getenv("QDRANT_COLLECTION_V2", "warranty_chunks_v2"),
        docling_url=os.getenv("DOCLING_URL", "http://localhost:5001"),
    )
