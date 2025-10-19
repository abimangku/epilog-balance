import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'

interface CreateInvoiceInput {
  clientId: string
  projectId?: string
  date: string
  dueDate: string
  description: string
  lines: Array<{
    description: string
    quantity: number
    unitPrice: number
    amount: number
    revenueAccountCode: string
  }>
}

export function useInvoices() {
  return useQuery({
    queryKey: ['invoices'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sales_invoice')
        .select(`
          *,
          client:client_id(name, code),
          project:project_id(name, code)
        `)
        .order('date', { ascending: false })

      if (error) throw error
      return data
    },
  })
}

export function useCreateInvoice() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateInvoiceInput) => {
      const { data, error } = await supabase.functions.invoke('create-invoice', {
        body: input,
      })

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      queryClient.invalidateQueries({ queryKey: ['journals'] })
    },
  })
}

export function useOutstandingInvoices() {
  return useQuery({
    queryKey: ['outstanding-invoices'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sales_invoice')
        .select(`
          *,
          client:client_id(name, code),
          receipts:cash_receipt(amount)
        `)
        .in('status', ['SENT', 'PARTIAL', 'OVERDUE'])
        .order('due_date', { ascending: true })

      if (error) throw error
      
      return data.map((invoice: any) => {
        const totalPaid = invoice.receipts?.reduce((sum: number, r: any) => sum + r.amount, 0) || 0
        const outstanding = invoice.total - totalPaid
        const daysOverdue = Math.max(0, Math.floor((Date.now() - new Date(invoice.due_date).getTime()) / (1000 * 60 * 60 * 24)))
        
        return {
          ...invoice,
          totalPaid,
          outstanding,
          daysOverdue,
        }
      })
    },
  })
}

export function useUpdateInvoiceStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { data, error } = await supabase
        .from('sales_invoice')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()
      
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      queryClient.invalidateQueries({ queryKey: ['invoice'] })
    },
  })
}

export function useVoidInvoice() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ invoiceId, reason }: { invoiceId: string; reason: string }) => {
      const { data, error } = await supabase.functions.invoke('void-invoice', {
        body: { invoiceId, reason }
      })

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      queryClient.invalidateQueries({ queryKey: ['invoice'] })
    },
  })
}

export function useARAgingReport() {
  return useQuery({
    queryKey: ['ar-aging'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sales_invoice')
        .select(`
          *,
          client:client_id(name, code),
          receipts:cash_receipt(amount)
        `)
        .in('status', ['SENT', 'PARTIAL', 'OVERDUE'])

      if (error) throw error

      const today = new Date()
      const buckets = {
        current: 0, // 0-30 days
        days31to60: 0,
        days61to90: 0,
        over90: 0,
      }

      data.forEach((invoice: any) => {
        const totalPaid = invoice.receipts?.reduce((sum: number, r: any) => sum + r.amount, 0) || 0
        const outstanding = invoice.total - totalPaid
        const daysOverdue = Math.floor((today.getTime() - new Date(invoice.due_date).getTime()) / (1000 * 60 * 60 * 24))

        if (daysOverdue <= 30) {
          buckets.current += outstanding
        } else if (daysOverdue <= 60) {
          buckets.days31to60 += outstanding
        } else if (daysOverdue <= 90) {
          buckets.days61to90 += outstanding
        } else {
          buckets.over90 += outstanding
        }
      })

      return {
        buckets,
        total: buckets.current + buckets.days31to60 + buckets.days61to90 + buckets.over90,
        invoices: data.map((invoice: any) => {
          const totalPaid = invoice.receipts?.reduce((sum: number, r: any) => sum + r.amount, 0) || 0
          const outstanding = invoice.total - totalPaid
          const daysOverdue = Math.floor((today.getTime() - new Date(invoice.due_date).getTime()) / (1000 * 60 * 60 * 24))
          
          return {
            ...invoice,
            totalPaid,
            outstanding,
            daysOverdue,
          }
        }),
      }
    },
  })
}
