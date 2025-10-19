import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'

export function useProfitLoss(startPeriod: string, endPeriod?: string) {
  return useQuery({
    queryKey: ['profit-loss', startPeriod, endPeriod],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_profit_loss' as any, {
        p_start_period: startPeriod,
        p_end_period: endPeriod || startPeriod,
      })

      if (error) throw error

      const items = (data || []) as any[]

      // Calculate totals
      const revenue = items
        .filter((item: any) => item.account_type === 'REVENUE')
        .reduce((sum: number, item: any) => sum + Number(item.amount), 0)

      const cogs = items
        .filter((item: any) => item.account_type === 'COGS')
        .reduce((sum: number, item: any) => sum + Number(item.amount), 0)

      const opex = items
        .filter((item: any) => item.account_type === 'OPEX')
        .reduce((sum: number, item: any) => sum + Number(item.amount), 0)

      const grossProfit = revenue - cogs
      const netProfit = grossProfit - opex

      return {
        data: items,
        summary: {
          revenue,
          cogs,
          grossProfit,
          grossMargin: revenue > 0 ? (grossProfit / revenue) * 100 : 0,
          opex,
          netProfit,
          netMargin: revenue > 0 ? (netProfit / revenue) * 100 : 0,
        },
      }
    },
    enabled: !!startPeriod,
  })
}

export function useBalanceSheet(asOfDate: string) {
  return useQuery({
    queryKey: ['balance-sheet', asOfDate],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_balance_sheet' as any, {
        p_as_of_date: asOfDate,
      })

      if (error) throw error

      const items = (data || []) as any[]

      const assets = items
        .filter((item: any) => item.account_type === 'ASSET')
        .reduce((sum: number, item: any) => sum + Number(item.balance), 0)

      const liabilities = items
        .filter((item: any) => item.account_type === 'LIABILITY')
        .reduce((sum: number, item: any) => sum + Number(item.balance), 0)

      const equity = items
        .filter((item: any) => item.account_type === 'EQUITY')
        .reduce((sum: number, item: any) => sum + Number(item.balance), 0)

      return {
        data: items,
        summary: {
          assets,
          liabilities,
          equity,
          totalLiabilitiesEquity: liabilities + equity,
          balanced: Math.abs(assets - (liabilities + equity)) < 100, // Allow 100 IDR rounding
        },
      }
    },
    enabled: !!asOfDate,
  })
}

export function useCashFlow(startDate: string, endDate: string) {
  return useQuery({
    queryKey: ['cash-flow', startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_cash_flow' as any, {
        p_start_date: startDate,
        p_end_date: endDate,
      })

      if (error) throw error
      return (data || []) as any[]
    },
    enabled: !!startDate && !!endDate,
  })
}

export function useTrialBalance() {
  return useQuery({
    queryKey: ['trial-balance'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trial_balance' as any)
        .select('*')

      if (error) throw error

      const items = (data || []) as any[]

      const totalDebit = items.reduce((sum: number, item: any) => sum + Number(item.total_debit || 0), 0)
      const totalCredit = items.reduce((sum: number, item: any) => sum + Number(item.total_credit || 0), 0)

      return {
        data: items,
        summary: {
          totalDebit,
          totalCredit,
          balanced: Math.abs(totalDebit - totalCredit) < 100,
        },
      }
    },
  })
}
