-- Purge Krones documents and dependent rows (Delete_krones.md §4.1)
BEGIN;

CREATE TEMP TABLE _krones_docs AS
  SELECT id FROM documents WHERE document_type = 'krones_supplier_doc';

UPDATE support_tickets
  SET document_id = NULL
  WHERE document_id IN (SELECT id FROM _krones_docs);

DELETE FROM documents WHERE id IN (SELECT id FROM _krones_docs);

DROP TABLE _krones_docs;

COMMIT;
