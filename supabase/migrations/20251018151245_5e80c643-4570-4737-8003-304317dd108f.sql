-- =============================================
-- BATCH 3: SALES INVOICE & CASH RECEIPT TABLES
-- =============================================

-- Create sales_invoice table
CREATE TABLE sales_invoice (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  number TEXT UNIQUE NOT NULL,
  date DATE NOT NULL,
  due_date DATE NOT NULL,
  client_id UUID NOT NULL REFERENCES client(id),
  project_id UUID REFERENCES project(id),
  
  subtotal BIGINT NOT NULL,
  vat_amount BIGINT NOT NULL,
  total BIGINT NOT NULL,
  
  faktur_pajak_number TEXT,
  description TEXT,
  
  status TEXT DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'SENT', 'PARTIAL', 'PAID', 'OVERDUE', 'CANCELLED')),
  
  unbilled_revenue_recognized BIGINT DEFAULT 0,
  journal_id UUID,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID
);

CREATE INDEX idx_invoice_number ON sales_invoice(number);
CREATE INDEX idx_invoice_client ON sales_invoice(client_id);
CREATE INDEX idx_invoice_date ON sales_invoice(date);
CREATE INDEX idx_invoice_status ON sales_invoice(status);

-- Create invoice_line table
CREATE TABLE invoice_line (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID NOT NULL REFERENCES sales_invoice(id) ON DELETE CASCADE,
  
  description TEXT NOT NULL,
  quantity DECIMAL(10,2) DEFAULT 1,
  unit_price BIGINT NOT NULL,
  amount BIGINT NOT NULL,
  
  revenue_account_code TEXT NOT NULL REFERENCES account(code),
  project_id UUID REFERENCES project(id),
  
  sort_order INTEGER DEFAULT 0
);

CREATE INDEX idx_invoice_line_invoice ON invoice_line(invoice_id);

-- Create cash_receipt table
CREATE TABLE cash_receipt (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  number TEXT UNIQUE NOT NULL,
  date DATE NOT NULL,
  invoice_id UUID NOT NULL REFERENCES sales_invoice(id),
  client_id UUID NOT NULL REFERENCES client(id),
  
  amount BIGINT NOT NULL,
  pph23_withheld BIGINT DEFAULT 0,
  bank_account_code TEXT NOT NULL REFERENCES account(code),
  
  description TEXT,
  journal_id UUID,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID
);

CREATE INDEX idx_receipt_number ON cash_receipt(number);
CREATE INDEX idx_receipt_date ON cash_receipt(date);
CREATE INDEX idx_receipt_invoice ON cash_receipt(invoice_id);

-- Add foreign key for journal_id
ALTER TABLE sales_invoice 
  ADD CONSTRAINT fk_invoice_journal 
  FOREIGN KEY (journal_id) REFERENCES journal(id);

ALTER TABLE cash_receipt
  ADD CONSTRAINT fk_receipt_journal
  FOREIGN KEY (journal_id) REFERENCES journal(id);

-- Enable RLS
ALTER TABLE sales_invoice ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_line ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_receipt ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Allow authenticated read sales_invoice" ON sales_invoice
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated write sales_invoice" ON sales_invoice
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated read invoice_line" ON invoice_line
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated write invoice_line" ON invoice_line
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated read cash_receipt" ON cash_receipt
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated write cash_receipt" ON cash_receipt
  FOR ALL USING (auth.role() = 'authenticated');

-- Helper functions
CREATE OR REPLACE FUNCTION get_next_invoice_number()
RETURNS TEXT AS $$
DECLARE
  next_num INTEGER;
BEGIN
  SELECT COUNT(*) + 1 INTO next_num FROM sales_invoice;
  RETURN 'INV-2025-' || LPAD(next_num::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_next_receipt_number()
RETURNS TEXT AS $$
DECLARE
  next_num INTEGER;
BEGIN
  SELECT COUNT(*) + 1 INTO next_num FROM cash_receipt;
  RETURN 'RCP-2025-' || LPAD(next_num::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- Update invoice status trigger
CREATE OR REPLACE FUNCTION update_invoice_status()
RETURNS TRIGGER AS $$
DECLARE
  total_paid BIGINT;
  invoice_total BIGINT;
BEGIN
  SELECT COALESCE(SUM(amount), 0) INTO total_paid
  FROM cash_receipt
  WHERE invoice_id = NEW.invoice_id;

  SELECT total INTO invoice_total
  FROM sales_invoice
  WHERE id = NEW.invoice_id;

  IF total_paid = 0 THEN
    UPDATE sales_invoice SET status = 'SENT' WHERE id = NEW.invoice_id;
  ELSIF total_paid >= invoice_total THEN
    UPDATE sales_invoice SET status = 'PAID' WHERE id = NEW.invoice_id;
  ELSE
    UPDATE sales_invoice SET status = 'PARTIAL' WHERE id = NEW.invoice_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_invoice_status_on_receipt
  AFTER INSERT ON cash_receipt
  FOR EACH ROW
  EXECUTE FUNCTION update_invoice_status();

-- Trigger for updated_at
CREATE TRIGGER update_invoice_updated_at
  BEFORE UPDATE ON sales_invoice
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- =============================================
-- END OF MIGRATION
-- =============================================