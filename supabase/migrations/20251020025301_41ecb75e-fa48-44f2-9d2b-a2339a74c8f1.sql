-- Add missing bank columns to vendor table
ALTER TABLE vendor
ADD COLUMN IF NOT EXISTS bank_name text,
ADD COLUMN IF NOT EXISTS bank_account_number text,
ADD COLUMN IF NOT EXISTS bank_account_name text;

-- Add missing columns to project table
ALTER TABLE project
ADD COLUMN IF NOT EXISTS description text,
ADD COLUMN IF NOT EXISTS budget_amount bigint,
ADD COLUMN IF NOT EXISTS notes text;