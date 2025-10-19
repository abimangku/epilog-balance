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

    // Find vendor by name
    const { data: vendor } = await supabase
      .from('vendor')
      .select('*')
      .or(`name.ilike.%${suggestionData.vendor_name}%,code.eq.${suggestionData.vendor_code}`)
      .limit(1)
      .single();

    if (!vendor) {
      throw new Error(`Vendor "${suggestionData.vendor_name}" not found. Please create the vendor first.`);
    }

    // Find project if specified
    let projectId = null;
    if (suggestionData.project_name) {
      const { data: project } = await supabase
        .from('project')
        .select('id')
        .ilike('name', `%${suggestionData.project_name}%`)
        .limit(1)
        .single();
      
      projectId = project?.id;
    }

    // Call create-bill edge function
    const { data: billData, error: billError } = await supabase.functions.invoke('create-bill', {
      body: {
        vendorId: vendor.id,
        date: suggestionData.date,
        dueDate: suggestionData.due_date || suggestionData.date,
        category: suggestionData.category,
        projectId,
        fakturPajakNumber: suggestionData.faktur_pajak_number,
        lines: suggestionData.lines.map((line: any) => ({
          description: line.description,
          expenseAccountCode: line.expense_account_code,
          quantity: line.quantity || 1,
          unitPrice: line.unit_price,
          amount: line.amount
        }))
      }
    });

    if (billError) throw billError;

    // Update message status
    await supabase
      .from('conversation_message')
      .update({
        metadata: {
          suggestion_type: 'bill',
          suggested_data: suggestionData,
          status: 'approved',
          created_entity_id: billData.bill.id,
          created_entity_type: 'vendor_bill'
        }
      })
      .eq('id', messageId);

    // Log the approval
    await supabase.from('ai_suggestion_log').insert({
      conversation_id: conversationId,
      message_id: messageId,
      suggestion_type: 'bill',
      status: 'approved',
      suggested_data: suggestionData,
      approved_data: billData,
      created_entity_id: billData.bill.id,
      created_entity_type: 'vendor_bill',
      approved_by: user.id,
      approved_at: new Date().toISOString()
    });

    // Send follow-up message
    await supabase.from('conversation_message').insert({
      conversation_id: conversationId,
      role: 'assistant',
      content: `✅ Bill **${billData.bill.number}** created successfully!\n\n- Vendor: ${vendor.name}\n- Total: Rp ${suggestionData.total.toLocaleString()}\n- Journal: ${billData.journal.number}`
    });

    return new Response(
      JSON.stringify({ success: true, bill: billData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('approve-bill-suggestion error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
