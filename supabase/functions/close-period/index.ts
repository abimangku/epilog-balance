import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

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

    const { period, auditId } = await req.json()

    if (!period) {
      return new Response(
        JSON.stringify({ error: 'Period is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      )
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Check if audit exists and has no critical issues
    if (auditId) {
      const { data: audit } = await supabase
        .from('ai_audit')
        .select('*')
        .eq('id', auditId)
        .single()

      if (audit && audit.issues) {
        const criticalIssues = (audit.issues as any[]).filter(
          (issue: any) => issue.severity === 'CRITICAL'
        )
        
        if (criticalIssues.length > 0) {
          return new Response(
            JSON.stringify({ 
              error: 'Cannot close period with critical issues',
              criticalIssues 
            }),
            { 
              status: 400, 
              headers: { 
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
              } 
            }
          )
        }
      }
    }

    // Create period snapshot
    const { data: snapshotId, error: snapshotError } = await supabase
      .rpc('create_period_snapshot', { p_period: period })

    if (snapshotError) {
      console.error('Snapshot error:', snapshotError)
      throw new Error('Failed to create period snapshot')
    }

    // Update or create period status
    const { data: existingStatus } = await supabase
      .from('period_status')
      .select('*')
      .eq('period', period)
      .maybeSingle()

    if (existingStatus) {
      await supabase
        .from('period_status')
        .update({
          status: 'CLOSED',
          closed_at: new Date().toISOString(),
          snapshot_id: snapshotId,
          ai_audit_id: auditId || null,
        })
        .eq('period', period)
    } else {
      await supabase
        .from('period_status')
        .insert({
          period,
          status: 'CLOSED',
          closed_at: new Date().toISOString(),
          snapshot_id: snapshotId,
          ai_audit_id: auditId || null,
        })
    }

    return new Response(
      JSON.stringify({
        success: true,
        period,
        snapshotId,
        message: `Period ${period} closed successfully`,
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    )
  } catch (error) {
    console.error('Period close error:', error)
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
