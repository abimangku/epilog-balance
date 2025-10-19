import { useState } from 'react'
import { useBalanceSheet } from '@/hooks/useReports'
import * as XLSX from 'xlsx'

export function BalanceSheetReport() {
  const [asOfDate, setAsOfDate] = useState(
    new Date().toISOString().split('T')[0]
  )

  const { data: report, isLoading } = useBalanceSheet(asOfDate)

  const handleExportExcel = () => {
    if (!report) return

    const rows = [
      ['EPILOG CREATIVE'],
      ['BALANCE SHEET'],
      [`As of ${asOfDate}`],
      [],
      ['Account', 'Amount'],
    ]

    // Assets
    rows.push(['ASSETS', ''])
    report.data
      .filter((item: any) => item.account_type === 'ASSET')
      .forEach((item: any) => {
        rows.push([`  ${item.account_code} - ${item.account_name}`, item.balance])
      })
    rows.push(['Total Assets', report.summary.assets])
    rows.push([])

    // Liabilities
    rows.push(['LIABILITIES', ''])
    report.data
      .filter((item: any) => item.account_type === 'LIABILITY')
      .forEach((item: any) => {
        rows.push([`  ${item.account_code} - ${item.account_name}`, item.balance])
      })
    rows.push(['Total Liabilities', report.summary.liabilities])
    rows.push([])

    // Equity
    rows.push(['EQUITY', ''])
    report.data
      .filter((item: any) => item.account_type === 'EQUITY')
      .forEach((item: any) => {
        rows.push([`  ${item.account_code} - ${item.account_name}`, item.balance])
      })
    rows.push(['Total Equity', report.summary.equity])
    rows.push([])
    rows.push(['TOTAL LIABILITIES & EQUITY', report.summary.totalLiabilitiesEquity])

    const ws = XLSX.utils.aoa_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Balance Sheet')
    XLSX.writeFile(wb, `BalanceSheet_${asOfDate}.xlsx`)
  }

  if (isLoading) {
    return <div className="p-6">Loading report...</div>
  }

  if (!report) {
    return <div className="p-6">No data available</div>
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Balance Sheet</h1>
        <button
          onClick={handleExportExcel}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          📊 Export to Excel
        </button>
      </div>

      {/* Date Selector */}
      <div className="bg-card rounded-lg shadow p-4 mb-6">
        <label className="block text-sm font-medium mb-1">As of Date</label>
        <input
          type="date"
          value={asOfDate}
          onChange={(e) => setAsOfDate(e.target.value)}
          className="border rounded px-3 py-2"
        />
      </div>

      {/* Balance Check */}
      {!report.summary.balanced && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-800 font-medium">
            ⚠️ Balance Sheet does not balance!
          </p>
          <p className="text-sm text-red-700 mt-1">
            Assets: {report.summary.assets.toLocaleString()} vs 
            Liabilities + Equity: {report.summary.totalLiabilitiesEquity.toLocaleString()}
          </p>
          <p className="text-sm text-red-700">
            Difference: {Math.abs(report.summary.assets - report.summary.totalLiabilitiesEquity).toLocaleString()}
          </p>
        </div>
      )}

      {/* Report */}
      <div className="bg-card rounded-lg shadow p-6">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold">EPILOG CREATIVE</h2>
          <h3 className="text-xl">Balance Sheet</h3>
          <p className="text-muted-foreground">As of {asOfDate}</p>
        </div>

        <div className="grid grid-cols-2 gap-6">
          {/* Left Column: Assets */}
          <div>
            <table className="w-full">
              <tbody>
                <tr className="bg-green-50">
                  <td className="py-2 px-4 font-bold">ASSETS</td>
                  <td className="py-2 px-4 text-right"></td>
                </tr>
                {report.data
                  .filter((item: any) => item.account_type === 'ASSET')
                  .map((item: any) => (
                    <tr key={item.account_code} className="hover:bg-muted/50">
                      <td className="py-1 px-4 pl-8 text-sm">
                        {item.account_code} - {item.account_name}
                      </td>
                      <td className="py-1 px-4 text-right font-mono text-sm">
                        {Number(item.balance).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                <tr className="font-bold border-t-2">
                  <td className="py-2 px-4">Total Assets</td>
                  <td className="py-2 px-4 text-right font-mono">
                    {report.summary.assets.toLocaleString()}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Right Column: Liabilities & Equity */}
          <div>
            <table className="w-full">
              <tbody>
                <tr className="bg-red-50">
                  <td className="py-2 px-4 font-bold">LIABILITIES</td>
                  <td className="py-2 px-4 text-right"></td>
                </tr>
                {report.data
                  .filter((item: any) => item.account_type === 'LIABILITY')
                  .map((item: any) => (
                    <tr key={item.account_code} className="hover:bg-muted/50">
                      <td className="py-1 px-4 pl-8 text-sm">
                        {item.account_code} - {item.account_name}
                      </td>
                      <td className="py-1 px-4 text-right font-mono text-sm">
                        {Number(item.balance).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                <tr className="font-bold border-t">
                  <td className="py-2 px-4">Total Liabilities</td>
                  <td className="py-2 px-4 text-right font-mono">
                    {report.summary.liabilities.toLocaleString()}
                  </td>
                </tr>

                <tr><td colSpan={2} className="py-2"></td></tr>

                <tr className="bg-blue-50">
                  <td className="py-2 px-4 font-bold">EQUITY</td>
                  <td className="py-2 px-4 text-right"></td>
                </tr>
                {report.data
                  .filter((item: any) => item.account_type === 'EQUITY')
                  .map((item: any) => (
                    <tr key={item.account_code} className="hover:bg-muted/50">
                      <td className="py-1 px-4 pl-8 text-sm">
                        {item.account_code} - {item.account_name}
                      </td>
                      <td className="py-1 px-4 text-right font-mono text-sm">
                        {Number(item.balance).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                <tr className="font-bold border-t">
                  <td className="py-2 px-4">Total Equity</td>
                  <td className="py-2 px-4 text-right font-mono">
                    {report.summary.equity.toLocaleString()}
                  </td>
                </tr>

                <tr className="font-bold border-t-2">
                  <td className="py-2 px-4">TOTAL LIABILITIES & EQUITY</td>
                  <td className="py-2 px-4 text-right font-mono">
                    {report.summary.totalLiabilitiesEquity.toLocaleString()}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Balance Check Footer */}
        <div className="mt-6 pt-4 border-t">
          {report.summary.balanced ? (
            <p className="text-center text-green-600 font-medium">
              ✓ Balance Sheet is balanced
            </p>
          ) : (
            <p className="text-center text-red-600 font-medium">
              ✗ Balance Sheet does not balance - review journal entries
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
