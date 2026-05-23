@echo off
cd /d "%~dp0"
set PDF_DIR=C:\Users\rudra\Desktop\Waranty_POC\pdf
set OCR_METHOD=docling
if not "%~1"=="" set PDF_DIR=%~1
if not "%~2"=="" set OCR_METHOD=%~2

echo python ingest_v2.py --pdf-dir "%PDF_DIR%" --ocr-method %OCR_METHOD% --auto-certify
python ingest_v2.py --pdf-dir "%PDF_DIR%" --ocr-method %OCR_METHOD% --auto-certify
exit /b %errorlevel%
