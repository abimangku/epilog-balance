import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// Validation schema
const createPaymentSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  billId: z.string().uuid(),
  amount: z.number().int().positive().max(999999999999),
  bankAccountCode: z.string().regex(/^\d-\d{5}$/),
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

    // Get authenticated user
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      )
    }

    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      global: { headers: { Authorization: authHeader } }
    })

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      )
    }

    // Parse and validate input
    const body = await req.json()
    const validationResult = createPaymentSchema.safeParse(body)
    
    if (!validationResult.success) {
      return new Response(
        JSON.stringify({ error: 'Invalid input', details: validationResult.error.issues }),
        { status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      )
    }

    const input = validationResult.data

    const supabase = supabaseClient

    // Get bill and vendor
    const { data: bill, error: billError } = await supabase
      .from('vendor_bill')
      .select(`
        *,
        vendor:vendor_id(*)
      `)
      .eq('id', input.billId)
      .single()

    if (billError || !bill) {
      throw new Error('Bill not found')
    }

    const vendor = bill.vendor as any

    // Calculate PPh 23 withholding
    const pph23 = vendor.subject_to_pph23
      ? Math.round(Number(bill.subtotal) * vendor.pph23_rate)
      : 0

    // Get payment number
    const { data: paymentNumber } = await supabase.rpc('get_next_payment_number')
    
    // Get journal number
    const { data: journalNumber } = await supabase.rpc('get_next_journal_number')

    const period = new Date(input.date).toISOString().slice(0, 7)

    // Create payment
    const { data: payment, error: paymentError } = await supabase
      .from('vendor_payment')
      .insert({
        number: paymentNumber,
        date: input.date,
        bill_id: input.billId,
        vendor_id: bill.vendor_id,
        amount: input.amount,
        pph23_withheld: pph23,
        bank_account_code: input.bankAccountCode,
        description: `Payment for ${bill.number}`,
        created_by: user.id,
      })
      .select()
      .single()

    if (paymentError) throw paymentError

    // Create journal entry
    const { data: journal, error: journalError } = await supabase
      .from('journal')
      .insert({
        number: journalNumber,
        date: input.date,
        description: `Vendor Payment ${paymentNumber} - ${bill.number}`,
        source_doc_type: 'VendorPayment',
        source_doc_id: payment.id,
        period,
        status: 'POSTED',
      })
      .select()
      .single()

    if (journalError) throw journalError

    const journalLines = [
      // DR Utang Usaha
      {
        journal_id: journal.id,
        account_code: '2-20100',
        debit: input.amount + pph23,
        credit: 0,
        description: `Payment ${paymentNumber}`,
        sort_order: 0,
      },
      // CR Bank
      {
        journal_id: journal.id,
        account_code: input.bankAccountCode,
        debit: 0,
        credit: input.amount,
        description: `Payment to ${vendor.name}`,
        sort_order: 1,
      },
    ]

    // CR PPh 23 if withheld
    if (pph23 > 0) {
      journalLines.push({
        journal_id: journal.id,
        account_code: '2-23100',
        debit: 0,
        credit: pph23,
        description: `PPh 23 withheld (${(vendor.pph23_rate * 100).toFixed(0)}%)`,
        sort_order: 2,
      })
    }

    const { error: journalLinesError } = await supabase
      .from('journal_line')
      .insert(journalLines)

    if (journalLinesError) throw journalLinesError

    // Link journal to payment
    await supabase
      .from('vendor_payment')
      .update({ journal_id: journal.id })
      .eq('id', payment.id)

    // Update bill status (trigger handles this, but call function to return status)
    const { data: updatedStatusData } = await supabase
      .rpc('update_bill_status', { bill_uuid: input.billId })

    return new Response(
      JSON.stringify({
        success: true,
        payment,
        journal,
        pph23Withheld: pph23,
        newBillStatus: updatedStatusData,
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    )
  } catch (error) {
    console.error('Create payment error:', error)
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
