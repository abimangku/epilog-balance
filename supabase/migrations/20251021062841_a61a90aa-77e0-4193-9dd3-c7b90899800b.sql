-- Create import_log table to track all data imports
CREATE TABLE IF NOT EXISTS import_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_type TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  records_total INT NOT NULL,
  records_success INT NOT NULL,
  records_failed INT NOT NULL,
  error_details JSONB,
  imported_by UUID REFERENCES auth.users(id),
  imported_at TIMESTAMPTZ DEFAULT NOW(),
  can_rollback BOOLEAN DEFAULT TRUE,
  rolled_back_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE import_log ENABLE ROW LEVEL SECURITY;

-- Policies for import_log
CREATE POLICY "Users can view own imports"
  ON import_log FOR SELECT
  USING (imported_by = auth.uid());

CREATE POLICY "Users can insert own imports"
  ON import_log FOR INSERT
  WITH CHECK (imported_by = auth.uid());

CREATE POLICY "Admins can view all imports"
  ON import_log FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Add import_log_id to track imported records
ALTER TABLE account ADD COLUMN IF NOT EXISTS import_log_id UUID REFERENCES import_log(id);
ALTER TABLE client ADD COLUMN IF NOT EXISTS import_log_id UUID REFERENCES import_log(id);
ALTER TABLE vendor ADD COLUMN IF NOT EXISTS import_log_id UUID REFERENCES import_log(id);
ALTER TABLE journal ADD COLUMN IF NOT EXISTS import_log_id UUID REFERENCES import_log(id);