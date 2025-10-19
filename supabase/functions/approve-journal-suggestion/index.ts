import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const journalSuggestionSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  period: z.string().regex(/^\d{4}-\d{2}$/),
  description: z.string().min(1).max(1000),
  lines: z.array(z.object({
    account_code: z.string().regex(/^\d-\d{5}$/),
    description: z.string().max(500).optional(),
    debit: z.number().int().min(0),
    credit: z.number().int().min(0),
    project_code: z.string().regex(/^[A-Z0-9-]+$/).optional()
  })).min(2).max(100)
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
    const validationResult = journalSuggestionSchema.safeParse(suggestionData);
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

    // Get next journal number
    const { data: nextNum } = await supabase.rpc('get_next_journal_number');

    // Validate journal is balanced
    const totalDebit = suggestionData.lines.reduce((sum: number, line: any) => sum + (line.debit || 0), 0);
    const totalCredit = suggestionData.lines.reduce((sum: number, line: any) => sum + (line.credit || 0), 0);
    
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      throw new Error(
        `Journal is not balanced. Debit: ${totalDebit}, Credit: ${totalCredit}, Difference: ${Math.abs(totalDebit - totalCredit)}`
      );
    }

    // Validate account codes exist
    for (const line of suggestionData.lines) {
      const { data: account, error: accountError } = await supabase
        .from('account')
        .select('code')
        .eq('code', line.account_code)
        .single();
      
      if (accountError || !account) {
        throw new Error(`Invalid account code: ${line.account_code}. Please use valid account codes from the chart of accounts.`);
      }
    }

    // Create journal entry
    const { data: journal, error: journalError } = await supabase
      .from('journal')
      .insert({
        number: nextNum,
        date: suggestionData.date,
        period: suggestionData.period,
        description: suggestionData.description,
        status: 'DRAFT',
        created_by: user.id
      })
      .select()
      .single();

    if (journalError) throw journalError;

    // Create journal lines
    const journalLines = suggestionData.lines.map((line: any, index: number) => ({
      journal_id: journal.id,
      account_code: line.account_code,
      description: line.description,
      debit: line.debit,
      credit: line.credit,
      project_code: line.project_code,
      sort_order: index
    }));

    const { error: linesError } = await supabase
      .from('journal_line')
      .insert(journalLines);

    if (linesError) throw linesError;

    // Update message status
    await supabase
      .from('conversation_message')
      .update({
        metadata: {
          suggestion_type: 'journal',
          suggested_data: suggestionData,
          status: 'approved',
          created_entity_id: journal.id,
          created_entity_type: 'journal'
        }
      })
      .eq('id', messageId);

    // Log the approval
    await supabase.from('ai_suggestion_log').insert({
      conversation_id: conversationId,
      message_id: messageId,
      suggestion_type: 'journal',
      status: 'approved',
      suggested_data: suggestionData,
      approved_data: { journal, lines: journalLines },
      created_entity_id: journal.id,
      created_entity_type: 'journal',
      approved_by: user.id,
      approved_at: new Date().toISOString()
    });

    // Send follow-up message
    await supabase.from('conversation_message').insert({
      conversation_id: conversationId,
      role: 'assistant',
      content: `✅ Journal Entry **${journal.number}** created successfully!\n\n- Date: ${journal.date}\n- Period: ${journal.period}\n- Total Debit/Credit: Rp ${totalDebit.toLocaleString()}\n\nThe journal is in DRAFT status. You can review and post it from the Journal List.`
    });

    return new Response(
      JSON.stringify({ success: true, journal }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('approve-journal-suggestion error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
