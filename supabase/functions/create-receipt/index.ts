import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// Validation schema
const createReceiptSchema = z.object({
  invoiceId: z.string().uuid(),
  clientId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  amount: z.number().int().positive().max(999999999999),
  bankAccountCode: z.string().regex(/^\d-\d{5}$/),
  description: z.string().max(1000).optional(),
  pph23Withheld: z.number().int().min(0).max(999999999999).optional(),
})

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get authenticated user
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      global: { headers: { Authorization: authHeader } }
    })

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse and validate input
    const body = await req.json()
    const validationResult = createReceiptSchema.safeParse(body)
    
    if (!validationResult.success) {
      return new Response(
        JSON.stringify({ error: 'Invalid input', details: validationResult.error.issues }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { invoiceId, clientId, date, amount, pph23Withheld, bankAccountCode, description } = validationResult.data

    const supabase = supabaseClient

    // Get invoice details
    const { data: invoice, error: invoiceError } = await supabase
      .from('sales_invoice')
      .select('*, client:client_id(*)')
      .eq('id', invoiceId)
      .single()

    if (invoiceError || !invoice) throw new Error('Invoice not found')

    // Get next receipt number
    const { data: receiptNumber } = await supabase.rpc('get_next_receipt_number')

    // Create receipt
    const { data: receipt, error: receiptError } = await supabase
      .from('cash_receipt')
      .insert({
        number: receiptNumber,
        date,
        invoice_id: invoiceId,
        client_id: invoice.client_id,
        amount,
        pph23_withheld: pph23Withheld || 0,
        bank_account_code: bankAccountCode,
        description: description || `Payment for ${invoice.number}`,
        created_by: user.id,
      })
      .select()
      .single()

    if (receiptError) throw receiptError

    // Create journal entry
    const { data: journalNumber } = await supabase.rpc('get_next_journal_number')
    const period = new Date(date).toISOString().slice(0, 7)

    const { data: journal, error: journalError } = await supabase
      .from('journal')
      .insert({
        number: journalNumber,
        date,
        description: `Receipt ${receiptNumber} - ${invoice.number}`,
        period,
        status: 'POSTED',
        source_doc_type: 'cash_receipt',
        source_doc_id: receipt.id,
      })
      .select()
      .single()

    if (journalError) throw journalError

    // Create journal lines
    const journalLines = [
      {
        journal_id: journal.id,
        account_code: bankAccountCode,
        debit: amount - (pph23Withheld || 0),
        credit: 0,
        description: `Receipt ${receiptNumber}`,
        sort_order: 0,
      },
      ...(pph23Withheld && pph23Withheld > 0 ? [{
        journal_id: journal.id,
        account_code: '1-14500', // PPh Dipotong oleh Klien
        debit: pph23Withheld,
        credit: 0,
        description: 'PPh 23 Withheld',
        sort_order: 1,
      }] : []),
      {
        journal_id: journal.id,
        account_code: '1-11000', // Piutang Usaha
        debit: 0,
        credit: amount,
        description: `Payment for ${invoice.number}`,
        sort_order: pph23Withheld && pph23Withheld > 0 ? 2 : 1,
      },
    ]

    const { error: journalLinesError } = await supabase
      .from('journal_line')
      .insert(journalLines)

    if (journalLinesError) throw journalLinesError

    // Link journal to receipt
    await supabase
      .from('cash_receipt')
      .update({ journal_id: journal.id })
      .eq('id', receipt.id)

    return new Response(
      JSON.stringify({ success: true, receipt, journal }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Create receipt error:', error)
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
