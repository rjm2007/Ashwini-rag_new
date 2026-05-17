def chunk_text(text: str, chunk_size: int = 500, overlap: int = 50) -> list[dict]:
    """This function chunks text into token-like windows with overlap."""
    words = text.split()
    chunks = []
    if not words:
        return chunks
    start = 0
    index = 0
    while start < len(words):
        end = min(start + chunk_size, len(words))
        chunk_words = words[start:end]
        chunks.append(
            {
                "chunkIndex": index,
                "pageNumber": 1,
                "sectionHeading": "Unknown",
                "chunkText": " ".join(chunk_words),
            }
        )
        if end == len(words):
            break
        start = max(end - overlap, 0)
        index += 1
    return chunks
