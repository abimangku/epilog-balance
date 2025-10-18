import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'

export function useRunAudit() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (period: string) => {
      const { data, error } = await supabase.functions.invoke('run-ai-audit', {
        body: { period },
      })

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audits'] })
    },
  })
}

export function useClosePeriod() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ period, auditId }: { period: string; auditId?: string }) => {
      const { data, error } = await supabase.functions.invoke('close-period', {
        body: { period, auditId },
      })

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['period-status'] })
      queryClient.invalidateQueries({ queryKey: ['journals'] })
    },
  })
}

export function usePeriodStatus(period: string) {
  return useQuery({
    queryKey: ['period-status', period],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('period_status')
        .select('*')
        .eq('period', period)
        .maybeSingle()

      if (error && error.code !== 'PGRST116') throw error
      return data
    },
    enabled: !!period,
  })
}

export function useAudit(auditId: string) {
  return useQuery({
    queryKey: ['audit', auditId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_audit')
        .select('*')
        .eq('id', auditId)
        .single()

      if (error) throw error
      return data
    },
    enabled: !!auditId,
  })
}

export function useVATPosition(period: string) {
  return useQuery({
    queryKey: ['vat-position', period],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('calculate_vat_position', { p_period: period })

      if (error) throw error
      return data?.[0] || { ppn_keluaran: 0, ppn_masukan: 0, net_payable: 0 }
    },
    enabled: !!period,
  })
}

export function usePeriodSnapshot(period: string) {
  return useQuery({
    queryKey: ['snapshot', period],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('period_snapshot')
        .select('*')
        .eq('period', period)
        .order('account_code')

      if (error) throw error
      return data
    },
    enabled: !!period,
  })
}
