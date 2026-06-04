# Warranty Platform Development & Deployment Reference Guide

This document contains essential Docker commands to help you manage the Warranty Platform services, apply code changes, view logs, and completely reset/delete database and storage data.

---

## 1. Rebuilding Services After Code Changes

The `ai-service` and `backend` containers do not use live folder sync (volumes) for their code in their default configuration. This means **any changes made to Python or TypeScript source code will not take effect until you rebuild the container image**.

### Update specific service (fastest)
Use these commands when you modify only one service to avoid rebuild time for others.

* **For changes in `ai-service/` (Python code):**
  ```bash
  docker-compose up -d --build ai-service
  ```
* **For changes in `backend/` (TypeScript/NestJS code):**
  ```bash
  docker-compose up -d --build backend
  ```
* **For changes in `frontend/` (Next.js code):**
  ```bash
  docker-compose up -d --build frontend
  ```

### Rebuild and restart ALL services
If you've modified multiple components (e.g., backend entity and migrations) or want a full sync:
```bash
docker-compose up -d --build
```

---

## 2. Checking Status and Logs

Use these commands to debug issues, monitor pipelines, and see what the services are doing in real-time.

* **Check running containers and status:**
  ```bash
  docker ps
  ```
* **Follow live logs for all services:**
  ```bash
  docker-compose logs -f
  ```
* **Follow live logs for a specific service:**
  * For the AI Service (normalizing, parsing, summary generation):
    ```bash
    docker-compose logs -f ai-service
    ```
    *(Or using direct docker container name)*:
    ```bash
    docker logs -f warranty-ai-service
    ```
  * For the Backend:
    ```bash
    docker-compose logs -f backend
    ```
  * For the Docling conversion microservice:
    ```bash
    docker-compose logs -f docling
    ```

---

## 3. How to Delete All Data (Clean Slate Reset)

If you want to wipe out all processed documents, postgres tables, and vector index (Qdrant) data to start fresh, follow these steps.

> [!CAUTION]
> These actions are destructive and cannot be undone.

### Step A: Bring down the stack and delete all Docker volumes
The `-v` (or `--volumes`) flag tells docker-compose to remove all persistent volume storage defined in the docker-compose configuration. This deletes the Postgres database files and Qdrant index files completely.

```bash
docker-compose down -v
```

### Step B (Optional): Clean up untracked local processing artifacts
The application saves raw OCR text, document trees, and temporary JSON metadata to S3-compatible storage. Depending on your configuration, these may reside locally. To remove local cache:
* If you have a local `.s3_data` or similar storage directory in the project root:
  * **On Windows (PowerShell):**
    ```powershell
    Remove-Item -Recurpe -Force ./s3_data
    ```
  * **On Linux / macOS:**
    ```bash
    rm -rf ./s3_data
    ```

### Step C: Spin the application back up
Start the containers again. Docker will recreate the empty databases and run initialization scripts automatically.
```bash
docker-compose up -d
```
*Tip: If you want to force Postgres to run all SQL initialization scripts from scratch (`infra/postgres/init.sql`), ensure you ran Step A with `-v` first.*
