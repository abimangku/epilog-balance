import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { suggestionId } = await req.json()

    if (!suggestionId) {
      return new Response(
        JSON.stringify({ error: 'suggestionId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Get the AI suggestion with tx_input
    const { data: suggestion, error: suggestionError } = await supabase
      .from('tx_ai_suggestion')
      .select(`
        *,
        tx_input:tx_input_id (*)
      `)
      .eq('id', suggestionId)
      .single()

    if (suggestionError || !suggestion) {
      throw new Error('Suggestion not found')
    }

    const txInput = suggestion.tx_input

    // Generate journal number
    const { data: journalNumberResult } = await supabase
      .rpc('get_next_journal_number')

    const journalNumber = journalNumberResult || 'JV-2025-0001'

    const period = new Date(txInput.date).toISOString().slice(0, 7)

    // Create journal
    const { data: journal, error: journalError } = await supabase
      .from('journal')
      .insert({
        number: journalNumber,
        date: txInput.date,
        description: txInput.description,
        period,
        status: 'POSTED',
        source_doc_type: 'tx_input',
        source_doc_id: txInput.id,
      })
      .select()
      .single()

    if (journalError) throw journalError

    // Create journal lines
    const accounts = suggestion.suggested_accounts as Array<{
      code: string
      debit: number
      credit: number
    }>

    const lines = accounts.map((acc, idx) => ({
      journal_id: journal.id,
      account_code: acc.code,
      debit: acc.debit,
      credit: acc.credit,
      description: txInput.description,
      project_code: suggestion.suggested_project,
      sort_order: idx,
    }))

    const { error: linesError } = await supabase
      .from('journal_line')
      .insert(lines)

    if (linesError) throw linesError

    // Update suggestion status
    await supabase
      .from('tx_ai_suggestion')
      .update({
        status: 'ACCEPTED',
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', suggestionId)

    // Update tx_input status
    await supabase
      .from('tx_input')
      .update({
        status: 'APPROVED',
        processed_at: new Date().toISOString(),
      })
      .eq('id', txInput.id)

    return new Response(
      JSON.stringify({
        success: true,
        journal,
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    )
  } catch (error) {
    console.error('Accept suggestion error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    )
  }
})
