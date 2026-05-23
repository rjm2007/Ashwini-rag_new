"""
contextual_retrieval.py — Generates LLM context blurbs for each chunk.

Implements Anthropic's Contextual Retrieval technique (Sept 2024) using OpenAI.

Before embedding a chunk, we ask the LLM:
  "Given the full document and this chunk, write 2-3 sentences of context
   explaining where this chunk fits within the document."

The blurb is PREPENDED to the chunk text before embedding, so the dense
vector captures document-level context that isolated chunks lose.

Published results (Anthropic's benchmarks):
  - 35% retrieval failure reduction from contextual embeddings alone
  - 49% reduction when combined with contextual BM25
  - 67% reduction with full pipeline + reranking
"""

import logging

from openai import OpenAI

from openai_compat import chat_create_kwargs

from config import RagConfig

logger = logging.getLogger("contextual_retrieval")

CONTEXT_PROMPT = """<document>
{document_text}
</document>

Here is the chunk we want to situate within the whole document:
<chunk>
{chunk_text}
</chunk>

Please give a short succinct context to situate this chunk within the overall document for the purposes of improving search retrieval of the chunk. The context should:
1. Identify which document this is from (manufacturer, model, year if visible)
2. State which section or topic area the chunk belongs to (coverage, exclusions, towing, components list, etc.)
3. Mention key terms, coverage codes, or component names referenced

Answer ONLY with the context (2-3 sentences). No preamble, no markdown."""


class ContextualRetrieval:

    def __init__(self, cfg: RagConfig):
        self.client = OpenAI(api_key=cfg.openai_api_key)
        self.model = cfg.small_model

    def generate_context(self, full_doc_text: str, chunk_text: str) -> str:
        """Generate a contextual blurb for one chunk."""
        # Truncate doc text to fit within model context window
        # (~6000 chars ≈ ~1500 tokens, leaves room for chunk + response)
        doc_truncated = full_doc_text[:6000]

        try:
            resp = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You generate short document context for search retrieval. Be concise and factual."},
                    {"role": "user", "content": CONTEXT_PROMPT.format(
                        document_text=doc_truncated,
                        chunk_text=chunk_text,
                    )},
                ],
                **chat_create_kwargs(self.model, 150),
            )
            return (resp.choices[0].message.content or "").strip()
        except Exception as e:
            logger.warning("Context generation failed for chunk: %s", e)
            return ""

    def contextualize_chunks(self, full_doc_text: str, chunks: list[dict]) -> list[dict]:
        """
        Add contextual blurbs to all chunks from one document.

        Sets two fields on each chunk dict:
          - contextualizedText: context_blurb + "\\n\\n" + original chunkText
          - contextBlurb: just the generated context (for inspection)

        The contextualizedText is what gets embedded (dense + sparse).
        The original chunkText is what gets sent to the LLM at answer time.
        """
        logger.info("Contextualizing %d chunks with %s...", len(chunks), self.model)

        for i, chunk in enumerate(chunks):
            context = self.generate_context(full_doc_text, chunk["chunkText"])

            if context:
                chunk["contextualizedText"] = context + "\n\n" + chunk["chunkText"]
                chunk["contextBlurb"] = context
            else:
                chunk["contextualizedText"] = chunk["chunkText"]
                chunk["contextBlurb"] = ""

            if (i + 1) % 5 == 0 or (i + 1) == len(chunks):
                logger.info("  Contextualized %d/%d", i + 1, len(chunks))

        return chunks
