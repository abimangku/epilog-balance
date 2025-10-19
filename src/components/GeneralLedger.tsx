import { useState } from 'react'
import { useGeneralLedger } from '@/hooks/useCriticalFeatures'
import { useAccounts } from '@/hooks/useAccounts'
import * as XLSX from 'xlsx'

export function GeneralLedger() {
  const [accountCode, setAccountCode] = useState('')
  const [period, setPeriod] = useState('')

  const { data: accounts } = useAccounts()
  const { data: ledger, isLoading } = useGeneralLedger(accountCode, period || undefined)

  const handleExportExcel = () => {
    if (!ledger) return

    const account = accounts?.find((a: any) => a.code === accountCode)

    const rows = [
      ['EPILOG CREATIVE'],
      ['GENERAL LEDGER'],
      [`Account: ${accountCode} - ${account?.name || ''}`],
      period ? [`Period: ${period}`] : [],
      [],
      ['Date', 'Journal #', 'Description', 'Debit', 'Credit', 'Balance'],
    ]

    ledger.forEach((item: any) => {
      rows.push([
        item.date,
        item.journal_number,
        item.description || item.line_description,
        Number(item.debit),
        Number(item.credit),
        Number(item.running_balance),
      ])
    })

    const ws = XLSX.utils.aoa_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'General Ledger')
    XLSX.writeFile(wb, `GL_${accountCode}_${period || 'All'}.xlsx`)
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-foreground">General Ledger</h1>
        <button
          onClick={handleExportExcel}
          disabled={!ledger || ledger.length === 0}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          📊 Export to Excel
        </button>
      </div>

      {/* Filters */}
      <div className="bg-card rounded-lg shadow p-4 mb-6 grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1 text-foreground">Account *</label>
          <select
            value={accountCode}
            onChange={(e) => setAccountCode(e.target.value)}
            className="w-full border border-input rounded-md px-3 py-2 bg-background text-foreground"
          >
            <option value="">Select Account</option>
            {accounts?.map((account: any) => (
              <option key={account.code} value={account.code}>
                {account.code} - {account.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 text-foreground">Period (optional)</label>
          <input
            type="month"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="w-full border border-input rounded-md px-3 py-2 bg-background text-foreground"
            placeholder="Leave blank for all periods"
          />
        </div>
      </div>

      {/* Results */}
      {!accountCode && (
        <div className="bg-card rounded-lg shadow p-12 text-center">
          <p className="text-muted-foreground text-lg">Select an account to view its general ledger</p>
        </div>
      )}

      {accountCode && isLoading && (
        <div className="bg-card rounded-lg shadow p-12 text-center">
          <p className="text-foreground">Loading ledger...</p>
        </div>
      )}

      {accountCode && !isLoading && ledger && ledger.length === 0 && (
        <div className="bg-card rounded-lg shadow p-12 text-center">
          <p className="text-muted-foreground">No transactions found for this account</p>
        </div>
      )}

      {accountCode && ledger && ledger.length > 0 && (
        <div className="bg-card rounded-lg shadow overflow-hidden">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-muted">
                <th className="text-left p-3 border border-border text-foreground">Date</th>
                <th className="text-left p-3 border border-border text-foreground">Journal #</th>
                <th className="text-left p-3 border border-border text-foreground">Description</th>
                <th className="text-right p-3 border border-border text-foreground">Debit</th>
                <th className="text-right p-3 border border-border text-foreground">Credit</th>
                <th className="text-right p-3 border border-border text-foreground">Balance</th>
              </tr>
            </thead>
            <tbody>
              {ledger.map((item: any, idx: number) => (
                <tr key={idx} className="hover:bg-muted/50">
                  <td className="p-3 border border-border text-foreground">
                    {new Date(item.date).toLocaleDateString()}
                  </td>
                  <td className="p-3 border border-border font-mono text-sm text-foreground">
                    {item.journal_number}
                  </td>
                  <td className="p-3 border border-border text-foreground">
                    {item.description || item.line_description}
                  </td>
                  <td className="p-3 border border-border text-right font-mono text-foreground">
                    {Number(item.debit) > 0 ? Number(item.debit).toLocaleString() : '-'}
                  </td>
                  <td className="p-3 border border-border text-right font-mono text-foreground">
                    {Number(item.credit) > 0 ? Number(item.credit).toLocaleString() : '-'}
                  </td>
                  <td className="p-3 border border-border text-right font-mono font-semibold text-foreground">
                    {Number(item.running_balance).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
