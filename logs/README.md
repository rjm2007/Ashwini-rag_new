# Warranty platform — log layout

## Is a `logs` folder in every folder the right idea?

**Yes for debugging — with one important rule:**

| Good | Avoid |
|------|--------|
| One `logs/` folder **per runnable service** (`ai-service`, `backend`, `frontend`) | A `logs/` folder inside every source module (`review/logs`, `auth/logs`, …) |
| One **folder per test run** under `logs/runs/` | One giant `test-run.log` at repo root with no run id |
| Same log line on **stdout** (Docker) **and** optional file on disk | Only Docker Desktop UI with no saved file |

**Why:** When something breaks, you want to open **one run folder** and see what every service did for that upload/approve/chat — not hunt through dozens of module folders.

## Folder layout

```
warranty-platform/
  logs/
    README.md                 ← you are here
    runs/                     ← one subfolder per manual or scripted test run
      2026-05-16_12-30-00_5555388a-.../
        manifest.json         ← run id, times, optional documentId
        ai-service.log
        backend.log
        frontend.log
        postgres.log
        qdrant.log
        combined.log            ← all services interleaved (docker compose logs)
    services/                 ← optional live mirror while containers run (mounted volumes)
      ai-service/
        app.log
      backend/
        (stdout only unless file logging added later)
```

- **`logs/runs/`** — created by `scripts/Start-RunLogs.ps1`. This is what you send when debugging (“here is the full trace for document X”).
- **`logs/services/`** — AI service can append to `ai-service/app.log` via Docker volume (survives restarts during dev).

Log files are **gitignored** (except `.gitkeep`). They stay on your machine only.

## How to use (every test run)

From `warranty-platform` in PowerShell:

```powershell
# Terminal A — start capture (creates logs/runs/<timestamp>_<optional-doc-id>/)
.\scripts\Start-RunLogs.ps1

# Terminal B — upload, approve, chat (see RUN_TEST.md)

# Terminal A — when finished
.\scripts\Stop-RunLogs.ps1
```

Optional: pass a document id up front so the folder name is easy to find later:

```powershell
.\scripts\Start-RunLogs.ps1 -DocumentId "5555388a-8045-456a-885f-2f9628abc90e"
```

After stop, search that run:

```powershell
Select-String -Path ".\logs\runs\<run-folder>\combined.log" -Pattern "STEP 6/6"
```

`logs/runs/latest.txt` always points at the most recent run folder.

## What each service already logs (application level)

| Service | Logger | Typical markers |
|---------|--------|-----------------|
| **ai-service** | Python `logging` → stdout + `logs/services/ai-service/app.log` | `STEP 1/6` … `STEP 6/6`, `[set-repository]`, `LLM small call` |
| **backend** | NestJS `Logger` → stdout (captured in run logs) | `DocumentsService uploadDocument`, `ReviewService adminApprove`, `QueryService sendMessage` |
| **frontend** | Next.js console → stdout | HTTP / compile messages |
| **postgres / qdrant** | Database engine logs | SQL errors, Qdrant PUT/POST |

Run capture does **not** replace application logging — it **saves** what those loggers already print.
