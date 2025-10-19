import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'

// =============================================
// JOURNAL LIST & DETAIL
// =============================================

export function useJournals(filters?: {
  period?: string
  status?: string
  searchTerm?: string
}) {
  return useQuery({
    queryKey: ['journals', filters],
    queryFn: async () => {
      let query = supabase
        .from('journal')
        .select(`
          id,
          number,
          date,
          description,
          status,
          period,
          voided_at:voided_at,
          reversed_by,
          is_reversal,
          lines:journal_line(id, debit, credit)
        `)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })

      if (filters?.period) {
        query = query.eq('period', filters.period)
      }

      if (filters?.status) {
        query = query.eq('status', filters.status as any)
      }

      if (filters?.searchTerm) {
        query = query.or(`number.ilike.%${filters.searchTerm}%,description.ilike.%${filters.searchTerm}%`)
      }

      const { data, error } = await query

      if (error) throw error
      
      // Calculate totals and line count for each journal
      return (data as any[]).map(journal => {
        const lines = journal.lines || []
        return {
          ...journal,
          line_count: lines.length,
          total_debit: lines.reduce((sum: number, line: any) => sum + (Number(line.debit) || 0), 0),
          total_credit: lines.reduce((sum: number, line: any) => sum + (Number(line.credit) || 0), 0),
        }
      })
    },
  })
}

export function useJournal(id: string) {
  return useQuery({
    queryKey: ['journal', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('journal')
        .select(`
          *,
          lines:journal_line(*)
        `)
        .eq('id', id)
        .single()

      if (error) throw error
      return data
    },
    enabled: !!id,
  })
}

export function useVoidJournal() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ journalId, reason }: { journalId: string; reason: string }) => {
      // Get original journal
      const { data: original } = await supabase
        .from('journal')
        .select('*, lines:journal_line(*)')
        .eq('id', journalId)
        .single()

      if (!original) throw new Error('Journal not found')

      // Get next journal number
      const { data: reversalNumber } = await supabase
        .rpc('get_next_number' as any, { p_entity_type: 'journal' })

      // Create reversing journal
      const { data: reversal, error: reversalError } = await supabase
        .from('journal')
        .insert({
          number: reversalNumber as any,
          date: new Date().toISOString().split('T')[0],
          description: `VOID: ${original.description}`,
          period: new Date().toISOString().slice(0, 7),
          status: 'POSTED',
          is_reversal: true,
          reverses: journalId,
        })
        .select()
        .single()

      if (reversalError) throw reversalError

      // Create reversing lines (swap debit/credit)
      const reversingLines = original.lines.map((line: any, idx: number) => ({
        journal_id: reversal.id,
        account_code: line.account_code,
        debit: line.credit, // Swap!
        credit: line.debit, // Swap!
        description: line.description,
        project_code: line.project_code,
        sort_order: idx,
      }))

      const { error: linesError } = await supabase
        .from('journal_line')
        .insert(reversingLines)

      if (linesError) throw linesError

      // Mark original as voided
      const { error: voidError } = await supabase
        .from('journal')
        .update({
          reversed_by: reversal.id,
          voided_at: new Date().toISOString(),
          void_reason: reason,
        } as any)
        .eq('id', journalId)

      if (voidError) throw voidError

      return { reversal, original }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journals'] })
    },
  })
}

export function useDeleteJournal() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (journalId: string) => {
      // First check if journal is DRAFT
      const { data: journal, error: checkError } = await supabase
        .from('journal')
        .select('status')
        .eq('id', journalId)
        .single()

      if (checkError) throw checkError
      if (journal?.status !== 'DRAFT') {
        throw new Error('Only DRAFT journals can be deleted. Use Void for posted journals.')
      }

      // Delete lines first (foreign key constraint)
      const { error: linesError } = await supabase
        .from('journal_line')
        .delete()
        .eq('journal_id', journalId)

      if (linesError) throw linesError

      // Delete journal
      const { error: journalError } = await supabase
        .from('journal')
        .delete()
        .eq('id', journalId)

      if (journalError) throw journalError

      return { success: true }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journals'] })
    },
  })
}

// =============================================
// GENERAL LEDGER
// =============================================

export function useGeneralLedger(accountCode: string, period?: string) {
  return useQuery({
    queryKey: ['general-ledger', accountCode, period],
    queryFn: async () => {
      let query = supabase
        .from('general_ledger' as any)
        .select('*')
        .eq('account_code', accountCode)
        .order('date')
        .order('created_at')

      if (period) {
        query = query.eq('period', period)
      }

      const { data, error } = await query

      if (error) throw error

      // Calculate running balance
      let runningBalance = 0
      const withBalance = (data as any[]).map((item: any) => {
        if (item.account_type === 'ASSET' || item.account_type === 'COGS' || item.account_type === 'OPEX') {
          runningBalance += Number(item.debit) - Number(item.credit)
        } else {
          runningBalance += Number(item.credit) - Number(item.debit)
        }
        return { ...item, running_balance: runningBalance }
      })

      return withBalance
    },
    enabled: !!accountCode,
  })
}

// =============================================
// COMPANY SETTINGS
// =============================================

export function useCompanySettings() {
  return useQuery({
    queryKey: ['company-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('company_settings' as any)
        .select('*')
        .maybeSingle()

      if (error) throw error
      return data
    },
  })
}

export function useUpdateCompanySettings() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (settings: any) => {
      // Get existing record
      const { data: existingRecords } = await supabase
        .from('company_settings' as any)
        .select('id') as any

      const existing = existingRecords?.[0]

      if (existing?.id) {
        // Update existing record
        const { data, error } = await supabase
          .from('company_settings' as any)
          .update(settings)
          .eq('id', existing.id)
          .select()
          .single()

        if (error) throw error
        return data
      } else {
        // Insert new record
        const { data, error } = await supabase
          .from('company_settings' as any)
          .insert(settings)
          .select()
          .single()

        if (error) throw error
        return data
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-settings'] })
    },
  })
}

// =============================================
// DASHBOARD METRICS
// =============================================

export function useDashboardMetrics() {
  return useQuery({
    queryKey: ['dashboard-metrics'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dashboard_metrics' as any)
        .select('*')
        .maybeSingle()

      if (error) throw error
      return data
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  })
}

// =============================================
// TAX REPORTS
// =============================================

export function usePPh23Report(period: string) {
  return useQuery({
    queryKey: ['pph23-report', period],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_pph23_report' as any, { p_period: period })

      if (error) throw error
      return data as any[]
    },
    enabled: !!period,
  })
}

export function usePPNReport(period: string) {
  return useQuery({
    queryKey: ['ppn-report', period],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_ppn_report' as any, { p_period: period })

      if (error) throw error
      return data as any[]
    },
    enabled: !!period,
  })
}

// =============================================
// ACTIVITY LOG
// =============================================

export function useActivityLog(tableName?: string, recordId?: string) {
  return useQuery({
    queryKey: ['activity-log', tableName, recordId],
    queryFn: async () => {
      let query = supabase
        .from('audit_log' as any)
        .select('*')
        .order('changed_at', { ascending: false })

      if (tableName) {
        query = query.eq('table_name', tableName)
      }

      if (recordId) {
        query = query.eq('record_id', recordId)
      }

      const { data, error } = await query.limit(100)

      if (error) throw error
      return data as any[]
    },
  })
}
