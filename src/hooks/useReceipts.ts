import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'

interface CreateReceiptInput {
  invoiceId: string
  date: string
  amount: number
  pph23Withheld?: number
  bankAccountCode: string
  description?: string
}

export function useCreateReceipt() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateReceiptInput) => {
      const { data, error } = await supabase.functions.invoke('create-receipt', {
        body: input,
      })

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      queryClient.invalidateQueries({ queryKey: ['outstanding-invoices'] })
      queryClient.invalidateQueries({ queryKey: ['ar-aging'] })
      queryClient.invalidateQueries({ queryKey: ['journals'] })
    },
  })
}
