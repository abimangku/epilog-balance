-- PHASE 1: Tax Rules Database & Knowledge Base

-- Create enum for tax rule types
CREATE TYPE tax_rule_type AS ENUM ('PPH21', 'PPH23', 'PPN', 'PPH_FINAL', 'FAKTUR_PAJAK');

-- Create enum for entity types
CREATE TYPE entity_type AS ENUM ('individual', 'company', 'government', 'kol', 'employee');

-- Tax Rules Table
CREATE TABLE tax_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_type tax_rule_type NOT NULL,
  entity_type entity_type,
  service_category TEXT,
  rate NUMERIC(5,4), -- e.g., 0.02 for 2%
  threshold_amount BIGINT, -- minimum amount before tax applies
  requires_npwp BOOLEAN DEFAULT false,
  requires_pkp BOOLEAN DEFAULT false,
  exemptions JSONB, -- special exemption cases
  regulation_reference TEXT, -- e.g., "PP 23/2018", "PMK 141/2015"
  description TEXT,
  effective_from DATE NOT NULL,
  effective_to DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Accounting Rules Table (PSAK compliance)
CREATE TABLE accounting_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_name TEXT NOT NULL,
  rule_category TEXT NOT NULL, -- 'cogs_validation', 'period_close', 'balance_check', 'tax_compliance'
  condition JSONB, -- JSON logic for when rule applies
  severity TEXT NOT NULL CHECK (severity IN ('error', 'warning', 'info')),
  message TEXT NOT NULL,
  auto_fix BOOLEAN DEFAULT false,
  psak_reference TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Knowledge Base Table (stores uploaded PDFs and documentation)
CREATE TABLE knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_type TEXT NOT NULL, -- 'tax_regulation', 'accounting_standard', 'company_policy'
  title TEXT NOT NULL,
  content TEXT NOT NULL, -- full text content
  metadata JSONB, -- tags, keywords, etc.
  version INTEGER DEFAULT 1,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tax Rules History Table (audit trail)
CREATE TABLE tax_rules_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tax_rule_id UUID REFERENCES tax_rules(id) ON DELETE CASCADE,
  changed_by UUID REFERENCES auth.users(id),
  change_type TEXT NOT NULL CHECK (change_type IN ('created', 'updated', 'deleted')),
  old_values JSONB,
  new_values JSONB,
  change_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Seed Indonesian Tax Rules
INSERT INTO tax_rules (rule_type, entity_type, service_category, rate, requires_npwp, regulation_reference, description, effective_from) VALUES
-- PPh 23 Rules
('PPH23', 'individual', 'creative_services', 0.02, true, 'PMK 141/2015', 'KOL/influencer payments subject to 2% PPh 23', '2015-01-01'),
('PPH23', 'individual', 'consulting', 0.02, true, 'PMK 141/2015', 'Individual consultant fees subject to 2% PPh 23', '2015-01-01'),
('PPH23', 'company', 'rent', 0.02, true, 'PMK 141/2015', 'Rental payments to companies subject to 2% PPh 23', '2015-01-01'),
('PPH23', 'company', 'consulting', 0.02, true, 'PMK 141/2015', 'Consulting fees to companies subject to 2% PPh 23', '2015-01-01'),
('PPH23', 'company', 'technical_services', 0.02, true, 'PMK 141/2015', 'Technical services subject to 2% PPh 23', '2015-01-01'),

-- PPh 21 Rules
('PPH21', 'individual', 'salary', NULL, false, 'UU PPh Pasal 21', 'Employee salary tax - progressive rates', '2020-01-01'),
('PPH21', 'individual', 'freelance', 0.025, true, 'UU PPh Pasal 21', 'Freelance with NPWP - 2.5%', '2020-01-01'),
('PPH21', 'individual', 'freelance', 0.05, false, 'UU PPh Pasal 21', 'Freelance without NPWP - 5%', '2020-01-01'),

-- PPN Rules
('PPN', NULL, 'goods', 0.11, false, 'UU HPP 2021', 'Standard VAT rate 11% on goods', '2022-04-01'),
('PPN', NULL, 'services', 0.11, false, 'UU HPP 2021', 'Standard VAT rate 11% on services', '2022-04-01'),
('PPN', NULL, 'creative_services', 0.11, false, 'UU HPP 2021', 'Creative services subject to 11% PPN', '2022-04-01'),

-- Faktur Pajak Rules
('FAKTUR_PAJAK', NULL, NULL, NULL, false, 'PER-03/PJ/2022', 'Faktur Pajak required for transactions > IDR 1,000,000', '2022-01-01');

-- Seed Accounting Rules (PSAK compliance)
INSERT INTO accounting_rules (rule_name, rule_category, severity, message, psak_reference) VALUES
('cogs_requires_project', 'cogs_validation', 'error', 'COGS transactions must be linked to a project code (PSAK 34 - Revenue Recognition)', 'PSAK 34'),
('vat_requires_faktur_pajak', 'tax_compliance', 'warning', 'VAT input claims require valid Faktur Pajak number - may be rejected by DJP', 'PMK 141/2015'),
('balanced_journal_entry', 'journal_validation', 'error', 'Total debits must equal total credits in all journal entries (PSAK 1)', 'PSAK 1'),
('period_closed_no_posting', 'period_validation', 'error', 'Cannot post transactions to closed accounting periods', 'PSAK 25'),
('pph23_vendor_verification', 'tax_compliance', 'warning', 'Vendor marked as subject to PPh 23 but no withholding recorded', 'PMK 141/2015'),
('duplicate_transaction_check', 'data_quality', 'warning', 'Potential duplicate transaction detected - same vendor, amount, and date', 'Best Practice'),
('large_payment_no_attachment', 'documentation', 'warning', 'Payments over IDR 10,000,000 should have supporting documentation attached', 'Company Policy'),
('kol_payment_verification', 'tax_compliance', 'error', 'KOL payments require both PPh 21 withholding and PPN if PKP', 'PMK 141/2015');

-- Enable RLS
ALTER TABLE tax_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounting_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_rules_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Authenticated users can read, only admins can write
CREATE POLICY "Authenticated users can view tax rules"
  ON tax_rules FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage tax rules"
  ON tax_rules FOR ALL
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can view accounting rules"
  ON accounting_rules FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage accounting rules"
  ON accounting_rules FOR ALL
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can view knowledge base"
  ON knowledge_base FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage knowledge base"
  ON knowledge_base FOR ALL
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view tax rules history"
  ON tax_rules_history FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "System can insert tax rules history"
  ON tax_rules_history FOR INSERT
  WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX idx_tax_rules_type ON tax_rules(rule_type);
CREATE INDEX idx_tax_rules_entity ON tax_rules(entity_type);
CREATE INDEX idx_tax_rules_active ON tax_rules(is_active);
CREATE INDEX idx_accounting_rules_category ON accounting_rules(rule_category);
CREATE INDEX idx_knowledge_base_type ON knowledge_base(document_type);

-- Create trigger for tax rules history
CREATE OR REPLACE FUNCTION log_tax_rule_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    INSERT INTO tax_rules_history (tax_rule_id, changed_by, change_type, old_values, new_values)
    VALUES (
      NEW.id,
      auth.uid(),
      'updated',
      to_jsonb(OLD),
      to_jsonb(NEW)
    );
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO tax_rules_history (tax_rule_id, changed_by, change_type, new_values)
    VALUES (
      NEW.id,
      auth.uid(),
      'created',
      to_jsonb(NEW)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER tax_rules_audit_trigger
AFTER INSERT OR UPDATE ON tax_rules
FOR EACH ROW EXECUTE FUNCTION log_tax_rule_changes();

-- Create trigger for updated_at
CREATE TRIGGER update_tax_rules_updated_at
BEFORE UPDATE ON tax_rules
FOR EACH ROW EXECUTE FUNCTION update_updated_at();