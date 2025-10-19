-- Fix 1: Convert views to SECURITY INVOKER (ERROR level)
ALTER VIEW ap_aging_summary SET (security_invoker = true);
ALTER VIEW dashboard_metrics SET (security_invoker = true);
ALTER VIEW trial_balance SET (security_invoker = true);
ALTER VIEW unified_transactions SET (security_invoker = true);

-- Fix 2: Remove public read from account table (WARN level)
DROP POLICY IF EXISTS "Allow public read" ON public.account;

-- Fix 3: Convert financial report functions to SECURITY INVOKER (WARN level)
ALTER FUNCTION get_profit_loss(text, text) SECURITY INVOKER;
ALTER FUNCTION get_balance_sheet(text) SECURITY INVOKER;
ALTER FUNCTION get_cash_flow(date, date) SECURITY INVOKER;