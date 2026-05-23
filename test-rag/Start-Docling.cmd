@echo off
cd /d "%~dp0"
echo Building and starting Docling on http://localhost:5001 ...
docker compose -f docker-compose.docling.yml up --build -d
if errorlevel 1 exit /b 1

echo Waiting for health check...
set /a n=0
:wait
set /a n+=1
if %n% gtr 36 (
  echo Docling did not become healthy in time. Check: docker logs warranty-docling
  exit /b 1
)
curl -sf http://localhost:5001/health >nul 2>&1
if %errorlevel%==0 (
  echo Docling is ready.
  curl -s http://localhost:5001/health
  echo.
  exit /b 0
)
timeout /t 5 /nobreak >nul
goto wait
