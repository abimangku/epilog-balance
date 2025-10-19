import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'

interface TransactionFilters {
  startDate?: string
  endDate?: string
  type?: string
  status?: string
  aiFilter?: string
  createdBy?: string
  searchTerm?: string
}

export function useTransactions(filters?: TransactionFilters) {
  return useQuery({
    queryKey: ['transactions', filters],
    queryFn: async () => {
      let query = supabase
        .from('unified_transactions')
        .select('*')
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })

      if (filters?.startDate) {
        query = query.gte('date', filters.startDate)
      }
      if (filters?.endDate) {
        query = query.lte('date', filters.endDate)
      }
      if (filters?.type && filters.type !== 'all') {
        query = query.eq('type', filters.type)
      }
      if (filters?.status && filters.status !== 'all') {
        query = query.ilike('status', filters.status)
      }
      if (filters?.aiFilter === 'ai') {
        query = query.eq('created_by_ai', true)
      }
      if (filters?.aiFilter === 'manual') {
        query = query.eq('created_by_ai', false)
      }
      if (filters?.searchTerm) {
        query = query.or(`number.ilike.%${filters.searchTerm}%,description.ilike.%${filters.searchTerm}%`)
      }

      const { data, error } = await query

      if (error) throw error
      return data as Array<{
        id: string
        type: string
        number: string
        date: string
        description: string
        status: string
        amount: number
        created_by: string | null
        created_at: string
        created_by_ai: boolean | null
        source_doc_type: string | null
        source_doc_id: string | null
      }>
    },
  })
}
