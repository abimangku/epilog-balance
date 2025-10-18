import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import type { Account, AccountType } from '@/lib/types'

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
    accounts: groupedAccounts || ({} as Record<AccountType, Account[]>),
    ...rest,
  }
}
