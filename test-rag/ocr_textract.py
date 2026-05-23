"""
ocr_textract.py — AWS Textract async OCR for scanned warranty PDFs.

Flow:
  1. Upload local PDF to S3 at a temp key
  2. Start Textract async text detection job
  3. Poll until SUCCEEDED
  4. Collect LINE blocks grouped by page
  5. Return list of {"page": int, "text": str}
  6. Clean up temp S3 file
"""

import logging
import time

import boto3

from config import RagConfig

logger = logging.getLogger("ocr_textract")


class TextractOCR:

    def __init__(self, cfg: RagConfig):
        self.cfg = cfg
        self.s3 = boto3.client(
            "s3",
            region_name=cfg.aws_region,
            aws_access_key_id=cfg.aws_access_key_id or None,
            aws_secret_access_key=cfg.aws_secret_access_key or None,
        )
        self.textract = boto3.client(
            "textract",
            region_name=cfg.aws_region,
            aws_access_key_id=cfg.aws_access_key_id or None,
            aws_secret_access_key=cfg.aws_secret_access_key or None,
        )

    def upload_and_ocr(self, local_path: str, s3_key: str) -> list[dict]:
        """
        Upload a local PDF to S3, run Textract, return per-page text.

        Returns:
            [{"page": 1, "text": "..."}, {"page": 2, "text": "..."}, ...]
        """
        # Upload
        logger.info("Uploading %s → s3://%s/%s", local_path, self.cfg.s3_bucket, s3_key)
        self.s3.upload_file(local_path, self.cfg.s3_bucket, s3_key)

        # Start async Textract job
        logger.info("Starting Textract job for %s", s3_key)
        start_resp = self.textract.start_document_text_detection(
            DocumentLocation={
                "S3Object": {"Bucket": self.cfg.s3_bucket, "Name": s3_key}
            }
        )
        job_id = start_resp["JobId"]
        logger.info("Textract job started: %s", job_id)

        # Poll until done
        blocks = self._poll_job(job_id)

        # Group LINE blocks by page number
        pages_dict: dict[int, list[str]] = {}
        for block in blocks:
            if block.get("BlockType") != "LINE":
                continue
            page_no = block.get("Page", 1)
            pages_dict.setdefault(page_no, []).append(block.get("Text", ""))

        pages = [
            {"page": pg, "text": "\n".join(lines)}
            for pg, lines in sorted(pages_dict.items())
        ]

        total_chars = sum(len(p["text"]) for p in pages)
        logger.info("Textract done: %d pages, %d total chars", len(pages), total_chars)
        return pages

    def cleanup_s3(self, s3_key: str) -> None:
        """Delete the temp S3 file after processing."""
        try:
            self.s3.delete_object(Bucket=self.cfg.s3_bucket, Key=s3_key)
            logger.info("Cleaned up s3://%s/%s", self.cfg.s3_bucket, s3_key)
        except Exception as e:
            logger.warning("S3 cleanup failed for %s: %s", s3_key, e)

    def _poll_job(self, job_id: str) -> list[dict]:
        """Poll Textract job until SUCCEEDED, collecting all blocks."""
        deadline = time.time() + self.cfg.textract_timeout
        all_blocks: list[dict] = []

        while time.time() < deadline:
            resp = self.textract.get_document_text_detection(JobId=job_id)
            status = resp.get("JobStatus", "IN_PROGRESS")

            if status == "FAILED":
                raise RuntimeError(
                    f"Textract job {job_id} FAILED: {resp.get('StatusMessage')}"
                )

            if status == "SUCCEEDED":
                all_blocks.extend(resp.get("Blocks", []))
                # Paginate through remaining results
                next_token = resp.get("NextToken")
                while next_token:
                    resp = self.textract.get_document_text_detection(
                        JobId=job_id, NextToken=next_token
                    )
                    all_blocks.extend(resp.get("Blocks", []))
                    next_token = resp.get("NextToken")
                return all_blocks

            elapsed = int(self.cfg.textract_timeout - (deadline - time.time()))
            logger.info("  Polling Textract... status=%s elapsed=%ds", status, elapsed)
            time.sleep(self.cfg.textract_poll_interval)

        raise TimeoutError(
            f"Textract job {job_id} did not finish in {self.cfg.textract_timeout}s"
        )
