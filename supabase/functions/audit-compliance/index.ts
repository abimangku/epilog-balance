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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const issues: any[] = [];

    console.log('Starting compliance audit...');

    // Check 1: Bills claiming VAT without Faktur Pajak
    const { data: billsWithoutFP } = await supabase
      .from('vendor_bill')
      .select('id, number, date, vat_amount, vendor:vendor(name)')
      .gt('vat_amount', 0)
      .or('faktur_pajak_number.is.null,faktur_pajak_number.eq.');

    if (billsWithoutFP) {
      for (const bill of billsWithoutFP) {
        issues.push({
          issue_type: 'tax_risk',
          severity: 'high',
          message: `Bill ${bill.number} claims IDR ${(bill.vat_amount / 1).toLocaleString()} input VAT without Faktur Pajak`,
          action_required: 'Add Faktur Pajak number or remove VAT claim',
          related_entity_type: 'bill',
          related_entity_id: bill.id
        });
      }
    }

    // Check 2: Payments without PPh 23 for subject vendors
    const { data: paymentsWithoutPPh } = await supabase
      .from('vendor_payment')
      .select(`
        id, 
        number, 
        date, 
        amount, 
        pph23_withheld,
        bill:vendor_bill(
          vendor:vendor(name, subject_to_pph23)
        )
      `)
      .eq('pph23_withheld', 0);

    if (paymentsWithoutPPh) {
      for (const payment of paymentsWithoutPPh) {
        const billData: any = Array.isArray(payment.bill) ? payment.bill[0] : payment.bill;
        const vendorData: any = Array.isArray(billData?.vendor) ? billData.vendor[0] : billData?.vendor;
        if (vendorData?.subject_to_pph23) {
          const expectedPPh = Math.round(payment.amount * 0.02);
          issues.push({
            issue_type: 'tax_risk',
            severity: 'critical',
            message: `Payment ${payment.number} missing PPh 23 withholding (expected: IDR ${expectedPPh.toLocaleString()})`,
            action_required: 'Void payment and recreate with PPh 23 withholding',
            related_entity_type: 'payment',
            related_entity_id: payment.id
          });
        }
      }
    }

    // Check 3: COGS without project codes
    const { data: cogsWithoutProject } = await supabase
      .from('bill_line')
      .select(`
        id,
        description,
        amount,
        project_code,
        bill:vendor_bill(id, number)
      `)
      .is('project_code', null)
      .like('expense_account_code', '5-0%');

    if (cogsWithoutProject) {
      for (const line of cogsWithoutProject) {
        const bill = Array.isArray(line.bill) ? line.bill[0] : line.bill;
        issues.push({
          issue_type: 'accounting_error',
          severity: 'high',
          message: `COGS line "${line.description}" in Bill ${bill.number} missing project code (PSAK 34 violation)`,
          action_required: 'Edit bill and assign project code',
          related_entity_type: 'bill',
          related_entity_id: bill.id
        });
      }
    }

    // Check 4: Large payments without attachments
    const { data: largePayments } = await supabase
      .from('vendor_payment')
      .select('id, number, amount')
      .gt('amount', 10000000);

    if (largePayments) {
      for (const payment of largePayments) {
        const { data: attachments } = await supabase
          .from('transaction_attachment')
          .select('id')
          .eq('transaction_type', 'payment')
          .eq('transaction_id', payment.id);

        if (!attachments || attachments.length === 0) {
          issues.push({
            issue_type: 'documentation',
            severity: 'medium',
            message: `Large payment ${payment.number} (IDR ${(payment.amount / 1).toLocaleString()}) has no supporting documents`,
            action_required: 'Upload invoice or payment proof',
            related_entity_type: 'payment',
            related_entity_id: payment.id
          });
        }
      }
    }

    // Check 5: Duplicate transactions
    const { data: duplicateBills } = await supabase
      .rpc('find_duplicate_bills');

    if (duplicateBills && duplicateBills.length > 0) {
      for (const dup of duplicateBills) {
        issues.push({
          issue_type: 'data_quality',
          severity: 'medium',
          message: `Potential duplicate: Bills on ${dup.date} for vendor ${dup.vendor_name} with same amount`,
          action_required: 'Review and void duplicate if confirmed',
          related_entity_type: 'bill',
          related_entity_id: null
        });
      }
    }

    // Insert new issues into database
    if (issues.length > 0) {
      const { error: insertError } = await supabase
        .from('compliance_issue')
        .insert(issues);

      if (insertError) {
        console.error('Error inserting issues:', insertError);
      }
    }

    console.log(`Compliance audit complete. Found ${issues.length} issues.`);

    return new Response(
      JSON.stringify({
        success: true,
        issues_found: issues.length,
        summary: {
          critical: issues.filter(i => i.severity === 'critical').length,
          high: issues.filter(i => i.severity === 'high').length,
          medium: issues.filter(i => i.severity === 'medium').length,
          low: issues.filter(i => i.severity === 'low').length,
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('audit-compliance error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
