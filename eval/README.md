# RAG benchmark outputs

Full 50-question Volvo warranty benchmark for production RAG verification.

## Generate answers

```bash
cd warranty-platform
docker compose up -d --build ai-service
docker exec warranty-ai-service python eval/run_benchmark.py
docker cp warranty-ai-service:/app/eval/RAG_BENCHMARK_ANSWERS.txt ./eval/
```

## Files

| File | Description |
|------|-------------|
| `RAG_BENCHMARK_ANSWERS.txt` | System answers (all 50 questions, 5 levels) |
| Source questions | `ai-service/eval/benchmark_questions.json` |

Requires at least one **certified** document in Qdrant.
