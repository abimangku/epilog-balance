import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import type { CreateJournalInput } from '@/lib/types'

export function useCreateJournal() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateJournalInput) => {
      // Validate balanced entry
      const totalDebit = input.lines.reduce((sum, line) => sum + line.debit, 0)
      const totalCredit = input.lines.reduce((sum, line) => sum + line.credit, 0)

      if (totalDebit !== totalCredit) {
        throw new Error('Journal entry must be balanced (DR = CR)')
      }

      // Generate journal number
      const { count } = await supabase
        .from('journal')
        .select('*', { count: 'exact', head: true })

      const number = `JV-2025-${String((count || 0) + 1).padStart(4, '0')}`

      const period = new Date(input.date).toISOString().slice(0, 7)

      // Create journal
      const { data: journal, error: journalError } = await supabase
        .from('journal')
        .insert({
          number,
          date: input.date,
          description: input.description,
          period,
          status: 'POSTED',
        })
        .select()
        .single()

      if (journalError) throw journalError

      // Create journal lines
      const lines = input.lines.map((line, idx) => ({
        journal_id: journal.id,
        account_code: line.account_code,
        debit: line.debit,
        credit: line.credit,
        description: line.description,
        project_code: line.project_code,
        sort_order: idx,
      }))

      const { error: linesError } = await supabase
        .from('journal_line')
        .insert(lines)

      if (linesError) throw linesError

      return journal
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journals'] })
    },
  })
}
