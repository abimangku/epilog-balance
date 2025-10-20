-- Add missing columns to client table
ALTER TABLE client 
ADD COLUMN IF NOT EXISTS contact_person text,
ADD COLUMN IF NOT EXISTS city text,
ADD COLUMN IF NOT EXISTS notes text;

-- Add missing columns to vendor table
ALTER TABLE vendor
ADD COLUMN IF NOT EXISTS contact_person text,
ADD COLUMN IF NOT EXISTS city text,
ADD COLUMN IF NOT EXISTS notes text;