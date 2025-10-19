import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'

interface AISuggestionFilters {
  startDate?: string
  endDate?: string
  suggestionType?: string
  status?: string
  conversationId?: string
}

export function useAISuggestions(filters?: AISuggestionFilters) {
  return useQuery({
    queryKey: ['ai-suggestions', filters],
    queryFn: async () => {
      let query = supabase
        .from('ai_suggestion_log')
        .select('*')
        .order('created_at', { ascending: false })

      if (filters?.startDate) {
        query = query.gte('created_at', filters.startDate)
      }
      if (filters?.endDate) {
        query = query.lte('created_at', filters.endDate)
      }
      if (filters?.suggestionType && filters.suggestionType !== 'all') {
        query = query.eq('suggestion_type', filters.suggestionType)
      }
      if (filters?.status && filters.status !== 'all') {
        query = query.eq('status', filters.status)
      }
      if (filters?.conversationId) {
        query = query.eq('conversation_id', filters.conversationId)
      }

      const { data, error } = await query

      if (error) throw error
      return data
    },
  })
}
