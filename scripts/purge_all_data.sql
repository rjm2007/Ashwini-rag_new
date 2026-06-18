-- Full wipe: documents, chat, costs, audit (keeps users)

DELETE FROM query_messages;
DELETE FROM query_sessions;
DELETE FROM support_tickets;
DELETE FROM cost_events;
DELETE FROM audit_logs;
DELETE FROM documents;
