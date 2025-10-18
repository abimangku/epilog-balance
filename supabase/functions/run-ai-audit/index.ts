import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const AUDITOR_SYSTEM_PROMPT = `You are LedgerQA, an expert Indonesian accounting auditor for Epilog Creative.

Your job: Scan journal entries for a period and identify accounting errors, compliance issues, and improvement opportunities.

KEY CHECKS:
1. **Balance Check**: All journals must balance (total DR = total CR)
2. **COGS Project Rule**: All COGS entries (5-xxxxx) MUST have project_code
3. **VAT Compliance**:
   - PPN Keluaran (2-22000) should be 11% of revenue
   - PPN Masukan (1-14000) only if Faktur Pajak exists
   - Net VAT payable = Keluaran - Masukan
4. **PPh 23 Tracking**: All PPh 23 (2-23100) should match 2% of jasa expenses
5. **Account Usage**: No direct posting to parent accounts (ending in -00000)
6. **Date Logic**: Journal date should match period
7. **Description Quality**: Avoid vague descriptions like "Expense" or "Payment"

ISSUE SEVERITY:
- CRITICAL: Unbalanced journals, COGS without project
- HIGH: VAT miscalculation, missing Faktur Pajak
- MEDIUM: Vague descriptions, PPh 23 mismatch
- LOW: Best practice suggestions

OUTPUT FORMAT (JSON):
{
  "issues": [
    {
      "severity": "CRITICAL" | "HIGH" | "MEDIUM" | "LOW",
      "category": "BALANCE" | "COGS_PROJECT" | "VAT" | "PPH23" | "DESCRIPTION" | "DATE",
      "journalNumber": "JV-2025-0001",
      "message": "Clear explanation of the issue",
      "affectedAccounts": ["1-11000", "4-40100"],
      "suggestedFix": "How to resolve this"
    }
  ],
  "summary": "Executive summary of period health in 2-3 sentences",
  "metrics": {
    "totalJournals": 45,
    "issuesFound": 3,
    "criticalIssues": 0,
    "highIssues": 1,
    "mediumIssues": 2,
    "lowIssues": 0,
    "vatNetPayable": 5500000,
    "healthScore": 95
  },
  "recommendations": [
    "Always request Faktur Pajak from PKP vendors to claim input VAT",
    "Add project codes to all COGS entries for better cost tracking"
  ]
}`

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

    const { period } = await req.json()

    if (!period) {
      return new Response(
        JSON.stringify({ error: 'Period is required (format: 2025-01)' }),
        { status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      )
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Create audit record
    const { data: audit, error: auditError } = await supabase
      .from('ai_audit')
      .insert({
        period,
        audit_type: 'PERIOD_CLOSE',
        status: 'RUNNING',
      })
      .select()
      .single()

    if (auditError) throw auditError

    // Get all journals for the period
    const { data: journals, error: journalsError } = await supabase
      .from('journal')
      .select(`
        *,
        lines:journal_line(*)
      `)
      .eq('period', period)
      .eq('status', 'POSTED')
      .order('date')

    if (journalsError) throw journalsError

    // Get VAT position
    const { data: vatPosition } = await supabase
      .rpc('calculate_vat_position', { p_period: period })

    // Prepare data for AI
    const auditContext = {
      period,
      totalJournals: journals?.length || 0,
      journals: journals?.map(j => ({
        number: j.number,
        date: j.date,
        description: j.description,
        lines: (j.lines as any[])?.map((l: any) => ({
          account: l.account_code,
          description: l.description,
          debit: l.debit,
          credit: l.credit,
          project: l.project_code,
        })),
        totalDebit: (j.lines as any[])?.reduce((sum: number, l: any) => sum + Number(l.debit), 0),
        totalCredit: (j.lines as any[])?.reduce((sum: number, l: any) => sum + Number(l.credit), 0),
      })),
      vatPosition: vatPosition?.[0] || { ppn_keluaran: 0, ppn_masukan: 0, net_payable: 0 },
    }

    // Call Lovable AI
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: AUDITOR_SYSTEM_PROMPT },
          { 
            role: 'user', 
            content: `Audit this period's journals:\n\n${JSON.stringify(auditContext, null, 2)}\n\nRespond ONLY with valid JSON.`
          },
        ],
        response_format: { type: 'json_object' },
      }),
    })

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text()
      console.error('Lovable AI error:', aiResponse.status, errorText)
      throw new Error(`AI API error: ${aiResponse.statusText}`)
    }

    const aiData = await aiResponse.json()
    const auditResult = JSON.parse(aiData.choices[0].message.content)

    // Update audit record with results
    const { error: updateError } = await supabase
      .from('ai_audit')
      .update({
        status: 'COMPLETED',
        issues: auditResult.issues,
        summary: auditResult.summary,
        metrics: auditResult.metrics,
        recommendations: auditResult.recommendations,
        completed_at: new Date().toISOString(),
      })
      .eq('id', audit.id)

    if (updateError) throw updateError

    return new Response(
      JSON.stringify({
        success: true,
        auditId: audit.id,
        result: auditResult,
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    )
  } catch (error) {
    console.error('AI audit error:', error)
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
