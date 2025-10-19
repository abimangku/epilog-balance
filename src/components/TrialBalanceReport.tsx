import { useTrialBalance } from '@/hooks/useReports'
import * as XLSX from 'xlsx'

export function TrialBalanceReport() {
  const { data: report, isLoading } = useTrialBalance()

  const handleExportExcel = () => {
    if (!report) return

    const rows = [
      ['EPILOG CREATIVE'],
      ['TRIAL BALANCE'],
      [`As of ${new Date().toLocaleDateString()}`],
      [],
      ['Account Code', 'Account Name', 'Type', 'Debit', 'Credit', 'Balance'],
    ]

    report.data.forEach((item: any) => {
      rows.push([
        item.code,
        item.name,
        item.type,
        item.total_debit,
        item.total_credit,
        item.balance,
      ])
    })

    rows.push([])
    rows.push(['TOTALS', '', '', report.summary.totalDebit, report.summary.totalCredit, ''])

    const ws = XLSX.utils.aoa_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Trial Balance')
    XLSX.writeFile(wb, `TrialBalance_${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  if (isLoading) {
    return <div className="p-6">Loading report...</div>
  }

  if (!report) {
    return <div className="p-6">No data available</div>
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Trial Balance</h1>
        <button
          onClick={handleExportExcel}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          📊 Export to Excel
        </button>
      </div>

      {/* Balance Check */}
      {!report.summary.balanced && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-800 font-medium">
            ⚠️ Trial Balance does not balance!
          </p>
          <p className="text-sm text-red-700 mt-1">
            Total Debit: {report.summary.totalDebit.toLocaleString()} vs 
            Total Credit: {report.summary.totalCredit.toLocaleString()}
          </p>
        </div>
      )}

      <div className="bg-card rounded-lg shadow overflow-hidden">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-muted">
              <th className="text-left p-3 border">Code</th>
              <th className="text-left p-3 border">Account Name</th>
              <th className="text-left p-3 border">Type</th>
              <th className="text-right p-3 border">Debit</th>
              <th className="text-right p-3 border">Credit</th>
              <th className="text-right p-3 border">Balance</th>
            </tr>
          </thead>
          <tbody>
            {report.data.map((item: any) => (
              <tr key={item.code} className="hover:bg-muted/50">
                <td className="p-3 border font-mono text-sm">{item.code}</td>
                <td className="p-3 border">{item.name}</td>
                <td className="p-3 border">
                  <span className="text-xs bg-muted px-2 py-1 rounded">
                    {item.type}
                  </span>
                </td>
                <td className="p-3 border text-right font-mono">
                  {Number(item.total_debit) > 0 
                    ? Number(item.total_debit).toLocaleString() 
                    : '-'}
                </td>
                <td className="p-3 border text-right font-mono">
                  {Number(item.total_credit) > 0 
                    ? Number(item.total_credit).toLocaleString() 
                    : '-'}
                </td>
                <td className="p-3 border text-right font-mono font-semibold">
                  {Number(item.balance).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-muted font-bold">
              <td colSpan={3} className="p-3 border">TOTALS</td>
              <td className="p-3 border text-right font-mono">
                {report.summary.totalDebit.toLocaleString()}
              </td>
              <td className="p-3 border text-right font-mono">
                {report.summary.totalCredit.toLocaleString()}
              </td>
              <td className="p-3 border text-right">
                {report.summary.balanced ? (
                  <span className="text-green-600">✓ Balanced</span>
                ) : (
                  <span className="text-red-600">✗ Unbalanced</span>
                )}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
