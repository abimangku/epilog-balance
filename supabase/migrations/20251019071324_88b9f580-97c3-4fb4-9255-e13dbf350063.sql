-- Fix mutable search_path for all public functions
-- This prevents search_path manipulation attacks

-- Financial reporting functions
ALTER FUNCTION public.get_profit_loss(text, text) SET search_path = public;
ALTER FUNCTION public.get_balance_sheet(text) SET search_path = public;
ALTER FUNCTION public.get_cash_flow(date, date) SET search_path = public;
ALTER FUNCTION public.get_account_balance(text, text) SET search_path = public;
ALTER FUNCTION public.calculate_vat_position(text) SET search_path = public;

-- Period management functions
ALTER FUNCTION public.create_period_snapshot(text) SET search_path = public;
ALTER FUNCTION public.is_period_closed(text) SET search_path = public;
ALTER FUNCTION public.prevent_closed_period_changes() SET search_path = public;

-- Auto-numbering functions
ALTER FUNCTION public.get_next_bill_number() SET search_path = public;
ALTER FUNCTION public.get_next_invoice_number() SET search_path = public;
ALTER FUNCTION public.get_next_journal_number() SET search_path = public;
ALTER FUNCTION public.get_next_payment_number() SET search_path = public;
ALTER FUNCTION public.get_next_receipt_number() SET search_path = public;

-- Status update functions
ALTER FUNCTION public.update_bill_status(uuid) SET search_path = public;
ALTER FUNCTION public.trigger_update_bill_status() SET search_path = public;
ALTER FUNCTION public.update_invoice_status() SET search_path = public;

-- Trigger functions
ALTER FUNCTION public.update_updated_at() SET search_path = public;
ALTER FUNCTION public.update_conversation_timestamp() SET search_path = public;

-- CRITICAL: Tax rules audit function (SECURITY DEFINER)
ALTER FUNCTION public.log_tax_rule_changes() SET search_path = public;