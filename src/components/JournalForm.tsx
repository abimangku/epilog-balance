import { useState } from 'react'
import { useAccounts } from '@/hooks/useAccounts'
import { useCreateJournal } from '@/hooks/useJournals'
import type { JournalLine } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { useValidatePeriod } from '@/hooks/usePeriodClose'
import { Plus, X, CheckCircle2, AlertCircle } from 'lucide-react'

export function JournalForm() {
  const { data: accounts } = useAccounts()
  const createJournal = useCreateJournal()
  const { toast } = useToast()

  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [description, setDescription] = useState('')
  const [lines, setLines] = useState<JournalLine[]>([
    { account_code: '', debit: 0, credit: 0, description: '' },
    { account_code: '', debit: 0, credit: 0, description: '' },
  ])

  const totalDebit = lines.reduce((sum, line) => sum + line.debit, 0)
  const totalCredit = lines.reduce((sum, line) => sum + line.credit, 0)
  const isBalanced = totalDebit === totalCredit && totalDebit > 0

  const period = date ? new Date(date).toISOString().slice(0, 7) : ''
  const { data: periodCheck } = useValidatePeriod(period)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (periodCheck?.isClosed) {
      toast({
        title: 'Period Closed',
        description: 'Cannot create journal in a closed period',
        variant: 'destructive'
      })
      return
    }

    try {
      await createJournal.mutateAsync({
        date,
        description,
        lines: lines.filter(line => line.account_code && (line.debit > 0 || line.credit > 0)),
      })

      toast({
        title: 'Success',
        description: 'Journal entry created successfully!',
      })
      
      // Reset form
      setDescription('')
      setLines([
        { account_code: '', debit: 0, credit: 0, description: '' },
        { account_code: '', debit: 0, credit: 0, description: '' },
      ])
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create journal entry',
        variant: 'destructive',
      })
    }
  }

  const addLine = () => {
    setLines([...lines, { account_code: '', debit: 0, credit: 0, description: '' }])
  }

  const removeLine = (index: number) => {
    setLines(lines.filter((_, i) => i !== index))
  }

  const updateLine = (index: number, field: keyof JournalLine, value: any) => {
    const updated = [...lines]
    updated[index] = { ...updated[index], [field]: value }
    setLines(updated)
  }

  return (
    <div className="p-6 max-w-6xl">
      <h1 className="text-3xl font-bold mb-6 text-foreground">Create Journal Entry</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Journal entry description"
              required
            />
          </div>
        </div>

        <div className="border border-border rounded-lg p-4 bg-card">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-foreground">Journal Lines</h3>
            <Button
              type="button"
              onClick={addLine}
              variant="outline"
              size="sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Line
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-muted">
                  <th className="text-left p-3 border-b border-border text-muted-foreground font-medium">Account</th>
                  <th className="text-left p-3 border-b border-border text-muted-foreground font-medium">Description</th>
                  <th className="text-right p-3 border-b border-border text-muted-foreground font-medium">Debit</th>
                  <th className="text-right p-3 border-b border-border text-muted-foreground font-medium">Credit</th>
                  <th className="p-3 border-b border-border"></th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line, index) => (
                  <tr key={index} className="border-b border-border">
                    <td className="p-2">
                      <select
                        value={line.account_code}
                        onChange={(e) => updateLine(index, 'account_code', e.target.value)}
                        className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background text-foreground"
                      >
                        <option value="">Select account...</option>
                        {accounts?.map((account) => (
                          <option key={account.id} value={account.code}>
                            {account.code} - {account.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="p-2">
                      <Input
                        type="text"
                        value={line.description || ''}
                        onChange={(e) => updateLine(index, 'description', e.target.value)}
                        placeholder="Line description"
                        className="text-sm"
                      />
                    </td>
                    <td className="p-2">
                      <Input
                        type="number"
                        value={line.debit || ''}
                        onChange={(e) => updateLine(index, 'debit', Number(e.target.value))}
                        className="text-sm text-right"
                        min="0"
                      />
                    </td>
                    <td className="p-2">
                      <Input
                        type="number"
                        value={line.credit || ''}
                        onChange={(e) => updateLine(index, 'credit', Number(e.target.value))}
                        className="text-sm text-right"
                        min="0"
                      />
                    </td>
                    <td className="p-2 text-center">
                      {lines.length > 2 && (
                        <Button
                          type="button"
                          onClick={() => removeLine(index)}
                          variant="ghost"
                          size="sm"
                        >
                          <X className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-muted font-semibold">
                  <td colSpan={2} className="p-3 text-right text-foreground">Totals:</td>
                  <td className="p-3 text-right text-foreground">{totalDebit.toLocaleString()}</td>
                  <td className="p-3 text-right text-foreground">{totalCredit.toLocaleString()}</td>
                  <td className="p-3"></td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="mt-4">
            {!isBalanced && totalDebit > 0 && (
              <div className="flex items-center gap-2 text-destructive font-medium">
                <AlertCircle className="h-5 w-5" />
                <span>Entry not balanced: DR {totalDebit.toLocaleString()} ≠ CR {totalCredit.toLocaleString()}</span>
              </div>
            )}
            {isBalanced && (
              <div className="flex items-center gap-2 text-green-600 dark:text-green-400 font-medium">
                <CheckCircle2 className="h-5 w-5" />
                <span>Entry is balanced: DR = CR = {totalDebit.toLocaleString()}</span>
              </div>
            )}
          </div>
        </div>

        <Button
          type="submit"
          disabled={!isBalanced || createJournal.isPending}
          className="w-full md:w-auto"
        >
          {createJournal.isPending ? 'Creating...' : 'Create Journal Entry'}
        </Button>
      </form>
    </div>
  )
}
