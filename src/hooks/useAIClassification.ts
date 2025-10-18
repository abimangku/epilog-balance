import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'

interface ClassifyInput {
  description: string
  amount: number
  context?: string
}

interface ClassifierResponse {
  success: boolean
  txInputId: string
  suggestion: {
    type: string
    vendor: string | null
    client: string | null
    project: string | null
    amount: number
    vatAmount: number
    accounts: Array<{
      code: string
      name: string
      debit: number
      credit: number
    }>
    confidence: number
    reasoning: string
    requiresInput?: string[]
  }
}

export function useClassifyTransaction() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: ClassifyInput) => {
      const { data, error } = await supabase.functions.invoke('classify-transaction', {
        body: input,
      })

      if (error) throw error
      return data as ClassifierResponse
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-suggestions'] })
    },
  })
}

export function useAcceptSuggestion() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (suggestionId: string) => {
      const { data, error } = await supabase.functions.invoke('accept-suggestion', {
        body: { suggestionId },
      })

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-suggestions'] })
      queryClient.invalidateQueries({ queryKey: ['journals'] })
    },
  })
}

interface TxInputWithSuggestion {
  id: string
  date: string
  description: string
  amount: number
  vendor: string | null
  category: string | null
  project_code: string | null
  status: string
  ai_suggestion: {
    id: string
    suggested_type: string
    suggested_vendor: string | null
    suggested_project: string | null
    suggested_accounts: any
    confidence: number
    reasoning: string | null
    status: string
  } | null
}

export function usePendingSuggestions() {
  return useQuery<TxInputWithSuggestion[]>({
    queryKey: ['pending-suggestions'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('tx_input')
        .select('*, ai_suggestion:tx_ai_suggestion(*)')
        .eq('status', 'CLASSIFIED')
        .order('created_at', { ascending: false })

      if (error) throw error
      return data as TxInputWithSuggestion[]
    },
  })
}
