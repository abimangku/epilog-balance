import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// Validation schemas
const billLineSchema = z.object({
  description: z.string().min(1).max(500),
  quantity: z.number().positive().max(1000000),
  unitPrice: z.number().int().min(0).max(999999999999),
  expenseAccountCode: z.string().regex(/^\d-\d{5}$/),
  projectCode: z.string().max(50).optional(),
})

const createBillSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  vendorId: z.string().uuid(),
  projectId: z.string().uuid().optional(),
  vendorInvoiceNumber: z.string().max(100).optional(),
  fakturPajakNumber: z.string().max(100).optional(),
  category: z.enum(['COGS', 'OPEX']),
  lines: z.array(billLineSchema).min(1).max(100),
})

serve(async (req) => {
  try {
    if (req.method === 'OPTIONS') {
      return new Response('ok', {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST',
          'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        },
      })
    }

    // Get auth token and validate user
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      global: { headers: { Authorization: authHeader } }
    })

    const { data: { user }, error: userError } = await supabase.auth.getUser(token)
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      )
    }

    // Parse and validate input
    const body = await req.json()
    const validationResult = createBillSchema.safeParse(body)
    
    if (!validationResult.success) {
      return new Response(
        JSON.stringify({ error: 'Invalid input', details: validationResult.error.issues }),
        { status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      )
    }

    const input = validationResult.data

    // Get vendor details
    const { data: vendor, error: vendorError } = await supabase
      .from('vendor')
      .select('*')
      .eq('id', input.vendorId)
      .single()

    if (vendorError || !vendor) {
      throw new Error('Vendor not found')
    }

    // Calculate totals
    const subtotal = input.lines.reduce(
      (sum, line) => sum + line.quantity * line.unitPrice,
      0
    )

    // Input VAT only if vendor provides Faktur Pajak
    const vatAmount = vendor.provides_faktur_pajak && input.fakturPajakNumber
      ? Math.round(subtotal * 0.11)
      : 0

    const total = subtotal + vatAmount

    // Get bill number
    const { data: billNumber } = await supabase.rpc('get_next_bill_number')
    
    // Get journal number
    const { data: journalNumber } = await supabase.rpc('get_next_journal_number')

    // Calculate due date
    const billDate = new Date(input.date)
    const dueDate = new Date(billDate)
    dueDate.setDate(dueDate.getDate() + (vendor.payment_terms || 30))

    const period = billDate.toISOString().slice(0, 7)

    // Validate COGS must have project
    if (input.category === 'COGS' && !input.projectId) {
      return new Response(
        JSON.stringify({ error: 'COGS bills must have a project' }),
        { status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      )
    }

    // Create bill
    const { data: bill, error: billError } = await supabase
      .from('vendor_bill')
      .insert({
        number: billNumber,
        vendor_invoice_number: input.vendorInvoiceNumber || null,
        date: input.date,
        due_date: dueDate.toISOString().split('T')[0],
        vendor_id: input.vendorId,
        project_id: input.projectId || null,
        subtotal,
        vat_amount: vatAmount,
        total,
        faktur_pajak_number: input.fakturPajakNumber || null,
        description: input.lines.map(l => l.description).join('; '),
        category: input.category,
        status: 'APPROVED',
        created_by: user.id,
      })
      .select()
      .single()

    if (billError) throw billError

    // Create bill lines
    const lines = input.lines.map((line, idx) => ({
      bill_id: bill.id,
      description: line.description,
      quantity: line.quantity,
      unit_price: line.unitPrice,
      amount: line.quantity * line.unitPrice,
      expense_account_code: line.expenseAccountCode,
      project_code: line.projectCode || null,
      sort_order: idx,
    }))

    const { error: linesError } = await supabase
      .from('bill_line')
      .insert(lines)

    if (linesError) throw linesError

    // Create journal entry
    const { data: journal, error: journalError } = await supabase
      .from('journal')
      .insert({
        number: journalNumber,
        date: input.date,
        description: `Vendor Bill ${billNumber} - ${vendor.name}`,
        source_doc_type: 'VendorBill',
        source_doc_id: bill.id,
        period,
        status: 'POSTED',
      })
      .select()
      .single()

    if (journalError) throw journalError

    // Build journal lines
    const journalLines = []

    // DR Expense lines
    input.lines.forEach((line, idx) => {
      journalLines.push({
        journal_id: journal.id,
        account_code: line.expenseAccountCode,
        debit: line.quantity * line.unitPrice,
        credit: 0,
        description: line.description,
        project_code: line.projectCode || null,
        sort_order: idx,
      })
    })

    // DR PPN Masukan if applicable
    if (vatAmount > 0) {
      journalLines.push({
        journal_id: journal.id,
        account_code: '1-14000',
        debit: vatAmount,
        credit: 0,
        description: `PPN Masukan - ${input.fakturPajakNumber}`,
        sort_order: input.lines.length,
      })
    }

    // CR Utang Usaha
    journalLines.push({
      journal_id: journal.id,
      account_code: '2-20100',
      debit: 0,
      credit: total,
      description: `Bill ${billNumber} - ${vendor.name}`,
      sort_order: input.lines.length + (vatAmount > 0 ? 1 : 0),
    })

    const { error: journalLinesError } = await supabase
      .from('journal_line')
      .insert(journalLines)

    if (journalLinesError) throw journalLinesError

    // Link journal to bill
    await supabase
      .from('vendor_bill')
      .update({ journal_id: journal.id })
      .eq('id', bill.id)

    return new Response(
      JSON.stringify({
        success: true,
        bill,
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
    console.error('Create bill error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: message }),
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
