"""Post-retrieval helpers for search quality."""


def dedupe_search_results(points: list, top_k: int, max_per_doc_page: int = 2) -> list:
    """
    Reduce redundant hits (same doc/page or near-duplicate text) before LLM reasoning.

    Fetches should request more than top_k; this trims to diverse chunks.
    """
    out: list = []
    page_counts: dict[tuple, int] = {}
    text_sigs: set[tuple] = set()

    for point in points:
        p = point.payload or {}
        doc_page = (p.get("documentId"), p.get("pageNumber"))
        if page_counts.get(doc_page, 0) >= max_per_doc_page:
            continue

        sig = (p.get("documentId"), (p.get("chunkText") or "")[:180])
        if sig in text_sigs:
            continue

        text_sigs.add(sig)
        page_counts[doc_page] = page_counts.get(doc_page, 0) + 1
        out.append(point)
        if len(out) >= top_k:
            break

    return out
