"""Krones section extraction groups — registered into SECTION_EXTRACTION_MAP."""

KRONES_DOCUMENT_TYPE = "krones_supplier_doc"

KRONES_SECTION_EXTRACTION_MAP: list[dict] = [
    {
        "name": "document_header",
        "labels": ["issuer_metadata", "link_index", "other"],
        "prompt_file": "krones/document_header.txt",
        "fields": "doc_title, doc_category, issuer, owning_unit, version, effective_date, document_language, confidentiality",
        "event_label": "Extracting: Krones document header",
    },
    {
        "name": "requirements_and_standards",
        "labels": ["requirement_clause", "standard_reference", "definition", "threshold_rule"],
        "prompt_file": "krones/requirements_and_standards.txt",
        "fields": "requirements[], referenced_standards[], definitions[], thresholds_and_rules[]",
        "event_label": "Extracting: Requirements & standards",
    },
    {
        "name": "request_types",
        "labels": ["request_type_table"],
        "prompt_file": "krones/request_types.txt",
        "fields": "request_types[] (parent_category, request_type, reason, responsible_party)",
        "event_label": "Extracting: SRSM request types",
    },
    {
        "name": "process_and_contacts",
        "labels": ["process_step", "contact_block"],
        "prompt_file": "krones/process_and_contacts.txt",
        "fields": "process_steps[], contacts[], portals_and_links[]",
        "event_label": "Extracting: Process steps & contacts",
    },
    {
        "name": "esg_and_packaging",
        "labels": ["esg_requirement", "packaging_rule"],
        "prompt_file": "krones/esg_and_packaging.txt",
        "fields": "esg_requirements[], packaging_rules[]",
        "event_label": "Extracting: ESG & packaging rules",
    },
    {
        "name": "trade_declaration",
        "labels": ["fta_table"],
        "prompt_file": "krones/trade_declaration.txt",
        "fields": "free_trade_agreements[], declaration_fields[]",
        "event_label": "Extracting: LTSD / FTA table",
    },
]

KRONES_TABLE_LABELS = {"request_type_table", "fta_table"}
