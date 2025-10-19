-- Create function to generate next journal number
CREATE OR REPLACE FUNCTION public.get_next_journal_number()
RETURNS text
LANGUAGE plpgsql
AS $function$
DECLARE
  next_num INTEGER;
BEGIN
  SELECT COUNT(*) + 1 INTO next_num FROM journal;
  RETURN 'JRN-2025-' || LPAD(next_num::TEXT, 4, '0');
END;
$function$;