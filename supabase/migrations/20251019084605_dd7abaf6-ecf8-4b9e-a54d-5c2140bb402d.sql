-- Drop and recreate unified_transactions view with created_by_ai column
DROP VIEW IF EXISTS unified_transactions;

CREATE VIEW unified_transactions AS
SELECT 
  j.id,
  'journal' as type,
  j.number,
  j.date,
  j.description,
  j.status::text,
  COALESCE(
    (SELECT SUM(debit) FROM journal_line WHERE journal_id = j.id),
    (SELECT SUM(credit) FROM journal_line WHERE journal_id = j.id),
    0
  ) as amount,
  j.created_by,
  j.created_at,
  j.created_by_ai,
  j.source_doc_type,
  j.source_doc_id
FROM journal j

UNION ALL

SELECT 
  i.id,
  'invoice' as type,
  i.number,
  i.date,
  i.description,
  i.status,
  i.total as amount,
  i.created_by,
  i.created_at,
  FALSE as created_by_ai,
  NULL::text as source_doc_type,
  NULL::uuid as source_doc_id
FROM sales_invoice i

UNION ALL

SELECT 
  b.id,
  'bill' as type,
  b.number,
  b.date,
  b.description,
  b.status,
  b.total as amount,
  b.created_by,
  b.created_at,
  FALSE as created_by_ai,
  NULL::text as source_doc_type,
  NULL::uuid as source_doc_id
FROM vendor_bill b

UNION ALL

SELECT 
  p.id,
  'payment' as type,
  p.number,
  p.date,
  p.description,
  'APPROVED' as status,
  p.amount,
  p.created_by,
  p.created_at,
  FALSE as created_by_ai,
  NULL::text as source_doc_type,
  NULL::uuid as source_doc_id
FROM vendor_payment p

UNION ALL

SELECT 
  r.id,
  'receipt' as type,
  r.number,
  r.date,
  r.description,
  'APPROVED' as status,
  r.amount,
  r.created_by,
  r.created_at,
  FALSE as created_by_ai,
  NULL::text as source_doc_type,
  NULL::uuid as source_doc_id
FROM cash_receipt r;