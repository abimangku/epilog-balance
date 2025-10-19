import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const billSuggestionSchema = z.object({
  vendor_name: z.string().min(1).max(200),
  vendor_code: z.string().regex(/^[A-Z0-9-]+$/).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  category: z.enum(['COGS', 'OPEX', 'CAPEX']),
  project_name: z.string().max(200).optional(),
  faktur_pajak_number: z.string().max(50).optional(),
  total: z.number().positive().optional(),
  lines: z.array(z.object({
    description: z.string().min(1).max(500),
    expense_account_code: z.string().regex(/^\d-\d{5}$/),
    quantity: z.number().positive(),
    unit_price: z.number().positive(),
    amount: z.number().positive()
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
    const validationResult = billSuggestionSchema.safeParse(suggestionData);
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

    // Find or create vendor
    let vendor;
    const { data: existingVendor } = await supabase
      .from('vendor')
      .select('*')
      .or(`name.ilike.%${suggestionData.vendor_name}%${suggestionData.vendor_code ? `,code.eq.${suggestionData.vendor_code}` : ''}`)
      .limit(1)
      .maybeSingle();

    if (existingVendor) {
      vendor = existingVendor;
    } else {
      // Create new vendor
      const { data: newVendor, error: createError } = await supabase
        .from('vendor')
        .insert({
          name: suggestionData.vendor_name,
          code: suggestionData.vendor_code || suggestionData.vendor_name.substring(0, 10).toUpperCase().replace(/\s+/g, '-'),
          is_active: true
        })
        .select()
        .single();

      if (createError) throw createError;
      vendor = newVendor;
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
