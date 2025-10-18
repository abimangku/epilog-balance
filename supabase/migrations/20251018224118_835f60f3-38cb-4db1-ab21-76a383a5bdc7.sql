-- =============================================
-- BATCH 4: VENDOR BILL & PAYMENT
-- =============================================

-- vendor_bill table
CREATE TABLE IF NOT EXISTS vendor_bill (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  number TEXT NOT NULL UNIQUE,
  vendor_invoice_number TEXT,
  date DATE NOT NULL,
  due_date DATE NOT NULL,
  vendor_id UUID NOT NULL REFERENCES vendor(id),
  project_id UUID REFERENCES project(id),
  subtotal BIGINT NOT NULL,
  vat_amount BIGINT NOT NULL DEFAULT 0,
  total BIGINT NOT NULL,
  faktur_pajak_number TEXT,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('COGS', 'OPEX')),
  status TEXT NOT NULL DEFAULT 'APPROVED' CHECK (status IN ('DRAFT', 'APPROVED', 'PARTIAL', 'PAID', 'CANCELLED')),
  journal_id UUID REFERENCES journal(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID
);

-- bill_line table
CREATE TABLE IF NOT EXISTS bill_line (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id UUID NOT NULL REFERENCES vendor_bill(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity NUMERIC(10,2) NOT NULL DEFAULT 1,
  unit_price BIGINT NOT NULL,
  amount BIGINT NOT NULL,
  expense_account_code TEXT NOT NULL REFERENCES account(code),
  project_code TEXT,
  sort_order INTEGER DEFAULT 0
);

-- vendor_payment table
CREATE TABLE IF NOT EXISTS vendor_payment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  number TEXT NOT NULL UNIQUE,
  date DATE NOT NULL,
  bill_id UUID NOT NULL REFERENCES vendor_bill(id),
  vendor_id UUID NOT NULL REFERENCES vendor(id),
  amount BIGINT NOT NULL,
  pph23_withheld BIGINT NOT NULL DEFAULT 0,
  bank_account_code TEXT NOT NULL,
  description TEXT,
  journal_id UUID REFERENCES journal(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID
);

-- Additional indexes for performance
CREATE INDEX IF NOT EXISTS idx_bill_vendor ON vendor_bill(vendor_id);
CREATE INDEX IF NOT EXISTS idx_bill_project ON vendor_bill(project_id);
CREATE INDEX IF NOT EXISTS idx_bill_journal ON vendor_bill(journal_id);
CREATE INDEX IF NOT EXISTS idx_bill_date ON vendor_bill(date);
CREATE INDEX IF NOT EXISTS idx_bill_status ON vendor_bill(status);
CREATE INDEX IF NOT EXISTS idx_bill_line_bill ON bill_line(bill_id);
CREATE INDEX IF NOT EXISTS idx_payment_bill ON vendor_payment(bill_id);
CREATE INDEX IF NOT EXISTS idx_payment_vendor ON vendor_payment(vendor_id);

-- Helper function: Get next bill number
CREATE OR REPLACE FUNCTION get_next_bill_number()
RETURNS TEXT AS $$
DECLARE
  next_num INTEGER;
BEGIN
  SELECT COUNT(*) + 1 INTO next_num FROM vendor_bill;
  RETURN 'BILL-2025-' || LPAD(next_num::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- Helper function: Get next payment number
CREATE OR REPLACE FUNCTION get_next_payment_number()
RETURNS TEXT AS $$
DECLARE
  next_num INTEGER;
BEGIN
  SELECT COUNT(*) + 1 INTO next_num FROM vendor_payment;
  RETURN 'PAY-2025-' || LPAD(next_num::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- Helper function: Update bill status based on payments
CREATE OR REPLACE FUNCTION update_bill_status(bill_uuid UUID)
RETURNS TEXT AS $$
DECLARE
  bill_total BIGINT;
  total_paid BIGINT;
  new_status TEXT;
BEGIN
  SELECT total INTO bill_total FROM vendor_bill WHERE id = bill_uuid;
  
  SELECT COALESCE(SUM(amount + pph23_withheld), 0) 
  INTO total_paid
  FROM vendor_payment 
  WHERE bill_id = bill_uuid;
  
  IF total_paid >= bill_total THEN
    new_status := 'PAID';
  ELSIF total_paid > 0 THEN
    new_status := 'PARTIAL';
  ELSE
    new_status := 'APPROVED';
  END IF;
  
  UPDATE vendor_bill 
  SET status = new_status,
      updated_at = NOW()
  WHERE id = bill_uuid;
  
  RETURN new_status;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- RLS POLICIES
-- =============================================

ALTER TABLE vendor_bill ENABLE ROW LEVEL SECURITY;
ALTER TABLE bill_line ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_payment ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to view bills"
  ON vendor_bill FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to create bills"
  ON vendor_bill FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to update bills"
  ON vendor_bill FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to manage bill lines"
  ON bill_line FOR ALL
  USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to view payments"
  ON vendor_payment FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to create payments"
  ON vendor_payment FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- =============================================
-- TRIGGER: Auto-update bill status on payment
-- =============================================

CREATE OR REPLACE FUNCTION trigger_update_bill_status()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM update_bill_status(NEW.bill_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_vendor_payment_insert
  AFTER INSERT ON vendor_payment
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_bill_status();

-- =============================================
-- VIEW: AP Aging Summary
-- =============================================

CREATE OR REPLACE VIEW ap_aging_summary AS
SELECT 
  b.id,
  b.number,
  b.date,
  b.due_date,
  v.name as vendor_name,
  p.name as project_name,
  b.category,
  b.total,
  COALESCE(SUM(vp.amount + vp.pph23_withheld), 0) as total_paid,
  b.total - COALESCE(SUM(vp.amount + vp.pph23_withheld), 0) as balance,
  CURRENT_DATE - b.due_date as days_overdue,
  CASE 
    WHEN CURRENT_DATE <= b.due_date THEN '0-30'
    WHEN CURRENT_DATE - b.due_date <= 30 THEN '0-30'
    WHEN CURRENT_DATE - b.due_date <= 60 THEN '31-60'
    WHEN CURRENT_DATE - b.due_date <= 90 THEN '61-90'
    ELSE '90+'
  END as aging_bucket,
  b.status
FROM vendor_bill b
JOIN vendor v ON v.id = b.vendor_id
LEFT JOIN project p ON p.id = b.project_id
LEFT JOIN vendor_payment vp ON vp.bill_id = b.id
WHERE b.status IN ('APPROVED', 'PARTIAL')
GROUP BY b.id, b.number, b.date, b.due_date, v.name, p.name, b.category, b.total, b.status;