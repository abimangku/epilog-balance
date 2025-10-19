import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'

// =============================================
// CLIENT HOOKS
// =============================================

export function useClients() {
  return useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client')
        .select('*')
        .order('name')

      if (error) throw error
      return data
    },
  })
}

export function useCreateClient() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: {
      code: string
      name: string
      taxId?: string
      email?: string
      contactPerson?: string
      phone?: string
      address?: string
      city?: string
      paymentTerms?: number
      withholdsPPh23?: boolean
      notes?: string
    }) => {
      const { data, error } = await supabase
        .from('client')
        .insert({
          code: input.code,
          name: input.name,
          tax_id: input.taxId,
          email: input.email,
          contact_person: input.contactPerson,
          phone: input.phone,
          address: input.address,
          city: input.city,
          payment_terms: input.paymentTerms || 30,
          withholds_pph23: input.withholdsPPh23 || false,
          notes: input.notes,
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] })
    },
  })
}

export function useUpdateClient() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...input }: { id: string; [key: string]: any }) => {
      const { data, error } = await supabase
        .from('client')
        .update(input)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] })
    },
  })
}

export function useRevenueByClient() {
  return useQuery({
    queryKey: ['revenue-by-client'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('revenue_by_client' as any)
        .select('*')

      if (error) throw error
      return (data || []) as any[]
    },
  })
}

// =============================================
// VENDOR HOOKS (extend existing)
// =============================================

export function useCreateVendor() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: {
      code: string
      name: string
      taxId?: string
      email?: string
      contactPerson?: string
      phone?: string
      address?: string
      city?: string
      paymentTerms?: number
      providesFakturPajak?: boolean
      subjectToPPh23?: boolean
      pph23Rate?: number
      bankName?: string
      bankAccountNumber?: string
      bankAccountName?: string
      notes?: string
    }) => {
      const { data, error } = await supabase
        .from('vendor')
        .insert({
          code: input.code,
          name: input.name,
          tax_id: input.taxId,
          email: input.email,
          contact_person: input.contactPerson,
          phone: input.phone,
          address: input.address,
          city: input.city,
          payment_terms: input.paymentTerms || 30,
          provides_faktur_pajak: input.providesFakturPajak || false,
          subject_to_pph23: input.subjectToPPh23 || false,
          pph23_rate: input.pph23Rate || 0.02,
          bank_name: input.bankName,
          bank_account_number: input.bankAccountNumber,
          bank_account_name: input.bankAccountName,
          notes: input.notes,
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] })
    },
  })
}

export function useUpdateVendor() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...input }: { id: string; [key: string]: any }) => {
      const { data, error } = await supabase
        .from('vendor')
        .update(input)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] })
    },
  })
}

export function useExpensesByVendor() {
  return useQuery({
    queryKey: ['expenses-by-vendor'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('expenses_by_vendor' as any)
        .select('*')

      if (error) throw error
      return (data || []) as any[]
    },
  })
}

// =============================================
// PROJECT HOOKS
// =============================================

export function useProjects() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project')
        .select('*, client:client_id(name)')
        .order('name')

      if (error) throw error
      return data
    },
  })
}

export function useCreateProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: {
      code: string
      name: string
      clientId: string
      description?: string
      startDate?: string
      endDate?: string
      budgetAmount?: number
      status?: 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED'
      notes?: string
    }) => {
      const { data, error } = await supabase
        .from('project')
        .insert({
          code: input.code,
          name: input.name,
          client_id: input.clientId,
          description: input.description,
          start_date: input.startDate,
          end_date: input.endDate,
          budget_amount: input.budgetAmount,
          status: input.status || 'ACTIVE',
          notes: input.notes,
        } as any)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
    },
  })
}

export function useUpdateProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...input }: { id: string; [key: string]: any }) => {
      const { data, error } = await supabase
        .from('project')
        .update(input)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
    },
  })
}

export function useProjectProfitability() {
  return useQuery({
    queryKey: ['project-profitability'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_profitability' as any)
        .select('*')

      if (error) throw error
      return (data || []) as any[]
    },
  })
}
