"""HTTP client for official docling-serve v1 API (CPU, no GPU)."""

from __future__ import annotations

import logging
from pathlib import Path

import httpx
import requests

logger = logging.getLogger("docling_client")

DEFAULT_URL = "http://localhost:5001"


def check_health(base_url: str = DEFAULT_URL, timeout: float = 10.0) -> dict:
    url = base_url.rstrip("/")
    with httpx.Client(timeout=timeout) as client:
        for path in ("/health", "/v1/health", "/"):
            try:
                r = client.get(f"{url}{path}")
                if r.status_code == 200:
                    try:
                        return {"ok": True, "path": path, "body": r.json()}
                    except Exception:
                        return {"ok": True, "path": path, "body": r.text[:200]}
            except httpx.HTTPError:
                continue
    return {"ok": False, "error": f"Docling not reachable at {url}"}


def convert_pdf(
    pdf_path: str | Path,
    *,
    base_url: str = DEFAULT_URL,
    do_ocr: bool = True,
    table_mode: str = "fast",
    timeout: float = 600.0,
) -> dict:
    """
    POST /v1/convert/file — returns docling-serve JSON response.
    Requests json + text + md for downstream parsing.
    """
    path = Path(pdf_path)
    if not path.is_file():
        raise FileNotFoundError(path)

    url = f"{base_url.rstrip('/')}/v1/convert/file"
    logger.info("Sending %s to %s", path.name, url)

    form: list[tuple[str, str]] = [
        ("from_formats", "pdf"),
        ("to_formats", "json"),
        ("to_formats", "md"),
        ("to_formats", "text"),
        ("do_ocr", str(do_ocr).lower()),
        ("force_ocr", "false"),
        ("table_mode", table_mode),
        ("do_table_structure", "true"),
        ("pdf_backend", "docling_parse"),
        ("abort_on_error", "false"),
    ]
    with path.open("rb") as f:
        files = [("files", (path.name, f, "application/pdf"))]
        r = requests.post(url, files=files, data=form, timeout=timeout)

    if r.status_code != 200:
        raise RuntimeError(f"Docling HTTP {r.status_code}: {r.text[:800]}")

    return r.json()
