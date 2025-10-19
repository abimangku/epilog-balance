import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// Validation schemas
const invoiceLineSchema = z.object({
  description: z.string().min(1).max(500),
  quantity: z.number().positive().max(1000000),
  unitPrice: z.number().min(0).max(999999999999),
  amount: z.number().min(0).max(999999999999),
  revenueAccountCode: z.string().regex(/^\d-\d{5}$/),
  projectId: z.string().uuid().nullable().optional(),
})

const createInvoiceSchema = z.object({
  clientId: z.string().uuid(),
  projectId: z.string().uuid().nullable().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  description: z.string().max(1000).optional(),
  lines: z.array(invoiceLineSchema).min(1).max(100),
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
    const validationResult = createInvoiceSchema.safeParse(body)
    
    if (!validationResult.success) {
      console.error('❌ INVOICE VALIDATION FAILED');
      console.error('Errors:', JSON.stringify(validationResult.error.issues, null, 2));
      console.error('Received body:', JSON.stringify(body, null, 2));
      return new Response(
        JSON.stringify({ 
          error: 'Invalid input', 
          details: validationResult.error.issues,
          received: body
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { clientId, projectId, date, dueDate, description, lines } = validationResult.data

    const supabase = supabaseClient

    // Calculate totals
    const subtotal = lines.reduce((sum: number, line: any) => sum + line.amount, 0)
    const vatAmount = Math.round(subtotal * 0.11)
    const total = subtotal + vatAmount

    // Get next invoice number
    const { data: invoiceNumber } = await supabase.rpc('get_next_invoice_number')

    // Create invoice
    const { data: invoice, error: invoiceError } = await supabase
      .from('sales_invoice')
      .insert({
        number: invoiceNumber,
        date,
        due_date: dueDate,
        client_id: clientId,
        project_id: projectId || null,
        subtotal,
        vat_amount: vatAmount,
        total,
        description,
        status: 'DRAFT',
        created_by: user.id,
      })
      .select()
      .single()

    if (invoiceError) throw invoiceError

    // Create invoice lines
    const invoiceLines = lines.map((line: any, idx: number) => ({
      invoice_id: invoice.id,
      description: line.description,
      quantity: line.quantity || 1,
      unit_price: line.unitPrice,
      amount: line.amount,
      revenue_account_code: line.revenueAccountCode,
      project_id: line.projectId || projectId || null,
      sort_order: idx,
    }))

    const { error: linesError } = await supabase
      .from('invoice_line')
      .insert(invoiceLines)

    if (linesError) throw linesError

    // Create journal entry
    const { data: journalNumber } = await supabase.rpc('get_next_journal_number')
    const period = new Date(date).toISOString().slice(0, 7)

    const { data: journal, error: journalError } = await supabase
      .from('journal')
      .insert({
        number: journalNumber,
        date,
        description: `Invoice ${invoiceNumber} - ${description}`,
        period,
        status: 'POSTED',
        source_doc_type: 'sales_invoice',
        source_doc_id: invoice.id,
      })
      .select()
      .single()

    if (journalError) throw journalError

    // Create journal lines
    const journalLines = [
      {
        journal_id: journal.id,
        account_code: '1-11000', // Piutang Usaha
        debit: total,
        credit: 0,
        description: `Invoice ${invoiceNumber}`,
        sort_order: 0,
      },
      ...lines.map((line: any, idx: number) => ({
        journal_id: journal.id,
        account_code: line.revenueAccountCode,
        debit: 0,
        credit: line.amount,
        description: line.description,
        sort_order: idx + 1,
      })),
      {
        journal_id: journal.id,
        account_code: '2-22000', // PPN Keluaran
        debit: 0,
        credit: vatAmount,
        description: 'PPN 11%',
        sort_order: lines.length + 1,
      },
    ]

    const { error: journalLinesError } = await supabase
      .from('journal_line')
      .insert(journalLines)

    if (journalLinesError) throw journalLinesError

    // Link journal to invoice
    await supabase
      .from('sales_invoice')
      .update({ journal_id: journal.id })
      .eq('id', invoice.id)

    return new Response(
      JSON.stringify({ success: true, invoice, journal }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Create invoice error:', error)
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
