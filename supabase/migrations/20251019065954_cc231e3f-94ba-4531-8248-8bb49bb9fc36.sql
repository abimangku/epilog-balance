-- Remove public read access from journal table
DROP POLICY IF EXISTS "Allow public read" ON public.journal;

-- Remove public read access from journal_line table
DROP POLICY IF EXISTS "Allow public read" ON public.journal_line;

-- The tables still have "Allow authenticated read" and "Allow authenticated write" policies
-- which provide proper access control for logged-in users