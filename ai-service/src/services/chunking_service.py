import re


def _infer_section_heading(text: str) -> str:
    """Guess a short section title from the start of a page or chunk."""
    if not text:
        return "Unknown"
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    for line in lines[:12]:
        if len(line) > 80:
            continue
        if re.match(r"^\d+(\.\d+)*\s+[A-Z]", line):
            return line[:120]
        letters = sum(1 for c in line if c.isalpha())
        upper = sum(1 for c in line if c.isupper())
        if letters >= 4 and upper / max(letters, 1) >= 0.65:
            return line[:120]
    first = lines[0] if lines else ""
    return first[:80] if first else "Unknown"


def _chunk_words(
    words: list[str],
    page_number: int,
    section_heading: str,
    chunk_size: int,
    overlap: int,
    start_index: int,
) -> tuple[list[dict], int]:
    chunks: list[dict] = []
    if not words:
        return chunks, start_index
    start = 0
    index = start_index
    while start < len(words):
        end = min(start + chunk_size, len(words))
        chunk_words = words[start:end]
        chunks.append(
            {
                "chunkIndex": index,
                "pageNumber": page_number,
                "sectionHeading": section_heading,
                "chunkText": " ".join(chunk_words),
            }
        )
        if end == len(words):
            break
        start = max(end - overlap, 0)
        index += 1
    return chunks, index


def chunk_pages(pages: list[dict], chunk_size: int = 500, overlap: int = 50) -> list[dict]:
    """Chunk OCR pages separately so each chunk keeps the real page number."""
    chunks: list[dict] = []
    index = 0
    for page_item in pages or []:
        page_number = int(page_item.get("page") or page_item.get("pageNumber") or 1)
        text = (page_item.get("text") or "").strip()
        if not text:
            continue
        heading = _infer_section_heading(text)
        page_chunks, index = _chunk_words(
            text.split(),
            page_number,
            heading,
            chunk_size,
            overlap,
            index,
        )
        chunks.extend(page_chunks)
    return chunks


def chunk_text(text: str, chunk_size: int = 500, overlap: int = 50) -> list[dict]:
    """Legacy single-string chunking (fallback when page list is unavailable)."""
    words = text.split()
    if not words:
        return []
    heading = _infer_section_heading(text)
    chunks, _ = _chunk_words(words, 1, heading, chunk_size, overlap, 0)
    return chunks
