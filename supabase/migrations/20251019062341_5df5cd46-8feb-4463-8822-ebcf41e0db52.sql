-- Create trial_balance view for Trial Balance Report
CREATE OR REPLACE VIEW trial_balance AS
SELECT 
  a.code,
  a.name,
  a.type::TEXT,
  COALESCE(SUM(jl.debit), 0) as total_debit,
  COALESCE(SUM(jl.credit), 0) as total_credit,
  CASE 
    WHEN a.type IN ('ASSET', 'COGS', 'OPEX', 'OTHER_EXPENSE', 'TAX_EXPENSE') 
    THEN COALESCE(SUM(jl.debit - jl.credit), 0)
    ELSE COALESCE(SUM(jl.credit - jl.debit), 0)
  END as balance
FROM account a
LEFT JOIN journal_line jl ON jl.account_code = a.code
LEFT JOIN journal j ON j.id = jl.journal_id
WHERE j.status = 'POSTED' OR j.status IS NULL
GROUP BY a.code, a.name, a.type
HAVING COALESCE(SUM(jl.debit), 0) > 0 
   OR COALESCE(SUM(jl.credit), 0) > 0
ORDER BY a.code;