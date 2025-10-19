import { useState } from 'react'
import { useJournals, useVoidJournal, useDeleteJournal } from '@/hooks/useCriticalFeatures'
import { Link } from 'react-router-dom'
import { useToast } from '@/hooks/use-toast'
import { exportToExcel } from '@/lib/exportToExcel'
import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function JournalList() {
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7))
  const [searchTerm, setSearchTerm] = useState('')
  const [status, setStatus] = useState('')
  const [aiFilter, setAiFilter] = useState('')
  const { toast } = useToast()

  const { data: journals, isLoading } = useJournals({ period, searchTerm, status, aiFilter })
  const voidJournal = useVoidJournal()
  const deleteJournal = useDeleteJournal()

  const handleVoid = async (journalId: string, journalNumber: string) => {
    const reason = prompt(`Void journal ${journalNumber}? Enter reason:`)
    if (!reason) return

    try {
      await voidJournal.mutateAsync({ journalId, reason })
      toast({
        title: "Journal voided",
        description: `Journal ${journalNumber} has been voided successfully.`,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to void journal',
        variant: "destructive",
      })
    }
  }

  const handleDelete = async (journalId: string, journalNumber: string) => {
    if (!confirm(`Delete draft journal ${journalNumber}? This cannot be undone.`)) {
      return
    }

    try {
      await deleteJournal.mutateAsync(journalId)
      toast({
        title: "Journal deleted",
        description: `Draft journal ${journalNumber} has been deleted.`,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to delete journal',
        variant: "destructive",
      })
    }
  }

  const handleExport = () => {
    const exportData = journals?.map(j => ({
      'Journal #': j.number,
      'Date': new Date(j.date).toLocaleDateString(),
      'Period': j.period,
      'Description': j.description,
      'Status': j.status,
      'Total Debit': j.total_debit,
      'Total Credit': j.total_credit,
      'Lines': j.line_count,
    })) || []
    
    exportToExcel(exportData, `journals-${new Date().toISOString().split('T')[0]}`, 'Journals')
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-foreground">Journal Entries</h1>
        <div className="flex gap-2">
          <Button onClick={handleExport} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export to Excel
          </Button>
          <Link
            to="/journals/new"
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            + New Journal Entry
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card rounded-lg shadow p-4 mb-6 flex gap-4">
        <div>
          <label className="block text-sm font-medium mb-1 text-foreground">Period</label>
          <input
            type="month"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="border border-input rounded-md px-3 py-2 bg-background text-foreground"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 text-foreground">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="border border-input rounded-md px-3 py-2 bg-background text-foreground"
          >
            <option value="">All</option>
            <option value="POSTED">Posted</option>
            <option value="DRAFT">Draft</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 text-foreground">Source</label>
          <select
            value={aiFilter}
            onChange={(e) => setAiFilter(e.target.value)}
            className="border border-input rounded-md px-3 py-2 bg-background text-foreground"
          >
            <option value="">All</option>
            <option value="ai">🤖 AI Created</option>
            <option value="manual">Manual</option>
          </select>
        </div>

        <div className="flex-1">
          <label className="block text-sm font-medium mb-1 text-foreground">Search</label>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full border border-input rounded-md px-3 py-2 bg-background text-foreground placeholder:text-muted-foreground"
            placeholder="Search number or description..."
          />
        </div>
      </div>

      {/* Journal List */}
      <div className="bg-card rounded-lg shadow overflow-hidden">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-muted">
              <th className="text-left p-3 border border-border text-foreground">Journal #</th>
              <th className="text-left p-3 border border-border text-foreground">Date</th>
              <th className="text-left p-3 border border-border text-foreground">Description</th>
              <th className="text-right p-3 border border-border text-foreground">Debit</th>
              <th className="text-right p-3 border border-border text-foreground">Credit</th>
              <th className="text-center p-3 border border-border text-foreground">Lines</th>
              <th className="text-center p-3 border border-border text-foreground">Status</th>
              <th className="text-center p-3 border border-border text-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-muted-foreground">
                  Loading journals...
                </td>
              </tr>
            ) : journals && journals.length > 0 ? (
              journals.map((journal: any) => (
              <tr 
                key={journal.id} 
                className="hover:bg-muted/50"
              >
              <td className="p-3 border border-border font-mono text-sm text-foreground">
                {journal.number}
                {(journal as any).created_by_ai && (
                  <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded font-medium">
                    🤖 AI
                  </span>
                )}
              </td>
                <td className="p-3 border border-border text-foreground">
                  {new Date(journal.date).toLocaleDateString()}
                </td>
                <td className="p-3 border border-border text-foreground">{journal.description}</td>
                <td className="p-3 border border-border text-right font-mono text-foreground">
                  {Number(journal.total_debit).toLocaleString()}
                </td>
                <td className="p-3 border border-border text-right font-mono text-foreground">
                  {Number(journal.total_credit).toLocaleString()}
                </td>
                <td className="p-3 border border-border text-center text-foreground">{journal.line_count}</td>
                <td className="p-3 border border-border text-center">
                  <span className={`text-xs px-2 py-1 rounded ${
                    journal.status === 'POSTED' ? 'bg-green-100 text-green-800' : 'bg-muted text-muted-foreground'
                  }`}>
                    {journal.status}
                  </span>
                </td>
                <td className="p-3 border border-border text-center">
                  <Link
                    to={`/journals/${journal.id}`}
                    className="text-primary hover:underline text-sm"
                  >
                    View
                  </Link>
                  {journal.status === 'DRAFT' && (
                    <>
                      {' | '}
                      <button
                        onClick={() => handleDelete(journal.id, journal.number)}
                        className="text-destructive hover:underline text-sm"
                      >
                        Delete
                      </button>
                    </>
                  )}
                  {journal.status === 'POSTED' && (
                    <>
                      {' | '}
                      <button
                        onClick={() => handleVoid(journal.id, journal.number)}
                        className="text-destructive hover:underline text-sm"
                      >
                        Void
                      </button>
                    </>
                  )}
                </td>
              </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} className="p-8 text-center text-muted-foreground">
                  No journal entries found for the selected filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
