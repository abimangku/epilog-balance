import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Check if user is admin
    const { data: userRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (!userRole || userRole.role !== 'admin') {
      throw new Error('Only admins can void invoices');
    }

    const { invoiceId, reason } = await req.json();

    if (!invoiceId || !reason) {
      throw new Error('Invoice ID and reason are required');
    }

    console.log('Voiding invoice:', invoiceId);

    // Get invoice details
    const { data: invoice, error: invoiceError } = await supabase
      .from('sales_invoice')
      .select('*, invoice_line(*), client(*)')
      .eq('id', invoiceId)
      .single();

    if (invoiceError || !invoice) {
      throw new Error('Invoice not found');
    }

    if (invoice.voided_at) {
      throw new Error('Invoice is already voided');
    }

    if (invoice.status === 'DRAFT') {
      throw new Error('Cannot void a draft invoice. Delete it instead.');
    }

    // Create reversal journal entry
    const reversalPeriod = new Date().toISOString().slice(0, 7);
    const { count } = await supabase
      .from('journal')
      .select('*', { count: 'exact', head: true });

    const reversalNumber = `JV-2025-${String((count || 0) + 1).padStart(4, '0')}`;

    const { data: reversalJournal, error: journalError } = await supabase
      .from('journal')
      .insert({
        number: reversalNumber,
        date: new Date().toISOString().split('T')[0],
        description: `VOID: ${invoice.number} - ${reason}`,
        period: reversalPeriod,
        status: 'POSTED',
        source_doc_type: 'SALES_INVOICE',
        source_doc_id: invoiceId,
      })
      .select()
      .single();

    if (journalError) {
      throw journalError;
    }

    // Create reversal journal lines (opposite of original)
    const reversalLines = invoice.invoice_line.map((line: any, idx: number) => ({
      journal_id: reversalJournal.id,
      account_code: line.revenue_account_code,
      debit: line.amount,
      credit: 0,
      description: `REVERSAL: ${line.description}`,
      project_code: line.project_code,
      sort_order: idx,
    }));

    // Add VAT reversal if applicable
    if (invoice.vat_amount > 0) {
      reversalLines.push({
        journal_id: reversalJournal.id,
        account_code: '2-22000',
        debit: invoice.vat_amount,
        credit: 0,
        description: 'REVERSAL: PPN Keluaran',
        sort_order: reversalLines.length,
      });
    }

    // Add AR reversal
    reversalLines.push({
      journal_id: reversalJournal.id,
      account_code: '1-15000',
      debit: 0,
      credit: invoice.total,
      description: `REVERSAL: AR - ${invoice.client.name}`,
      sort_order: reversalLines.length,
    });

    const { error: linesError } = await supabase
      .from('journal_line')
      .insert(reversalLines);

    if (linesError) {
      throw linesError;
    }

    // Mark invoice as voided
    const { error: updateError } = await supabase
      .from('sales_invoice')
      .update({
        voided_at: new Date().toISOString(),
        voided_by: user.id,
        void_reason: reason,
        reversal_journal_id: reversalJournal.id,
      })
      .eq('id', invoiceId);

    if (updateError) {
      throw updateError;
    }

    // Log in audit_log
    await supabase
      .from('audit_log')
      .insert({
        table_name: 'sales_invoice',
        record_id: invoiceId,
        action: 'void',
        changed_by: user.id,
        reason: reason,
        old_values: invoice,
        new_values: { voided_at: new Date().toISOString(), reversal_journal_id: reversalJournal.id },
      });

    console.log('Invoice voided successfully');

    return new Response(
      JSON.stringify({ success: true, reversalJournalId: reversalJournal.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error voiding invoice:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});