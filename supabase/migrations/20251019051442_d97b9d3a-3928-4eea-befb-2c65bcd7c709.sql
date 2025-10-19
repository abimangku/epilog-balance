-- Task 1: Create AI Database Tables
CREATE TABLE IF NOT EXISTS public.tx_input (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  description TEXT NOT NULL,
  amount BIGINT NOT NULL,
  vendor TEXT,
  category TEXT,
  project_code TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'CLASSIFIED', 'ACCEPTED', 'REJECTED')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.tx_ai_suggestion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tx_input_id UUID NOT NULL REFERENCES public.tx_input(id) ON DELETE CASCADE,
  suggested_type TEXT NOT NULL,
  suggested_vendor TEXT,
  suggested_client TEXT,
  suggested_project TEXT,
  suggested_accounts JSONB NOT NULL,
  confidence NUMERIC(3,2) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  reasoning TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACCEPTED', 'REJECTED')),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.tx_input ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tx_ai_suggestion ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view tx_input"
  ON public.tx_input FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert tx_input"
  ON public.tx_input FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Authenticated users can update their tx_input"
  ON public.tx_input FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid());

CREATE POLICY "Authenticated users can view tx_ai_suggestion"
  ON public.tx_ai_suggestion FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "System can insert tx_ai_suggestion"
  ON public.tx_ai_suggestion FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE TRIGGER update_tx_input_updated_at
  BEFORE UPDATE ON public.tx_input
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE INDEX idx_tx_input_status ON public.tx_input(status);
CREATE INDEX idx_tx_input_created_by ON public.tx_input(created_by);
CREATE INDEX idx_tx_ai_suggestion_tx_input_id ON public.tx_ai_suggestion(tx_input_id);

-- Task 3: Create Dashboard Metrics View
CREATE OR REPLACE VIEW public.dashboard_metrics AS
WITH current_month AS (
  SELECT to_char(CURRENT_DATE, 'YYYY-MM') AS period
),
cash_accounts AS (
  SELECT 
    COALESCE(SUM(
      CASE 
        WHEN a.type = 'ASSET' THEN jl.debit - jl.credit
        ELSE jl.credit - jl.debit
      END
    ), 0) AS cash_balance
  FROM journal_line jl
  JOIN journal j ON j.id = jl.journal_id
  JOIN account a ON a.code = jl.account_code
  WHERE j.status = 'POSTED'
    AND a.code LIKE '1-10%'
),
ar_summary AS (
  SELECT 
    COALESCE(SUM(total - COALESCE((
      SELECT SUM(amount) FROM cash_receipt WHERE invoice_id = si.id
    ), 0)), 0) AS ar_total,
    COUNT(*) FILTER (WHERE due_date < CURRENT_DATE AND status != 'PAID') AS overdue_invoices
  FROM sales_invoice si
  WHERE status IN ('SENT', 'PARTIAL')
),
ap_summary AS (
  SELECT 
    COALESCE(SUM(total - COALESCE((
      SELECT SUM(amount + pph23_withheld) FROM vendor_payment WHERE bill_id = vb.id
    ), 0)), 0) AS ap_total,
    COUNT(*) FILTER (WHERE due_date < CURRENT_DATE AND status IN ('APPROVED', 'PARTIAL')) AS overdue_bills
  FROM vendor_bill vb
  WHERE status IN ('APPROVED', 'PARTIAL')
),
mtd_revenue AS (
  SELECT 
    COALESCE(SUM(jl.credit - jl.debit), 0) AS mtd_revenue
  FROM journal_line jl
  JOIN journal j ON j.id = jl.journal_id
  JOIN account a ON a.code = jl.account_code
  WHERE j.status = 'POSTED'
    AND j.period = (SELECT period FROM current_month)
    AND a.type = 'REVENUE'
),
mtd_expenses AS (
  SELECT 
    COALESCE(SUM(jl.debit - jl.credit), 0) AS mtd_expenses
  FROM journal_line jl
  JOIN journal j ON j.id = jl.journal_id
  JOIN account a ON a.code = jl.account_code
  WHERE j.status = 'POSTED'
    AND j.period = (SELECT period FROM current_month)
    AND a.type IN ('COGS', 'OPEX', 'OTHER_EXPENSE')
)
SELECT 
  cash_accounts.cash_balance,
  ar_summary.ar_total,
  ar_summary.overdue_invoices,
  ap_summary.ap_total,
  ap_summary.overdue_bills,
  mtd_revenue.mtd_revenue,
  mtd_expenses.mtd_expenses
FROM cash_accounts, ar_summary, ap_summary, mtd_revenue, mtd_expenses;

GRANT SELECT ON public.dashboard_metrics TO authenticated;