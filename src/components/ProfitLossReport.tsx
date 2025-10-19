import { useState } from 'react'
import { useProfitLoss } from '@/hooks/useReports'
import * as XLSX from 'xlsx'

export function ProfitLossReport() {
  const [startPeriod, setStartPeriod] = useState(
    new Date().toISOString().slice(0, 7)
  )
  const [endPeriod, setEndPeriod] = useState(
    new Date().toISOString().slice(0, 7)
  )

  const { data: report, isLoading } = useProfitLoss(startPeriod, endPeriod)

  const handleExportExcel = () => {
    if (!report) return

    const rows = [
      ['EPILOG CREATIVE'],
      ['PROFIT & LOSS STATEMENT'],
      [`Period: ${startPeriod} to ${endPeriod}`],
      [],
      ['Account', 'Amount'],
    ]

    // Revenue
    rows.push(['REVENUE', ''])
    report.data
      .filter((item: any) => item.account_type === 'REVENUE')
      .forEach((item: any) => {
        rows.push([`  ${item.account_code} - ${item.account_name}`, item.amount])
      })
    rows.push(['Total Revenue', report.summary.revenue])
    rows.push([])

    // COGS
    rows.push(['COST OF GOODS SOLD', ''])
    report.data
      .filter((item: any) => item.account_type === 'COGS')
      .forEach((item: any) => {
        rows.push([`  ${item.account_code} - ${item.account_name}`, item.amount])
      })
    rows.push(['Total COGS', report.summary.cogs] as any)
    rows.push(['GROSS PROFIT', report.summary.grossProfit] as any)
    rows.push([])

    // OPEX
    rows.push(['OPERATING EXPENSES', ''])
    report.data
      .filter((item: any) => item.account_type === 'OPEX')
      .forEach((item: any) => {
        rows.push([`  ${item.account_code} - ${item.account_name}`, item.amount])
      })
    rows.push(['Total Operating Expenses', report.summary.opex] as any)
    rows.push([])
    rows.push(['NET PROFIT', report.summary.netProfit] as any)

    const ws = XLSX.utils.aoa_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'P&L')
    XLSX.writeFile(wb, `PL_${startPeriod}_${endPeriod}.xlsx`)
  }

  if (isLoading) {
    return <div className="p-6">Loading report...</div>
  }

  if (!report) {
    return <div className="p-6">No data available</div>
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Profit & Loss Statement</h1>
        <button
          onClick={handleExportExcel}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          📊 Export to Excel
        </button>
      </div>

      {/* Period Selector */}
      <div className="bg-card rounded-lg shadow p-4 mb-6 flex gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">From Period</label>
          <input
            type="month"
            value={startPeriod}
            onChange={(e) => setStartPeriod(e.target.value)}
            className="border rounded px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">To Period</label>
          <input
            type="month"
            value={endPeriod}
            onChange={(e) => setEndPeriod(e.target.value)}
            className="border rounded px-3 py-2"
          />
        </div>
      </div>

      {/* Report */}
      <div className="bg-card rounded-lg shadow p-6">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold">EPILOG CREATIVE</h2>
          <h3 className="text-xl">Profit & Loss Statement</h3>
          <p className="text-muted-foreground">
            Period: {startPeriod} to {endPeriod}
          </p>
        </div>

        <table className="w-full">
          <tbody>
            {/* Revenue */}
            <tr className="bg-blue-50">
              <td className="py-2 px-4 font-bold">REVENUE</td>
              <td className="py-2 px-4 text-right"></td>
            </tr>
            {report.data
              .filter((item: any) => item.account_type === 'REVENUE')
              .map((item: any) => (
                <tr key={item.account_code} className="hover:bg-muted/50">
                  <td className="py-1 px-4 pl-8">
                    {item.account_code} - {item.account_name}
                  </td>
                  <td className="py-1 px-4 text-right font-mono">
                    {Number(item.amount).toLocaleString()}
                  </td>
                </tr>
              ))}
            <tr className="font-bold border-t">
              <td className="py-2 px-4">Total Revenue</td>
              <td className="py-2 px-4 text-right font-mono">
                {report.summary.revenue.toLocaleString()}
              </td>
            </tr>

            <tr><td colSpan={2} className="py-2"></td></tr>

            {/* COGS */}
            <tr className="bg-purple-50">
              <td className="py-2 px-4 font-bold">COST OF GOODS SOLD</td>
              <td className="py-2 px-4 text-right"></td>
            </tr>
            {report.data
              .filter((item: any) => item.account_type === 'COGS')
              .map((item: any) => (
                <tr key={item.account_code} className="hover:bg-muted/50">
                  <td className="py-1 px-4 pl-8">
                    {item.account_code} - {item.account_name}
                  </td>
                  <td className="py-1 px-4 text-right font-mono">
                    {Number(item.amount).toLocaleString()}
                  </td>
                </tr>
              ))}
            <tr className="font-bold border-t">
              <td className="py-2 px-4">Total COGS</td>
              <td className="py-2 px-4 text-right font-mono">
                {report.summary.cogs.toLocaleString()}
              </td>
            </tr>

            <tr className="bg-green-50 font-bold text-lg">
              <td className="py-2 px-4">GROSS PROFIT</td>
              <td className="py-2 px-4 text-right font-mono">
                {report.summary.grossProfit.toLocaleString()}
              </td>
            </tr>
            <tr className="text-sm text-muted-foreground">
              <td className="py-1 px-4 pl-8">Gross Margin</td>
              <td className="py-1 px-4 text-right">
                {report.summary.grossMargin.toFixed(1)}%
              </td>
            </tr>

            <tr><td colSpan={2} className="py-2"></td></tr>

            {/* OPEX */}
            <tr className="bg-orange-50">
              <td className="py-2 px-4 font-bold">OPERATING EXPENSES</td>
              <td className="py-2 px-4 text-right"></td>
            </tr>
            {report.data
              .filter((item: any) => item.account_type === 'OPEX')
              .map((item: any) => (
                <tr key={item.account_code} className="hover:bg-muted/50">
                  <td className="py-1 px-4 pl-8">
                    {item.account_code} - {item.account_name}
                  </td>
                  <td className="py-1 px-4 text-right font-mono">
                    {Number(item.amount).toLocaleString()}
                  </td>
                </tr>
              ))}
            <tr className="font-bold border-t">
              <td className="py-2 px-4">Total Operating Expenses</td>
              <td className="py-2 px-4 text-right font-mono">
                {report.summary.opex.toLocaleString()}
              </td>
            </tr>

            <tr><td colSpan={2} className="py-2"></td></tr>

            <tr className="bg-blue-100 font-bold text-xl border-t-2 border-b-2">
              <td className="py-3 px-4">NET PROFIT</td>
              <td className="py-3 px-4 text-right font-mono">
                {report.summary.netProfit.toLocaleString()}
              </td>
            </tr>
            <tr className="text-sm text-muted-foreground">
              <td className="py-1 px-4 pl-8">Net Margin</td>
              <td className="py-1 px-4 text-right">
                {report.summary.netMargin.toFixed(1)}%
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
