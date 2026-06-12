"""Unit tests for Krones required-fields and type detection."""

import unittest

from src.krones.required_fields import has_krones_required_fields
from src.krones.type_detect import detect_krones_from_text, infer_doc_category


class TestKronesRequiredFields(unittest.TestCase):
    def test_has_krones_required_fields_ok(self):
        doc = {
            "doc_title": {"value": "Krones Supplier Handbook", "status": "extracted"},
            "issuer": {"value": "Krones AG", "status": "extracted"},
            "doc_category": {"value": "handbook", "status": "extracted"},
        }
        self.assertTrue(has_krones_required_fields(doc))

    def test_has_krones_required_fields_missing(self):
        self.assertFalse(has_krones_required_fields({}))

    def test_detect_krones_from_filename(self):
        self.assertEqual(
            detect_krones_from_text("Krones_Supplier_Handbook.pdf", ""),
            "krones_supplier_doc",
        )

    def test_infer_doc_category_ltsd(self):
        self.assertEqual(
            infer_doc_category("LTSD.pdf", "Long-Term Supplier Declaration"),
            "supplier_declaration_instructions",
        )

    def test_krones_warranty_misfire_patterns(self):
        from src.query.query_orchestrator import _is_krones_warranty_misfire

        self.assertTrue(_is_krones_warranty_misfire("What does this warranty cover?"))
        self.assertTrue(_is_krones_warranty_misfire("What does this cover?"))
        self.assertFalse(_is_krones_warranty_misfire("What quality standard does Krones require?"))


if __name__ == "__main__":
    unittest.main()
