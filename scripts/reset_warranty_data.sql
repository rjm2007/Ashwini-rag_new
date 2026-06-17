-- Backend Planning §11 data reset (keeps s3_path, wipes extracted state)

UPDATE documents
SET master_schema_json = '{}'::jsonb,
    section_extracts_json = '[]'::jsonb,
    ai_summary_text = NULL,
    completeness = NULL,
    required_fields_missing = TRUE,
    processing_status = 'uploaded',
    current_repository = 'pending_review',
    error_message = NULL,
    updated_at = NOW();

DELETE FROM cost_events;
DELETE FROM pipeline_events;
DELETE FROM reviews;
DELETE FROM query_messages;
