import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'

export interface BillLine {
  description: string
  quantity: number
  unitPrice: number
  expenseAccountCode: string
  projectCode?: string
}

export interface CreateBillInput {
  date: string
  vendorId: string
  projectId?: string
  vendorInvoiceNumber?: string
  fakturPajakNumber?: string
  category: 'COGS' | 'OPEX'
  lines: BillLine[]
}

export function useCreateBill() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateBillInput) => {
      const { data, error } = await supabase.functions.invoke('create-bill', {
        body: input,
      })

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bills'] })
      queryClient.invalidateQueries({ queryKey: ['ap-aging'] })
    },
  })
}

export function useBills() {
  return useQuery({
    queryKey: ['bills'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('vendor_bill')
        .select(`
          *,
          vendor:vendor_id(*),
          project:project_id(*),
          payments:vendor_payment(*)
        `)
        .order('date', { ascending: false })

      if (error) throw error
      return data
    },
  })
}

export function useBill(id: string) {
  return useQuery({
    queryKey: ['bill', id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('vendor_bill')
        .select(`
          *,
          vendor:vendor_id(*),
          project:project_id(*),
          lines:bill_line(*),
          payments:vendor_payment(*)
        `)
        .eq('id', id)
        .single()

      if (error) throw error
      return data
    },
    enabled: !!id,
  })
}
