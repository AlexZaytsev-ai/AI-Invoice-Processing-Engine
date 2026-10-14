-- Fictional demo data. All numeric identifiers and accounts below are invented.
-- No invoices are pre-created: the intake workflow creates them from the PDFs.
BEGIN;

INSERT INTO renaissance.events (event_id, event_name)
VALUES (1, 'Тестовая выставка Ренессанс')
ON CONFLICT (event_id) DO NOTHING;

SELECT setval(
  pg_get_serial_sequence('renaissance.events', 'event_id'),
  (SELECT max(event_id) FROM renaissance.events),
  true
);

INSERT INTO renaissance.suppliers (supplier_inn, supplier_name, bank_account)
VALUES ('0000000001', 'ДЕМО ПОСТАВЩИК', '00000000000000000001')
ON CONFLICT (supplier_inn) DO NOTHING;

COMMIT;
