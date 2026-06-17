"""Table bridge converts FIELD_WRAPPER parser rows to WARR-1172 coverage_components."""

from src.services.warranty_table_bridge import table_rows_to_coverage_components
from test_coverage_parser import tables


def test_bridge_converts_all_codes():
    rows = table_rows_to_coverage_components(tables)
    by_id = {r["coverage_id"]: r for r in rows}
    assert len(rows) == 9
    for code in ["D0001", "HAC49", "TOW1", "TOW2", "U06", "U06A", "U030", "U065", "Z0421"]:
        assert code in by_id


def test_bridge_hierarchy_and_types():
    rows = table_rows_to_coverage_components(tables)
    by_id = {r["coverage_id"]: r for r in rows}
    u065 = by_id["U065"]
    assert u065["coverage_hierarchy"]["system"] == "Powertrain"
    assert u065["coverage_hierarchy"]["subsystem"] == "Transmission"
    assert u065["coverage_type"] == "Transmission"

    z = by_id["Z0421"]
    assert z["coverage_type"] == "Information Only"
    assert z["coverage_hierarchy"]["subsystem"] == "Information Only"


def test_bridge_no_field_wrapper_keys():
    rows = table_rows_to_coverage_components(tables)
    for row in rows:
        assert "status" not in row
        assert "evidence_quote" not in row
        assert isinstance(row.get("confidence_score"), float)
        assert row["coverage_period"]["duration_text"]
