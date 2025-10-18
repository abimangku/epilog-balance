import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const CLASSIFIER_SYSTEM_PROMPT = `You are an expert Indonesian accounting AI for Epilog Creative, a digital creative agency.

Your job: classify transaction descriptions into the correct Chart of Accounts following PSAK standards and Epilog's "Truth Method."

KEY RULES:
1. VAT (PPN) always separate - NEVER include in expense/revenue accounts
2. COGS (5-xxxxx) = ONLY direct billable costs per project
3. OPEX (6-xxxxx) = all overhead (salaries, rent, software, utilities)
4. Loans/advances = balance sheet (1-17xxx), NOT expense
5. Always provide confidence score (0-1)

EPILOG-SPECIFIC PATTERNS (high confidence):
- "Meta Ads", "TikTok Ads", "Facebook Ads" → 5-50100 (COGS - Media Placement)
- "Shooting", "Production", "Talent", "Studio" → 5-50300 (COGS - Production)
- "Sprout", "Adobe", "Canva", "Figma" (for client work) → 5-50200 (COGS - Tools)
- "Gaji", "Salary", "Payroll", "THR" → 6-60100 (Gaji & Tunjangan)
- "BPJS" → 6-60110 (BPJS & Asuransi)
- "Transfer Fee", "Admin Bank" → 6-60800 (Biaya Bank)
- "Wifi", "Internet", "Listrik", "Sewa Kantor" → 6-60200 (Sewa & Utilitas)
- "Oemah Etnik", "Pinjaman" → 1-17010 (Loan Receivable)

COGS DISQUALIFIERS (if description contains these → NOT COGS):
"gaji", "bpjs", "asuransi", "operasional", "atk", "makanan", "transport", "wifi", "sewa", "listrik", "biaya kantor", "office"

VAT HANDLING:
- Input VAT (purchases): always DR 1-14000 (PPN Masukan) if vendor has Faktur Pajak
- Output VAT (sales): always CR 2-22000 (PPN Keluaran)
- Standard rate: 11%

OUTPUT FORMAT (JSON):
{
  "type": "vendor_bill" | "sales_invoice" | "cash_receipt" | "journal_entry",
  "vendor": "extracted vendor name or null",
  "client": "extracted client name or null",
  "project": "extracted project code (BSI, AVICENNA, etc) or null",
  "amount": number (base amount excluding VAT),
  "vatAmount": number (11% if applicable),
  "accounts": [
    {"code": "x-xxxxx", "name": "Account Name", "debit": number, "credit": number}
  ],
  "confidence": 0.0-1.0,
  "reasoning": "why you classified this way",
  "requiresInput": ["field1", "field2"] // if human input needed
}`

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
    const { description, amount, context } = await req.json()

    if (!description || !amount) {
      return new Response(
        JSON.stringify({ error: 'Description and amount are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Call Lovable AI Gateway (Gemini)
    const userPrompt = `Classify this transaction:

Description: "${description}"
Amount: IDR ${amount.toLocaleString()}
${context ? `Context: ${context}` : ''}

Respond ONLY with valid JSON matching the schema. No markdown, no extra text.`

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        temperature: 0.2,
        messages: [
          { role: 'system', content: CLASSIFIER_SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
      }),
    })

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI usage limit reached. Please add credits to your workspace.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      const errorText = await aiResponse.text()
      console.error('AI gateway error:', aiResponse.status, errorText)
      throw new Error(`AI gateway error: ${aiResponse.statusText}`)
    }

    const aiData = await aiResponse.json()
    const rawContent = aiData.choices[0].message.content
    
    // Parse JSON from response (handle markdown code blocks if present)
    let suggestion
    try {
      const jsonMatch = rawContent.match(/```json\n([\s\S]*?)\n```/) || rawContent.match(/```\n([\s\S]*?)\n```/)
      const jsonStr = jsonMatch ? jsonMatch[1] : rawContent
      suggestion = JSON.parse(jsonStr.trim())
    } catch (e) {
      console.error('Failed to parse AI response:', rawContent)
      throw new Error('AI returned invalid JSON response')
    }

    // Store in database
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Create tx_input
    const { data: txInput, error: txError } = await supabase
      .from('tx_input')
      .insert({
        date: new Date().toISOString().split('T')[0],
        description,
        amount,
        vendor: suggestion.vendor,
        category: suggestion.type,
        project_code: suggestion.project,
        status: 'CLASSIFIED',
      })
      .select()
      .single()

    if (txError) throw txError

    // Create ai_suggestion
    const { data: aiSuggestion, error: suggestionError } = await supabase
      .from('tx_ai_suggestion')
      .insert({
        tx_input_id: txInput.id,
        suggested_type: suggestion.type,
        suggested_vendor: suggestion.vendor,
        suggested_project: suggestion.project,
        suggested_accounts: suggestion.accounts,
        confidence: suggestion.confidence,
        reasoning: suggestion.reasoning,
        status: 'PENDING',
      })
      .select()
      .single()

    if (suggestionError) throw suggestionError

    // Update tx_input with suggestion link
    await supabase
      .from('tx_input')
      .update({ ai_suggestion_id: aiSuggestion.id })
      .eq('id', txInput.id)

    return new Response(
      JSON.stringify({
        success: true,
        txInputId: txInput.id,
        suggestion,
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    )
  } catch (error) {
    console.error('Classification error:', error)
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
