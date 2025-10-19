import { useParams, Link } from 'react-router-dom'
import { useJournal, useActivityLog } from '@/hooks/useCriticalFeatures'

export function JournalDetail() {
  const { id } = useParams<{ id: string }>()
  const { data: journal, isLoading } = useJournal(id!)
  const { data: activities } = useActivityLog('journal', id)

  if (isLoading) {
    return <div className="p-6 text-foreground">Loading journal...</div>
  }

  if (!journal) {
    return <div className="p-6 text-foreground">Journal not found</div>
  }

  const totalDebit = journal.lines?.reduce((sum: number, line: any) => sum + Number(line.debit), 0) || 0
  const totalCredit = journal.lines?.reduce((sum: number, line: any) => sum + Number(line.credit), 0) || 0
  const isBalanced = Math.abs(totalDebit - totalCredit) < 1

  return (
    <div className="p-6 max-w-5xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-foreground">Journal Entry: {journal.number}</h1>
        <Link
          to="/journals"
          className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors"
        >
          ← Back to List
        </Link>
      </div>

      {/* Journal Header */}
      <div className="bg-card rounded-lg shadow p-6 mb-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-muted-foreground">Journal Number</label>
            <div className="font-mono text-lg text-foreground">{journal.number}</div>
          </div>
          <div>
            <label className="text-sm text-muted-foreground">Date</label>
            <div className="text-lg text-foreground">{new Date(journal.date).toLocaleDateString()}</div>
          </div>
          <div>
            <label className="text-sm text-muted-foreground">Period</label>
            <div className="text-lg text-foreground">{journal.period}</div>
          </div>
          <div>
            <label className="text-sm text-muted-foreground">Status</label>
            <div>
              <span className={`px-3 py-1 rounded text-sm font-medium ${
                journal.status === 'POSTED' ? 'bg-green-100 text-green-800' : 'bg-muted text-muted-foreground'
              }`}>
                {journal.status}
              </span>
              {(journal as any).voided_at && (
                <span className="ml-2 px-3 py-1 rounded text-sm font-medium bg-destructive/20 text-destructive">
                  VOIDED
                </span>
              )}
            </div>
          </div>
          <div className="col-span-2">
            <label className="text-sm text-muted-foreground">Description</label>
            <div className="text-lg text-foreground">{journal.description}</div>
          </div>
        </div>

        {(journal as any).void_reason && (
          <div className="mt-4 p-3 bg-destructive/10 border border-destructive/30 rounded-md">
            <div className="text-sm font-medium text-destructive">Void Reason:</div>
            <div className="text-destructive/80">{(journal as any).void_reason}</div>
          </div>
        )}
      </div>

      {/* Journal Lines */}
      <div className="bg-card rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-bold mb-4 text-foreground">Journal Lines</h2>
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-muted">
              <th className="text-left p-3 border border-border text-foreground">Account</th>
              <th className="text-left p-3 border border-border text-foreground">Description</th>
              <th className="text-left p-3 border border-border text-foreground">Project</th>
              <th className="text-right p-3 border border-border text-foreground">Debit</th>
              <th className="text-right p-3 border border-border text-foreground">Credit</th>
            </tr>
          </thead>
          <tbody>
            {journal.lines?.map((line: any) => (
              <tr key={line.id} className="hover:bg-muted/50">
                <td className="p-3 border border-border font-mono text-sm text-foreground">{line.account_code}</td>
                <td className="p-3 border border-border text-foreground">{line.description}</td>
                <td className="p-3 border border-border font-mono text-sm text-muted-foreground">
                  {line.project_code || '-'}
                </td>
                <td className="p-3 border border-border text-right font-mono text-foreground">
                  {Number(line.debit) > 0 ? Number(line.debit).toLocaleString() : '-'}
                </td>
                <td className="p-3 border border-border text-right font-mono text-foreground">
                  {Number(line.credit) > 0 ? Number(line.credit).toLocaleString() : '-'}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-muted font-bold">
              <td colSpan={3} className="p-3 border border-border text-right text-foreground">TOTALS</td>
              <td className="p-3 border border-border text-right font-mono text-foreground">
                {totalDebit.toLocaleString()}
              </td>
              <td className="p-3 border border-border text-right font-mono text-foreground">
                {totalCredit.toLocaleString()}
              </td>
            </tr>
            <tr>
              <td colSpan={5} className="p-3 text-center">
                {isBalanced ? (
                  <span className="text-green-600 font-medium">✓ Journal is balanced</span>
                ) : (
                  <span className="text-destructive font-medium">✗ Journal is NOT balanced</span>
                )}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Activity Log */}
      {activities && activities.length > 0 && (
        <div className="bg-card rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4 text-foreground">Activity Log</h2>
          <div className="space-y-2">
            {activities.map((activity: any) => (
              <div key={activity.id} className="text-sm text-muted-foreground border-l-2 border-border pl-3">
                <div className="font-medium text-foreground">{activity.action}</div>
                <div>{activity.description}</div>
                <div className="text-xs">{new Date(activity.created_at).toLocaleString()}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
