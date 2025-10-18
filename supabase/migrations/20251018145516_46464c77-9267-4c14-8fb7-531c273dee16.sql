-- =============================================
-- VIBE ACCOUNTING - INITIAL SCHEMA
-- PSAK-Compliant for Epilog Creative
-- =============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- ENUMS
-- =============================================

CREATE TYPE account_type AS ENUM (
  'ASSET',
  'LIABILITY',
  'EQUITY',
  'REVENUE',
  'COGS',
  'OPEX',
  'OTHER_INCOME',
  'OTHER_EXPENSE',
  'TAX_EXPENSE'
);

CREATE TYPE invoice_status AS ENUM (
  'DRAFT',
  'SENT',
  'PARTIAL',
  'PAID',
  'OVERDUE',
  'CANCELLED'
);

CREATE TYPE bill_status AS ENUM (
  'DRAFT',
  'APPROVED',
  'PARTIAL',
  'PAID',
  'CANCELLED'
);

CREATE TYPE bill_category AS ENUM (
  'COGS',
  'OPEX'
);

CREATE TYPE project_status AS ENUM (
  'ACTIVE',
  'COMPLETED',
  'ON_HOLD'
);

CREATE TYPE journal_status AS ENUM (
  'DRAFT',
  'POSTED',
  'REVERSED'
);

CREATE TYPE tx_status AS ENUM (
  'PENDING',
  'CLASSIFIED',
  'APPROVED',
  'REJECTED'
);

CREATE TYPE suggestion_status AS ENUM (
  'PENDING',
  'ACCEPTED',
  'EDITED',
  'REJECTED'
);

-- =============================================
-- MASTER DATA TABLES
-- =============================================

CREATE TABLE account (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  type account_type NOT NULL,
  parent_code TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_account_code ON account(code);
CREATE INDEX idx_account_type ON account(type);

-- =============================================

CREATE TABLE client (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  tax_id TEXT,
  address TEXT,
  phone TEXT,
  email TEXT,
  payment_terms INTEGER DEFAULT 30,
  withholds_pph23 BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_client_code ON client(code);

-- =============================================

CREATE TABLE vendor (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  tax_id TEXT,
  address TEXT,
  phone TEXT,
  email TEXT,
  payment_terms INTEGER DEFAULT 30,
  provides_faktur_pajak BOOLEAN DEFAULT false,
  subject_to_pph23 BOOLEAN DEFAULT false,
  pph23_rate DECIMAL(5,4) DEFAULT 0.02,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_vendor_code ON vendor(code);

-- =============================================

CREATE TABLE project (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  client_id UUID REFERENCES client(id),
  start_date DATE,
  end_date DATE,
  status project_status DEFAULT 'ACTIVE',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_project_code ON project(code);
CREATE INDEX idx_project_client ON project(client_id);

-- =============================================

CREATE TABLE bank_account (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_code TEXT NOT NULL REFERENCES account(code),
  bank_name TEXT NOT NULL,
  account_number TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_bank_account_code ON bank_account(account_code);

-- =============================================

CREATE TABLE journal (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  number TEXT UNIQUE NOT NULL,
  date DATE NOT NULL,
  description TEXT NOT NULL,
  
  source_doc_type TEXT,
  source_doc_id UUID,
  
  status journal_status DEFAULT 'DRAFT',
  period TEXT NOT NULL,
  is_locked BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID,
  approved_at TIMESTAMPTZ,
  approved_by UUID
);

CREATE INDEX idx_journal_number ON journal(number);
CREATE INDEX idx_journal_date ON journal(date);
CREATE INDEX idx_journal_period ON journal(period);
CREATE INDEX idx_journal_status ON journal(status);

-- =============================================

CREATE TABLE journal_line (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  journal_id UUID NOT NULL REFERENCES journal(id) ON DELETE CASCADE,
  
  account_code TEXT NOT NULL REFERENCES account(code),
  
  debit BIGINT DEFAULT 0,
  credit BIGINT DEFAULT 0,
  
  description TEXT,
  project_code TEXT,
  
  sort_order INTEGER DEFAULT 0
);

CREATE INDEX idx_journal_line_journal ON journal_line(journal_id);
CREATE INDEX idx_journal_line_account ON journal_line(account_code);
CREATE INDEX idx_journal_line_project ON journal_line(project_code);

-- =============================================

CREATE TABLE settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID
);

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

ALTER TABLE account ENABLE ROW LEVEL SECURITY;
ALTER TABLE client ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor ENABLE ROW LEVEL SECURITY;
ALTER TABLE project ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_line ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read
CREATE POLICY "Allow authenticated read" ON account FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated write" ON account FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow authenticated read" ON client FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated write" ON client FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow authenticated read" ON vendor FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated write" ON vendor FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow authenticated read" ON project FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated write" ON project FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow authenticated read" ON journal FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated write" ON journal FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow authenticated read" ON journal_line FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated write" ON journal_line FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow authenticated read" ON settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated write" ON settings FOR ALL TO authenticated USING (true);

-- Allow public read for accounts (for unauthenticated access)
CREATE POLICY "Allow public read" ON account FOR SELECT TO anon USING (true);
CREATE POLICY "Allow public read" ON journal FOR SELECT TO anon USING (true);
CREATE POLICY "Allow public read" ON journal_line FOR SELECT TO anon USING (true);

-- =============================================
-- FUNCTIONS & TRIGGERS
-- =============================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_account_updated_at
  BEFORE UPDATE ON account
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_client_updated_at
  BEFORE UPDATE ON client
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_vendor_updated_at
  BEFORE UPDATE ON vendor
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_project_updated_at
  BEFORE UPDATE ON project
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================
-- SEED DATA - CHART OF ACCOUNTS
-- =============================================

-- ASSETS
INSERT INTO account (code, name, type) VALUES
  ('1-10100', 'Kas Kecil', 'ASSET'),
  ('1-10200', 'Bank BSI', 'ASSET'),
  ('1-10300', 'Bank BRI', 'ASSET'),
  ('1-10400', 'Giro', 'ASSET'),
  ('1-11000', 'Piutang Usaha', 'ASSET'),
  ('1-11100', 'Unbilled Revenue / WIP', 'ASSET'),
  ('1-12000', 'Uang Muka Vendor', 'ASSET'),
  ('1-14000', 'PPN Masukan', 'ASSET'),
  ('1-14100', 'PPh 23 Dibayar Dimuka', 'ASSET'),
  ('1-14500', 'PPh Dipotong oleh Klien', 'ASSET'),
  ('1-15100', 'Aset Tetap', 'ASSET'),
  ('1-15200', 'Akumulasi Penyusutan', 'ASSET'),
  ('1-17000', 'Loan Receivable - Shareholder', 'ASSET'),
  ('1-17010', 'Loan Receivable - Partner/Oemah Etnik', 'ASSET');

-- LIABILITIES
INSERT INTO account (code, name, type) VALUES
  ('2-20100', 'Utang Usaha', 'LIABILITY'),
  ('2-20200', 'Beban Akrual', 'LIABILITY'),
  ('2-21000', 'Pendapatan Diterima Dimuka', 'LIABILITY'),
  ('2-22000', 'PPN Keluaran', 'LIABILITY'),
  ('2-23000', 'Utang Pajak - PPh 21', 'LIABILITY'),
  ('2-23100', 'Utang Pajak - PPh 23', 'LIABILITY'),
  ('2-23200', 'Utang Pajak - PPh 25', 'LIABILITY');

-- EQUITY
INSERT INTO account (code, name, type) VALUES
  ('3-30100', 'Modal Disetor', 'EQUITY'),
  ('3-31000', 'Laba Ditahan', 'EQUITY');

-- REVENUE
INSERT INTO account (code, name, type) VALUES
  ('4-40100', 'Pendapatan Jasa - Retainer', 'REVENUE'),
  ('4-40200', 'Pendapatan Jasa - Project', 'REVENUE'),
  ('4-40900', 'Penyesuaian Pendapatan', 'REVENUE');

-- COGS
INSERT INTO account (code, name, type) VALUES
  ('5-50100', 'COGS - Media Placement', 'COGS'),
  ('5-50200', 'COGS - Platform & Tools', 'COGS'),
  ('5-50300', 'COGS - Content Production', 'COGS'),
  ('5-50400', 'COGS - Talent & KOL', 'COGS'),
  ('5-50500', 'COGS - Other Direct Costs', 'COGS');

-- OPEX
INSERT INTO account (code, name, type) VALUES
  ('6-60100', 'Gaji & Tunjangan', 'OPEX'),
  ('6-60110', 'BPJS & Asuransi', 'OPEX'),
  ('6-60200', 'Sewa & Utilitas', 'OPEX'),
  ('6-60300', 'Perangkat Lunak & Tools', 'OPEX'),
  ('6-60400', 'Transport, Makan, Entertain', 'OPEX'),
  ('6-60500', 'ATK & Operasional', 'OPEX'),
  ('6-60600', 'Jasa Profesional', 'OPEX'),
  ('6-60700', 'Pelatihan & Rekrutmen', 'OPEX'),
  ('6-60800', 'Biaya Bank & Admin', 'OPEX');

-- OTHER INCOME/EXPENSE
INSERT INTO account (code, name, type) VALUES
  ('7-70100', 'Pendapatan Lain-lain', 'OTHER_INCOME'),
  ('8-80100', 'Beban Lain-lain', 'OTHER_EXPENSE'),
  ('8-81000', 'Beban Bunga', 'OTHER_EXPENSE');

-- TAX
INSERT INTO account (code, name, type) VALUES
  ('9-90100', 'Beban Pajak Penghasilan', 'TAX_EXPENSE');

-- =============================================
-- DEFAULT SETTINGS
-- =============================================

INSERT INTO settings (key, value, description) VALUES
  ('VAT_RATE', '0.11', 'PPN rate (11%)'),
  ('PPH23_RATE', '0.02', 'PPh 23 withholding rate for jasa (2%)'),
  ('COMPANY_NAME', 'PT Epilog Kreatif Indonesia', 'Legal company name'),
  ('FISCAL_YEAR_START', '01', 'Fiscal year start month (01 = January)');