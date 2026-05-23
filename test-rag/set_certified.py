#!/usr/bin/env python3
"""
set_certified.py — Flip the repository tag on all Qdrant chunks for a document.

Usage:
  # Certify a document (make it searchable):
  python set_certified.py --doc-id volvo_warranty_2019_a1b2c3d4

  # Set back to pending:
  python set_certified.py --doc-id volvo_warranty_2019_a1b2c3d4 --repo pending_review

  # List all document IDs in the collection:
  python set_certified.py --list

  # Certify ALL documents at once (test shortcut):
  python set_certified.py --all
"""

import argparse
import logging
import sys

from qdrant_client.models import Filter, FieldCondition, MatchValue

from config import load_config
from qdrant_manager import QdrantV2Manager

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s :: %(message)s",
)
logger = logging.getLogger("set_certified")


def list_documents(qdrant: QdrantV2Manager):
    """Scroll through collection and print unique document IDs."""
    print(f"\nDocuments in '{qdrant.collection}':")

    seen = {}
    offset = None
    while True:
        result = qdrant.client.scroll(
            collection_name=qdrant.collection,
            limit=100,
            offset=offset,
            with_payload=["documentId", "filename", "make", "model", "year", "repository"],
            with_vectors=False,
        )
        points, next_offset = result

        for point in points:
            doc_id = point.payload.get("documentId", "?")
            if doc_id not in seen:
                seen[doc_id] = {
                    "filename": point.payload.get("filename", "?"),
                    "make": point.payload.get("make"),
                    "model": point.payload.get("model"),
                    "year": point.payload.get("year"),
                    "repository": point.payload.get("repository"),
                    "chunks": 0,
                }
            seen[doc_id]["chunks"] += 1

        if next_offset is None:
            break
        offset = next_offset

    if not seen:
        print("  (empty collection)")
        return

    for doc_id, info in sorted(seen.items()):
        print(f"  {doc_id}")
        print(f"    file={info['filename']}  make={info['make']}  "
              f"model={info['model']}  year={info['year']}")
        print(f"    chunks={info['chunks']}  repository={info['repository']}")
    print()


def certify_all(qdrant: QdrantV2Manager):
    """Set repository=certified on ALL points in the collection."""
    qdrant.client.set_payload(
        collection_name=qdrant.collection,
        payload={"repository": "certified"},
        points=Filter(must=[]),  # match all
        wait=True,
    )
    info = qdrant.get_collection_info()
    print(f"Certified ALL {info.get('points_count', '?')} chunks in '{qdrant.collection}'")


def main():
    parser = argparse.ArgumentParser(description="Set repository tag on warranty chunks")
    parser.add_argument("--doc-id", help="Document ID to update")
    parser.add_argument("--repo", default="certified",
                        choices=["certified", "pending_review", "reviewer_approved", "rejected"],
                        help="Repository value to set (default: certified)")
    parser.add_argument("--list", action="store_true", help="List all document IDs")
    parser.add_argument("--all", action="store_true", help="Certify ALL documents")
    parser.add_argument("--env", help="Path to .env file")
    args = parser.parse_args()

    cfg = load_config(args.env)
    qdrant = QdrantV2Manager(cfg)

    if args.list:
        list_documents(qdrant)
        return

    if args.all:
        certify_all(qdrant)
        return

    if not args.doc_id:
        parser.error("Provide --doc-id, --list, or --all")

    count = qdrant.set_repository(args.doc_id, args.repo)
    print(f"Set repository='{args.repo}' on {count} chunks for doc '{args.doc_id}'")


if __name__ == "__main__":
    main()
