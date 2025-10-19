import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const invoiceSuggestionSchema = z.object({
  client_name: z.string().min(1).max(200),
  client_code: z.string().regex(/^[A-Z0-9-]+$/).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  project_name: z.string().max(200).optional(),
  faktur_pajak_number: z.string().max(50).optional(),
  total: z.number().positive().optional(),
  lines: z.array(z.object({
    description: z.string().min(1).max(500),
    revenue_account_code: z.string().regex(/^\d-\d{5}$/),
    quantity: z.number().positive(),
    unit_price: z.number().positive(),
    amount: z.number().positive(),
    project_id: z.string().uuid().optional()
  })).min(1).max(100)
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
    const validationResult = invoiceSuggestionSchema.safeParse(suggestionData);
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

    // Find client - DO NOT auto-create
    const { data: client } = await supabase
      .from('client')
      .select('*')
      .or(`name.ilike.%${suggestionData.client_name}%${suggestionData.client_code ? `,code.eq.${suggestionData.client_code}` : ''}`)
      .limit(1)
      .maybeSingle();

    if (!client) {
      console.log('Client not found:', suggestionData.client_name);
      return new Response(
        JSON.stringify({ 
          error: 'missing_client',
          client_name: suggestionData.client_name,
          client_code: suggestionData.client_code,
          message: `Client "${suggestionData.client_name}" not found. Please create it first.`
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
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

    // Call create-invoice edge function
    const { data: invoiceData, error: invoiceError } = await supabase.functions.invoke('create-invoice', {
      body: {
        clientId: client.id,
        date: suggestionData.date,
        dueDate: suggestionData.due_date || suggestionData.date,
        projectId,
        fakturPajakNumber: suggestionData.faktur_pajak_number,
        lines: suggestionData.lines.map((line: any) => ({
          description: line.description,
          revenueAccountCode: line.revenue_account_code,
          quantity: line.quantity || 1,
          unitPrice: line.unit_price,
          amount: line.amount,
          projectId: line.project_id || projectId
        }))
      },
      headers: {
        Authorization: authHeader
      }
    });

    if (invoiceError) throw invoiceError;

    // Update message status
    await supabase
      .from('conversation_message')
      .update({
        metadata: {
          suggestion_type: 'invoice',
          suggested_data: suggestionData,
          status: 'approved',
          created_entity_id: invoiceData.invoice.id,
          created_entity_type: 'sales_invoice'
        }
      })
      .eq('id', messageId);

    // Log the approval
    await supabase.from('ai_suggestion_log').insert({
      conversation_id: conversationId,
      message_id: messageId,
      suggestion_type: 'invoice',
      status: 'approved',
      suggested_data: suggestionData,
      approved_data: invoiceData,
      created_entity_id: invoiceData.invoice.id,
      created_entity_type: 'sales_invoice',
      approved_by: user.id,
      approved_at: new Date().toISOString()
    });

    // Send follow-up message
    await supabase.from('conversation_message').insert({
      conversation_id: conversationId,
      role: 'assistant',
      content: `✅ Invoice **${invoiceData.invoice.number}** created successfully!\n\n- Client: ${client.name}\n- Total: Rp ${suggestionData.total.toLocaleString()}\n- Journal: ${invoiceData.journal.number}`
    });

    return new Response(
      JSON.stringify({ success: true, invoice: invoiceData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('approve-invoice-suggestion error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
