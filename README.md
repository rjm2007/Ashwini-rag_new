# Warranty Intelligence Platform (POC)

This repository contains a governed AI warranty intelligence proof of concept built with:
- `backend/` (NestJS API)
- `ai-service/` (FastAPI worker + query service)
- `frontend/` (Next.js UI)
- `infra/` (database bootstrap and deployment assets)

## High-level flow

1. Admin uploads a PDF.
2. AI pipeline performs OCR, metadata extraction, chunking, and embeddings.
3. Reviewer validates metadata and approves.
4. Admin gives final approval to certify the document.
5. Users ask warranty questions; the system answers using certified evidence only.

## Local setup

1. Copy `.env.example` to `.env`.
2. Fill all required environment variables.
3. Start services with Docker Compose.
4. Open the frontend and login with demo users.

See `Running.md` for exact run commands and testing steps.
