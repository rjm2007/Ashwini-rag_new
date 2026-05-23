# Warranty RAG Upgrade — Analysis, Roadmap & Rollout

## Current architecture constraints

| Constraint | Impact |
|------------|--------|
| **Certified-only Qdrant filter** | All retrieval must use `repository=certified`; pending docs invisible to chat |
| **Single collection schema** | Hybrid = `dense` + `bm25_sparse`; legacy collections fall back to dense-only |
| **Flat chunk history** | Existing points lack `parentChunkId` / `structuredMeta` until re-ingest |
| **Reasoner token budget** | Parent expansion increases context size (mitigated by parent dedupe) |
| **OpenAI dependency** | Embeddings, metadata, rerank, contextual retrieval, reasoning all use API |
| **No score calibration** | RRF scores are rank-relative; threshold `0.01` is a guardrail not a tuned cutoff |

## Migration risks

| Risk | Mitigation |
|------|------------|
| Old chunks missing parent fields | `expand_parents_for_reasoning` passes legacy chunks unchanged |
| Row-level re-ingest increases point count | More precise retrieval; re-ingest one doc at a time |
| Structured filter too aggressive | Falls back to unfiltered set if zero matches |
| Decomposition multiplies API calls | Only enabled for hard queries (`should_decompose`) |
| Qdrant payload index on existing collection | Indexes created only on **new** collection; optional manual index on existing |

## Performance / cost tradeoffs

| Change | Latency | Cost | Quality |
|--------|---------|------|---------|
| Parent-child ingest | +0% ingest (more chunks) | +embeddings per row | ↑ table/comparison |
| Code fast-path scroll | +50–200ms when codes present | Qdrant only | ↑ code precision |
| Retry sparse-heavy | +1 embedding + 1 hybrid | +1× retrieval | ↑ weak queries |
| OpenAI rerank (kept) | +1 small LLM call | ~$0.001/query | ↑ ordering |
| Query decomposition | +1–3 hybrid calls | +2–4× retrieval | ↑ multi-hop |
| Structured filter | &lt;5ms | None | ↑ numeric/temporal |

## Implementation status (this PR)

| Phase | Status | Flag |
|-------|--------|------|
| 1 Parent-child | **Implemented** | `ENABLE_PARENT_CHILD` |
| 2 Structured metadata + filter | **Implemented** | `ENABLE_STRUCTURED_REASONING` |
| 3 Retrieval quality | **Implemented** | `ENABLE_RETRIEVAL_QUALITY` |
| 4 BGE/Cohere reranker | **Deferred** — OpenAI kept; `RERANKER_PROVIDER=none` to skip | `RERANKER_PROVIDER` |
| 5 Query decomposition | **Implemented (lightweight)** | `ENABLE_QUERY_DECOMPOSITION` |

**Required for full benefit:** Re-ingest + re-certify documents so row-level children and `structuredMeta` exist in Qdrant.

---

## Files modified / added

### Ingest
| File | Change |
|------|--------|
| `services/parent_child_builder.py` | **NEW** — row children + page parents |
| `services/coverage_row_parser.py` | **NEW** — `structuredMeta` extraction |
| `services/chunking_service.py` | Calls parent-child when enabled |
| `workers/pipeline_orchestrator.py` | `document_id` to chunker; `structuredMeta` on upsert |
| `services/qdrant_service.py` | Payload indexes: `chunkRole`, `sectionId`, `parentChunkId` |

### Retrieval
| File | Change |
|------|--------|
| `services/retrieval_pipeline.py` | **NEW** — fast path, retry, threshold, table expansion |
| `services/structured_query_engine.py` | **NEW** — constraint parse + filter |
| `services/query_decomposer.py` | **NEW** — hard-query subqueries |
| `services/retrieval_utils.py` | `expand_parents_for_reasoning` |
| `query/retriever.py` | Delegates to pipeline |

### Reasoning
| File | Change |
|------|--------|
| `query/reasoner.py` | Parent context + matched row snippet |
| `query/query_orchestrator.py` | `queryMode` metadata |

### Config / eval
| File | Change |
|------|--------|
| `config.py` | Feature flags + retrieval params |
| `.env.example` | Documented env vars |
| `eval/hard_benchmark_questions.json` | **NEW** — 10 hard queries |
| `eval/run_hard_benchmark.py` | **NEW** — run + retrieval metrics |
| `eval/metrics.py` | **NEW** — Recall@K helpers |

---

## Rollout strategy

1. **Deploy** with all flags `true` (defaults).
2. **Re-ingest** Volvo PDF (or `POST /internal/process/{id}`).
3. **Certify** document (flip Qdrant `repository`).
4. Run `python eval/run_hard_benchmark.py` and compare to `RAG_BENCHMARK_ANSWERS.txt`.
5. If latency high: set `ENABLE_QUERY_DECOMPOSITION=false`, then `RERANKER_PROVIDER=none` for A/B.

## Rollback

```env
ENABLE_PARENT_CHILD=false
ENABLE_STRUCTURED_REASONING=false
ENABLE_RETRIEVAL_QUALITY=false
ENABLE_QUERY_DECOMPOSITION=false
```

No DB migration required. Old chunks continue to work.

---

## Phase 4 — External reranker (next)

Benchmark plan (not yet wired):

| Provider | Pros | Cons |
|----------|------|------|
| **BGE reranker** (local ONNX) | Low $, good pairwise | +Docker size, CPU latency |
| **Cohere rerank** | Strong tables | API key, $/1k |
| **Jina rerank** | Fast API | Another vendor |

Keep `reranker_service._openai_rerank` as fallback; add `RERANKER_PROVIDER=bge` when model packaged.

---

## Expected quality improvements (after re-ingest)

| Query type | Before | After |
|------------|--------|-------|
| Code lookup (D0001, TOW4) | Good | Better (fast path + row child) |
| EPA17 / emissions | Weak | Better (row + aliases + parent table) |
| List / filter | Mixed | Better (table mode + structured filter) |
| 5yr / 700k miles | Poor | Improved (structuredMeta); Phase 3 calculator still ideal |
| Hallucination probes | OK | Same (table strict mode) |
