-- Add voiding fields to vendor_bill
ALTER TABLE vendor_bill 
ADD COLUMN IF NOT EXISTS voided_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS voided_by uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS void_reason text,
ADD COLUMN IF NOT EXISTS reversal_journal_id uuid REFERENCES journal(id);

-- Add voiding fields to sales_invoice
ALTER TABLE sales_invoice 
ADD COLUMN IF NOT EXISTS voided_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS voided_by uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS void_reason text,
ADD COLUMN IF NOT EXISTS reversal_journal_id uuid REFERENCES journal(id);

-- Create audit_log table
CREATE TABLE IF NOT EXISTS audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name text NOT NULL,
  record_id uuid NOT NULL,
  action text NOT NULL,
  changed_by uuid REFERENCES auth.users(id),
  changed_at timestamp with time zone DEFAULT now(),
  reason text,
  old_values jsonb,
  new_values jsonb
);

-- Enable RLS on audit_log
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view audit logs
CREATE POLICY "Authenticated users can view audit logs"
ON audit_log FOR SELECT
TO authenticated
USING (true);

-- System can insert audit logs
CREATE POLICY "System can insert audit logs"
ON audit_log FOR INSERT
TO authenticated
WITH CHECK (changed_by = auth.uid());

-- Allow admins to void bills
CREATE POLICY "Admins can void bills"
ON vendor_bill FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (voided_at IS NOT NULL OR status = 'DRAFT');

-- Allow users to edit their own draft bills
CREATE POLICY "Users can edit draft bills"
ON vendor_bill FOR UPDATE
TO authenticated
USING (status = 'DRAFT' AND created_by = auth.uid())
WITH CHECK (status = 'DRAFT');

-- Allow admins to void invoices
CREATE POLICY "Admins can void invoices"
ON sales_invoice FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (voided_at IS NOT NULL OR status = 'DRAFT');

-- Allow users to edit their own draft invoices
CREATE POLICY "Users can edit draft invoices"
ON sales_invoice FOR UPDATE
TO authenticated
USING (status = 'DRAFT' AND created_by = auth.uid())
WITH CHECK (status = 'DRAFT');