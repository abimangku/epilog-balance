import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import type { Account, AccountType } from '@/lib/types'

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  ASSET: 'Assets',
  LIABILITY: 'Liabilities',
  EQUITY: 'Equity',
  REVENUE: 'Revenue',
  COGS: 'Cost of Goods Sold',
  OPEX: 'Operating Expenses',
  OTHER_INCOME: 'Other Income',
  OTHER_EXPENSE: 'Other Expenses',
  TAX_EXPENSE: 'Tax Expenses',
}

export function useAccounts() {
  return useQuery({
    queryKey: ['accounts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('account')
        .select('*')
        .eq('is_active', true)
        .order('code', { ascending: true })

      if (error) throw error
      return data as Account[]
    },
  })
}

export function useAccountsByType() {
  const { data: accounts, ...rest } = useAccounts()

  const groupedAccounts = accounts?.reduce((acc, account) => {
    if (!acc[account.type]) acc[account.type] = []
    acc[account.type].push(account)
    return acc
  }, {} as Record<AccountType, Account[]>)

  return {
    data: groupedAccounts || ({} as Record<AccountType, Account[]>),
    ...rest,
  }
}

export function useCreateAccount() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: {
      code: string
      name: string
      type: AccountType
      parent_code?: string
      is_active: boolean
    }) => {
      const { data, error } = await supabase
        .from('account')
        .insert(input)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
    },
  })
}

export function useUpdateAccount() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...input }: {
      id: string
      code?: string
      name?: string
      type?: AccountType
      parent_code?: string
      is_active?: boolean
    }) => {
      const { data, error } = await supabase
        .from('account')
        .update(input)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
    },
  })
}
