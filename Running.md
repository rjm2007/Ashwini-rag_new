# Running Guide

## 1) Prerequisites

- Docker Desktop
- Node.js 20+
- Python 3.11 (only if running `ai-service` outside Docker)
- PostgreSQL client optional for debugging

## 2) Environment Setup

1. In root `warranty-platform`, copy `.env.example` to `.env`.
2. Fill values for:
   - `OPENAI_API_KEY`
   - `AWS_*` keys and region
   - `S3_BUCKET_NAME`
   - `SQS_QUEUE_URL`
   - `QDRANT_URL` and `QDRANT_API_KEY`
   - `JWT_SECRET`

## 3) Run Everything with Docker

```bash
docker compose up --build
```

Services:
- Frontend: `http://localhost:3000`
- Backend: `http://localhost:3001`
- AI service: `http://localhost:8000`
- Postgres: `localhost:5432`

## 4) Demo Login Users

- Admin: `admin@demo.com / admin123`
- Reviewer: `reviewer@demo.com / reviewer123`
- User: `user@demo.com / user123`

## 5) Manual API Smoke Test

### Login
```bash
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"admin@demo.com\",\"password\":\"admin123\"}"
```

### Upload PDF (replace TOKEN and file path)
```bash
curl -X POST http://localhost:3001/documents/upload \
  -H "Authorization: Bearer TOKEN" \
  -F "file=@./sample.pdf"
```

### Create Chat Session
```bash
curl -X POST http://localhost:3001/query/sessions \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d "{}"
```

## 6) Run Services Individually (Optional)

### Backend
```bash
cd backend
npm install
npm run start:dev
```

### AI Service
```bash
cd ai-service
pip install -r requirements.txt
uvicorn src.main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## 7) Typical End-to-End Flow

1. Login as admin.
2. Upload a PDF.
3. Wait for processing to move document to `ready_for_review`.
4. Login as reviewer and approve.
5. Login as admin and final approve (document becomes certified).
6. Login as user and ask coverage questions in chat.
