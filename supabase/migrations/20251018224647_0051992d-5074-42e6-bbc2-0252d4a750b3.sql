-- =============================================
-- BATCH 5: PERIOD CLOSE & AI AUDITOR
-- =============================================

-- Period status tracking
CREATE TABLE IF NOT EXISTS period_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL CHECK (status IN ('OPEN', 'CLOSING', 'CLOSED')),
  closed_at TIMESTAMPTZ,
  closed_by UUID,
  snapshot_id UUID,
  ai_audit_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Period snapshots (frozen balances)
CREATE TABLE IF NOT EXISTS period_snapshot (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period TEXT NOT NULL,
  account_code TEXT NOT NULL REFERENCES account(code),
  debit_balance BIGINT NOT NULL DEFAULT 0,
  credit_balance BIGINT NOT NULL DEFAULT 0,
  net_balance BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(period, account_code)
);

-- AI audit results
CREATE TABLE IF NOT EXISTS ai_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period TEXT NOT NULL,
  audit_type TEXT NOT NULL DEFAULT 'PERIOD_CLOSE',
  status TEXT NOT NULL CHECK (status IN ('RUNNING', 'COMPLETED', 'FAILED')),
  issues JSONB,
  summary TEXT,
  metrics JSONB,
  recommendations TEXT[],
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_period_snapshot_period ON period_snapshot(period);
CREATE INDEX IF NOT EXISTS idx_ai_audit_period ON ai_audit(period);

-- =============================================
-- HELPER FUNCTIONS
-- =============================================

-- Function: Calculate account balance for period
CREATE OR REPLACE FUNCTION get_account_balance(
  p_account_code TEXT,
  p_period TEXT
)
RETURNS TABLE(debit_total BIGINT, credit_total BIGINT, net_balance BIGINT) AS $$
DECLARE
  account_type TEXT;
BEGIN
  SELECT type INTO account_type FROM account WHERE code = p_account_code;
  
  RETURN QUERY
  SELECT 
    COALESCE(SUM(jl.debit), 0)::BIGINT as debit_total,
    COALESCE(SUM(jl.credit), 0)::BIGINT as credit_total,
    CASE 
      WHEN account_type IN ('ASSET', 'COGS', 'OPEX') THEN
        COALESCE(SUM(jl.debit - jl.credit), 0)::BIGINT
      ELSE
        COALESCE(SUM(jl.credit - jl.debit), 0)::BIGINT
    END as net_balance
  FROM journal_line jl
  JOIN journal j ON j.id = jl.journal_id
  WHERE jl.account_code = p_account_code
    AND j.period = p_period
    AND j.status = 'POSTED';
END;
$$ LANGUAGE plpgsql;

-- Function: Create period snapshot
CREATE OR REPLACE FUNCTION create_period_snapshot(p_period TEXT)
RETURNS UUID AS $$
DECLARE
  snapshot_id UUID;
  account_rec RECORD;
  balance_rec RECORD;
BEGIN
  DELETE FROM period_snapshot WHERE period = p_period;
  
  snapshot_id := gen_random_uuid();
  
  FOR account_rec IN 
    SELECT code FROM account WHERE is_active = true
  LOOP
    SELECT * INTO balance_rec 
    FROM get_account_balance(account_rec.code, p_period);
    
    IF balance_rec.debit_total > 0 OR balance_rec.credit_total > 0 THEN
      INSERT INTO period_snapshot (
        id, period, account_code, 
        debit_balance, credit_balance, net_balance
      ) VALUES (
        gen_random_uuid(), p_period, account_rec.code,
        balance_rec.debit_total, 
        balance_rec.credit_total, 
        balance_rec.net_balance
      );
    END IF;
  END LOOP;
  
  RETURN snapshot_id;
END;
$$ LANGUAGE plpgsql;

-- Function: Check if period is closed
CREATE OR REPLACE FUNCTION is_period_closed(p_period TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  period_is_closed BOOLEAN;
BEGIN
  SELECT status = 'CLOSED' INTO period_is_closed
  FROM period_status
  WHERE period = p_period;
  
  RETURN COALESCE(period_is_closed, false);
END;
$$ LANGUAGE plpgsql;

-- Function: Calculate net VAT position
CREATE OR REPLACE FUNCTION calculate_vat_position(p_period TEXT)
RETURNS TABLE(
  ppn_keluaran BIGINT,
  ppn_masukan BIGINT,
  net_payable BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(CASE WHEN jl.account_code = '2-22000' THEN jl.credit ELSE 0 END), 0)::BIGINT,
    COALESCE(SUM(CASE WHEN jl.account_code = '1-14000' THEN jl.debit ELSE 0 END), 0)::BIGINT,
    COALESCE(
      SUM(CASE WHEN jl.account_code = '2-22000' THEN jl.credit ELSE 0 END) -
      SUM(CASE WHEN jl.account_code = '1-14000' THEN jl.debit ELSE 0 END),
      0
    )::BIGINT
  FROM journal_line jl
  JOIN journal j ON j.id = jl.journal_id
  WHERE j.period = p_period
    AND j.status = 'POSTED'
    AND jl.account_code IN ('2-22000', '1-14000');
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- TRIGGER: Prevent editing closed periods
-- =============================================

CREATE OR REPLACE FUNCTION prevent_closed_period_changes()
RETURNS TRIGGER AS $$
DECLARE
  period_closed BOOLEAN;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT is_period_closed(NEW.period) INTO period_closed;
    IF period_closed THEN
      RAISE EXCEPTION 'Cannot create journal in closed period: %', NEW.period;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    SELECT is_period_closed(OLD.period) INTO period_closed;
    IF period_closed THEN
      RAISE EXCEPTION 'Cannot modify journal in closed period: %', OLD.period;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    SELECT is_period_closed(OLD.period) INTO period_closed;
    IF period_closed THEN
      RAISE EXCEPTION 'Cannot delete journal in closed period: %', OLD.period;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER protect_closed_periods
  BEFORE INSERT OR UPDATE OR DELETE ON journal
  FOR EACH ROW
  EXECUTE FUNCTION prevent_closed_period_changes();

-- =============================================
-- RLS POLICIES
-- =============================================

ALTER TABLE period_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE period_snapshot ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to view period status"
  ON period_status FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to manage period status"
  ON period_status FOR ALL
  USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to view snapshots"
  ON period_snapshot FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to view audits"
  ON ai_audit FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to create audits"
  ON ai_audit FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');