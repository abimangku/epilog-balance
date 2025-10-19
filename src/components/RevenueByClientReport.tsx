import { useRevenueByClient } from '@/hooks/useMasterData'
import * as XLSX from 'xlsx'

export function RevenueByClientReport() {
  const { data: report } = useRevenueByClient()

  const handleExportExcel = () => {
    if (!report) return

    const rows = [
      ['EPILOG CREATIVE'],
      ['REVENUE BY CLIENT REPORT'],
      [],
      ['Client', 'Invoices', 'Revenue', 'VAT', 'Total Billed', 'Received', 'Outstanding'],
    ]

    report.forEach((item: any) => {
      rows.push([
        item.client_name,
        item.invoice_count,
        item.total_revenue,
        item.total_vat,
        item.total_billed,
        item.total_received,
        item.outstanding,
      ] as any)
    })

    const ws = XLSX.utils.aoa_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Revenue by Client')
    XLSX.writeFile(wb, 'RevenueByClient.xlsx')
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Revenue by Client</h1>
        <button
          onClick={handleExportExcel}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
        >
          📊 Export to Excel
        </button>
      </div>

      <div className="bg-card rounded-lg shadow overflow-hidden">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-muted">
              <th className="text-left p-3 border">Client</th>
              <th className="text-center p-3 border">Invoices</th>
              <th className="text-right p-3 border">Revenue</th>
              <th className="text-right p-3 border">VAT</th>
              <th className="text-right p-3 border">Total Billed</th>
              <th className="text-right p-3 border">Received</th>
              <th className="text-right p-3 border">Outstanding</th>
            </tr>
          </thead>
          <tbody>
            {report?.map((item: any) => (
              <tr key={item.client_id} className="hover:bg-muted/50">
                <td className="p-3 border font-semibold">{item.client_name}</td>
                <td className="p-3 border text-center">{item.invoice_count}</td>
                <td className="p-3 border text-right font-mono">
                  {Number(item.total_revenue).toLocaleString()}
                </td>
                <td className="p-3 border text-right font-mono text-muted-foreground">
                  {Number(item.total_vat).toLocaleString()}
                </td>
                <td className="p-3 border text-right font-mono font-semibold">
                  {Number(item.total_billed).toLocaleString()}
                </td>
                <td className="p-3 border text-right font-mono text-green-600">
                  {Number(item.total_received).toLocaleString()}
                </td>
                <td className="p-3 border text-right font-mono text-red-600">
                  {Number(item.outstanding).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
