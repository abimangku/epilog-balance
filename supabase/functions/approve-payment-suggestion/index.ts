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
    const { messageId, conversationId, suggestionData } = await req.json();
    
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing authorization header');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) throw new Error('Unauthorized');

    // Find bill by number
    const { data: bill } = await supabase
      .from('vendor_bill')
      .select('*')
      .eq('number', suggestionData.bill_number)
      .single();

    if (!bill) {
      throw new Error(`Bill "${suggestionData.bill_number}" not found.`);
    }

    // Call create-payment edge function
    const { data: paymentData, error: paymentError } = await supabase.functions.invoke('create-payment', {
      body: {
        billId: bill.id,
        date: suggestionData.date,
        amount: suggestionData.amount,
        bankAccountCode: suggestionData.bank_account_code
      }
    });

    if (paymentError) throw paymentError;

    // Update message status
    await supabase
      .from('conversation_message')
      .update({
        metadata: {
          suggestion_type: 'payment',
          suggested_data: suggestionData,
          status: 'approved',
          created_entity_id: paymentData.payment.id,
          created_entity_type: 'vendor_payment'
        }
      })
      .eq('id', messageId);

    // Log the approval
    await supabase.from('ai_suggestion_log').insert({
      conversation_id: conversationId,
      message_id: messageId,
      suggestion_type: 'payment',
      status: 'approved',
      suggested_data: suggestionData,
      approved_data: paymentData,
      created_entity_id: paymentData.payment.id,
      created_entity_type: 'vendor_payment',
      approved_by: user.id,
      approved_at: new Date().toISOString()
    });

    // Send follow-up message
    const netPayment = suggestionData.amount - suggestionData.pph23_withheld;
    await supabase.from('conversation_message').insert({
      conversation_id: conversationId,
      role: 'assistant',
      content: `✅ Payment **${paymentData.payment.number}** created successfully!\n\n- Bill: ${suggestionData.bill_number}\n- Gross Amount: Rp ${suggestionData.amount.toLocaleString()}\n- PPh 23 Withheld: Rp ${suggestionData.pph23_withheld.toLocaleString()}\n- Net Payment: Rp ${netPayment.toLocaleString()}\n- Journal: ${paymentData.journal.number}`
    });

    return new Response(
      JSON.stringify({ success: true, payment: paymentData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('approve-payment-suggestion error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
