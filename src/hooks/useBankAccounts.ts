import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'

export function useBankAccounts() {
  return useQuery({
    queryKey: ['bank-accounts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bank_account')
        .select('*')
        .order('bank_name')
      
      if (error) throw error
      return data
    },
  })
}

export function useCreateBankAccount() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (input: {
      bank_name: string
      account_number: string
      account_code: string
    }) => {
      const { data, error } = await supabase
        .from('bank_account')
        .insert(input)
        .select()
        .single()
      
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] })
    },
  })
}

export function useUpdateBankAccount() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: any) => {
      const { data, error } = await supabase
        .from('bank_account')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] })
    },
  })
}
