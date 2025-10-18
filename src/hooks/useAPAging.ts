import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'

export function useAPAgingReport() {
  return useQuery({
    queryKey: ['ap-aging'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ap_aging_summary')
        .select('*')
        .order('days_overdue', { ascending: false })

      if (error) throw error

      // Calculate summary by bucket
      const summary = {
        '0-30': 0,
        '31-60': 0,
        '61-90': 0,
        '90+': 0,
        total: 0,
      }

      data?.forEach((item: any) => {
        const balance = Number(item.balance)
        summary[item.aging_bucket as keyof typeof summary] += balance
        summary.total += balance
      })

      return {
        aging: data,
        summary,
      }
    },
  })
}
