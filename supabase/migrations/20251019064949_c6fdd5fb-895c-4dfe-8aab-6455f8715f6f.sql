-- Create unified transactions view
CREATE OR REPLACE VIEW unified_transactions AS
SELECT 
  j.id,
  'journal' as type,
  j.number,
  j.date,
  j.description,
  j.status::text,
  COALESCE((SELECT SUM(debit) FROM journal_line WHERE journal_id = j.id), 0) as amount,
  j.created_by,
  j.created_at,
  j.source_doc_type,
  j.source_doc_id
FROM journal j

UNION ALL

SELECT
  si.id,
  'invoice' as type,
  si.number,
  si.date,
  COALESCE(c.name, 'N/A') as description,
  si.status,
  si.total as amount,
  si.created_by,
  si.created_at,
  'invoice' as source_doc_type,
  si.id as source_doc_id
FROM sales_invoice si
LEFT JOIN client c ON c.id = si.client_id

UNION ALL

SELECT
  vb.id,
  'bill' as type,
  vb.number,
  vb.date,
  COALESCE(v.name, vb.description) as description,
  vb.status,
  vb.total as amount,
  vb.created_by,
  vb.created_at,
  'bill' as source_doc_type,
  vb.id as source_doc_id
FROM vendor_bill vb
LEFT JOIN vendor v ON v.id = vb.vendor_id

UNION ALL

SELECT
  vp.id,
  'payment' as type,
  vp.number,
  vp.date,
  COALESCE(v.name, vp.description) as description,
  'POSTED' as status,
  vp.amount,
  vp.created_by,
  vp.created_at,
  'payment' as source_doc_type,
  vp.id as source_doc_id
FROM vendor_payment vp
LEFT JOIN vendor v ON v.id = vp.vendor_id

UNION ALL

SELECT
  cr.id,
  'receipt' as type,
  cr.number,
  cr.date,
  COALESCE(c.name, cr.description) as description,
  'POSTED' as status,
  cr.amount,
  cr.created_by,
  cr.created_at,
  'receipt' as source_doc_type,
  cr.id as source_doc_id
FROM cash_receipt cr
LEFT JOIN client c ON c.id = cr.client_id;

-- Grant permissions
GRANT SELECT ON unified_transactions TO authenticated;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_journal_date ON journal(date);
CREATE INDEX IF NOT EXISTS idx_journal_created_by ON journal(created_by);
CREATE INDEX IF NOT EXISTS idx_invoice_date ON sales_invoice(date);
CREATE INDEX IF NOT EXISTS idx_bill_date ON vendor_bill(date);
CREATE INDEX IF NOT EXISTS idx_ai_suggestion_created_at ON ai_suggestion_log(created_at);
CREATE INDEX IF NOT EXISTS idx_ai_suggestion_conversation ON ai_suggestion_log(conversation_id);
CREATE INDEX IF NOT EXISTS idx_ai_suggestion_status ON ai_suggestion_log(status);