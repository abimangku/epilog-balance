-- Add created_by_ai flag to journal table
ALTER TABLE journal ADD COLUMN created_by_ai boolean DEFAULT false;

-- Add index for filtering AI-created journals
CREATE INDEX idx_journal_created_by_ai ON journal(created_by_ai);

-- Update comment
COMMENT ON COLUMN journal.created_by_ai IS 'Flag indicating if this journal was created by AI assistant';