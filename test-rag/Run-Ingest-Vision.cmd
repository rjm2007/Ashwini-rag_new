@echo off
REM Ingest without Docling Docker or AWS Textract (OpenAI Vision OCR per page).
cd /d "%~dp0"
set PDF_DIR=C:\Users\rudra\Desktop\Waranty_POC\pdf
if not "%~1"=="" set PDF_DIR=%~1
echo python ingest_v2.py --pdf-dir "%PDF_DIR%" --ocr-method openai_vision --auto-certify
python ingest_v2.py --pdf-dir "%PDF_DIR%" --ocr-method openai_vision --auto-certify
exit /b %errorlevel%
