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
        .from('journal_register')
        .select('*')

      if (filters?.period) {
        query = query.eq('period', filters.period)
      }

      if (filters?.status) {
        query = query.eq('status', filters.status)
      }

      if (filters?.searchTerm) {
        query = query.or(`number.ilike.%${filters.searchTerm}%,description.ilike.%${filters.searchTerm}%`)
      }

      const { data, error } = await query

      if (error) throw error
      return data
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
        .rpc('get_next_number', { p_entity_type: 'journal' })

      // Create reversing journal
      const { data: reversal, error: reversalError } = await supabase
        .from('journal')
        .insert({
          number: reversalNumber,
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
        })
        .eq('id', journalId)

      if (voidError) throw voidError

      return { reversal, original }
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
        .from('general_ledger')
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
      const withBalance = data.map(item => {
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
        .from('company_settings')
        .select('*')
        .single()

      if (error) throw error
      return data
    },
  })
}

export function useUpdateCompanySettings() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (settings: any) => {
      const { data, error } = await supabase
        .from('company_settings')
        .update(settings)
        .eq('id', settings.id)
        .select()
        .single()

      if (error) throw error
      return data
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
        .from('dashboard_metrics')
        .select('*')
        .single()

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
        .rpc('get_pph23_report', { p_period: period })

      if (error) throw error
      return data
    },
    enabled: !!period,
  })
}

export function usePPNReport(period: string) {
  return useQuery({
    queryKey: ['ppn-report', period],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_ppn_report', { p_period: period })

      if (error) throw error
      return data
    },
    enabled: !!period,
  })
}

// =============================================
// ACTIVITY LOG
// =============================================

export function useActivityLog(entityType?: string, entityId?: string) {
  return useQuery({
    queryKey: ['activity-log', entityType, entityId],
    queryFn: async () => {
      let query = supabase
        .from('audit_log')
        .select('*')
        .order('created_at', { ascending: false })

      if (entityType) {
        query = query.eq('entity_type', entityType)
      }

      if (entityId) {
        query = query.eq('entity_id', entityId)
      }

      const { data, error } = await query.limit(100)

      if (error) throw error
      return data
    },
  })
}
