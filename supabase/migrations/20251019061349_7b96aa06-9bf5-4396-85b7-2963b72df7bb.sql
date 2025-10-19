-- ============================================
-- CRITICAL: Financial Report RPC Functions
-- ============================================

-- 1. Profit & Loss Report Function
CREATE OR REPLACE FUNCTION get_profit_loss(
  p_start_period TEXT,
  p_end_period TEXT
)
RETURNS TABLE (
  account_code TEXT,
  account_name TEXT,
  account_type TEXT,
  amount BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.code as account_code,
    a.name as account_name,
    a.type::TEXT as account_type,
    COALESCE(SUM(
      CASE 
        WHEN a.type IN ('REVENUE', 'OTHER_INCOME') THEN jl.credit - jl.debit
        ELSE jl.debit - jl.credit
      END
    ), 0)::BIGINT as amount
  FROM account a
  LEFT JOIN journal_line jl ON jl.account_code = a.code
  LEFT JOIN journal j ON j.id = jl.journal_id
  WHERE j.period >= p_start_period 
    AND j.period <= p_end_period
    AND j.status = 'POSTED'
    AND a.type IN ('REVENUE', 'COGS', 'OPEX', 'OTHER_INCOME', 'OTHER_EXPENSE', 'TAX_EXPENSE')
  GROUP BY a.code, a.name, a.type
  HAVING ABS(SUM(
    CASE 
      WHEN a.type IN ('REVENUE', 'OTHER_INCOME') THEN jl.credit - jl.debit
      ELSE jl.debit - jl.credit
    END
  )) > 0
  ORDER BY a.code;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 2. Balance Sheet Report Function
CREATE OR REPLACE FUNCTION get_balance_sheet(
  p_as_of_date TEXT
)
RETURNS TABLE (
  account_code TEXT,
  account_name TEXT,
  account_type TEXT,
  balance BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.code as account_code,
    a.name as account_name,
    a.type::TEXT as account_type,
    COALESCE(SUM(
      CASE 
        WHEN a.type IN ('ASSET', 'COGS', 'OPEX', 'OTHER_EXPENSE', 'TAX_EXPENSE') THEN jl.debit - jl.credit
        ELSE jl.credit - jl.debit
      END
    ), 0)::BIGINT as balance
  FROM account a
  LEFT JOIN journal_line jl ON jl.account_code = a.code
  LEFT JOIN journal j ON j.id = jl.journal_id
  WHERE j.date <= p_as_of_date::DATE
    AND j.status = 'POSTED'
    AND a.type IN ('ASSET', 'LIABILITY', 'EQUITY')
  GROUP BY a.code, a.name, a.type
  HAVING ABS(SUM(
    CASE 
      WHEN a.type IN ('ASSET') THEN jl.debit - jl.credit
      ELSE jl.credit - jl.debit
    END
  )) > 0
  ORDER BY a.code;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 3. Cash Flow Report Function
CREATE OR REPLACE FUNCTION get_cash_flow(
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  account_code TEXT,
  account_name TEXT,
  category TEXT,
  amount BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.code as account_code,
    a.name as account_name,
    CASE 
      WHEN a.code LIKE '1-11%' THEN 'Operating Activities'
      WHEN a.code LIKE '1-12%' OR a.code LIKE '1-13%' THEN 'Investing Activities'
      WHEN a.code LIKE '2-%' THEN 'Financing Activities'
      ELSE 'Other Activities'
    END as category,
    COALESCE(SUM(jl.debit - jl.credit), 0)::BIGINT as amount
  FROM account a
  LEFT JOIN journal_line jl ON jl.account_code = a.code
  LEFT JOIN journal j ON j.id = jl.journal_id
  WHERE j.date >= p_start_date
    AND j.date <= p_end_date
    AND j.status = 'POSTED'
    AND a.type = 'ASSET'
    AND (a.code LIKE '1-11%' OR a.code LIKE '1-12%' OR a.code LIKE '1-13%')
  GROUP BY a.code, a.name
  HAVING ABS(SUM(jl.debit - jl.credit)) > 0
  ORDER BY 
    CASE 
      WHEN a.code LIKE '1-11%' THEN 1
      WHEN a.code LIKE '1-12%' OR a.code LIKE '1-13%' THEN 2
      ELSE 3
    END,
    a.code;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;