import { useProjectProfitability } from '@/hooks/useMasterData'
import * as XLSX from 'xlsx'

export function ProjectProfitabilityReport() {
  const { data: report } = useProjectProfitability()

  const handleExportExcel = () => {
    if (!report) return

    const rows = [
      ['EPILOG CREATIVE'],
      ['PROJECT PROFITABILITY REPORT'],
      [],
      ['Project', 'Client', 'Status', 'Budget', 'Revenue', 'COGS', 'Gross Profit', 'Margin %', 'Budget Variance'],
    ]

    report.forEach((item: any) => {
      rows.push([
        item.project_name,
        item.client_name,
        item.status,
        item.budget_amount,
        item.revenue,
        item.cogs,
        item.gross_profit,
        item.margin_percent,
        item.budget_variance,
      ] as any)
    })

    const ws = XLSX.utils.aoa_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Project Profitability')
    XLSX.writeFile(wb, 'ProjectProfitability.xlsx')
  }

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'bg-green-100 text-green-800'
      case 'ON_HOLD': return 'bg-yellow-100 text-yellow-800'
      case 'COMPLETED': return 'bg-blue-100 text-blue-800'
      case 'CANCELLED': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Project Profitability</h1>
        <button
          onClick={handleExportExcel}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
        >
          📊 Export to Excel
        </button>
      </div>

      <div className="bg-card rounded-lg shadow overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-muted">
              <th className="text-left p-3 border">Project</th>
              <th className="text-left p-3 border">Client</th>
              <th className="text-center p-3 border">Status</th>
              <th className="text-right p-3 border">Budget</th>
              <th className="text-right p-3 border">Revenue</th>
              <th className="text-right p-3 border">COGS</th>
              <th className="text-right p-3 border">Gross Profit</th>
              <th className="text-right p-3 border">Margin %</th>
              <th className="text-right p-3 border">Budget Variance</th>
            </tr>
          </thead>
          <tbody>
            {report?.map((item: any) => (
              <tr key={item.project_id} className="hover:bg-muted/50">
                <td className="p-3 border font-semibold">{item.project_name}</td>
                <td className="p-3 border">{item.client_name || '-'}</td>
                <td className="p-3 border text-center">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusBadgeClass(item.status)}`}>
                    {item.status}
                  </span>
                </td>
                <td className="p-3 border text-right font-mono text-muted-foreground">
                  {item.budget_amount ? Number(item.budget_amount).toLocaleString() : '-'}
                </td>
                <td className="p-3 border text-right font-mono">
                  {Number(item.revenue).toLocaleString()}
                </td>
                <td className="p-3 border text-right font-mono text-red-600">
                  {Number(item.cogs).toLocaleString()}
                </td>
                <td className="p-3 border text-right font-mono font-semibold">
                  {Number(item.gross_profit).toLocaleString()}
                </td>
                <td className="p-3 border text-right font-mono">
                  {Number(item.margin_percent).toFixed(1)}%
                </td>
                <td className={`p-3 border text-right font-mono ${
                  Number(item.budget_variance) >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {item.budget_amount ? Number(item.budget_variance).toLocaleString() : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
