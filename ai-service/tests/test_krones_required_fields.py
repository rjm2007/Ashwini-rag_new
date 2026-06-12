"""Unit tests for Krones required-fields and type detection."""

from src.krones.required_fields import has_krones_required_fields
from src.krones.type_detect import detect_krones_from_text, infer_doc_category


def test_has_krones_required_fields_ok():
    doc = {
        "doc_title": {"value": "Krones Supplier Handbook", "status": "extracted"},
        "issuer": {"value": "Krones AG", "status": "extracted"},
        "doc_category": {"value": "handbook", "status": "extracted"},
    }
    assert has_krones_required_fields(doc) is True


def test_has_krones_required_fields_missing():
    assert has_krones_required_fields({}) is False


def test_detect_krones_from_filename():
    assert detect_krones_from_text("Krones_Supplier_Handbook.pdf", "") == "krones_supplier_doc"


def test_infer_doc_category_ltsd():
    assert infer_doc_category("LTSD.pdf", "Long-Term Supplier Declaration") == "supplier_declaration_instructions"
