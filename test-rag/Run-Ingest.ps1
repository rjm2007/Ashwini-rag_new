# Ingest PDFs into warranty_chunks_v2 (test-rag v2 pipeline).
param(
    [string]$PdfDir = "C:\Users\rudra\Desktop\Waranty_POC\pdf",
    [ValidateSet("auto", "textract", "docling", "openai_vision")]
    [string]$OcrMethod = "docling",
    [switch]$NoContext,
    [switch]$Reset
)

Set-Location $PSScriptRoot

$args = @(
    "ingest_v2.py",
    "--pdf-dir", $PdfDir,
    "--ocr-method", $OcrMethod,
    "--auto-certify"
)
if ($NoContext) { $args += "--no-context" }
if ($Reset) { $args += "--reset" }

Write-Host "python $($args -join ' ')"
python @args
