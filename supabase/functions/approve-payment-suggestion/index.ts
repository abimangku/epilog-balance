import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const paymentSuggestionSchema = z.object({
  bill_number: z.string().min(1).max(100),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  amount: z.number().int().positive(),
  pph23_withheld: z.number().int().min(0).optional(),
  bank_account_code: z.string().regex(/^\d-\d{5}$/)
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { messageId, conversationId, suggestionData } = body;

    // Validate input
    const validationResult = paymentSuggestionSchema.safeParse(suggestionData);
    if (!validationResult.success) {
      console.error('Validation failed:', validationResult.error);
      return new Response(
        JSON.stringify({ error: 'Invalid suggestion data', details: validationResult.error.errors }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
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
      },
      headers: {
        Authorization: authHeader
      }
    });

    if (paymentError) {
      console.error('❌ create-payment FAILED');
      console.error('Error object:', paymentError);
      
      // Try to extract detailed error from response
      let errorDetails = paymentError.message || 'Unknown error';
      
      if (paymentError.context?.bodyUsed === false) {
        try {
          const errorBody = await paymentError.context.json();
          console.error('Error body:', JSON.stringify(errorBody, null, 2));
          errorDetails = JSON.stringify(errorBody);
        } catch (e) {
          console.error('Could not parse error response');
        }
      }
      
      // Log what we sent
      console.error('Payload sent:', JSON.stringify({
        billId: bill.id,
        date: suggestionData.date,
        amount: suggestionData.amount,
        bankAccountCode: suggestionData.bank_account_code
      }, null, 2));
      
      throw new Error(`Payment creation failed: ${errorDetails}`);
    }

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
