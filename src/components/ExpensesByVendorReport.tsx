import { useExpensesByVendor } from '@/hooks/useMasterData'
import * as XLSX from 'xlsx'

export function ExpensesByVendorReport() {
  const { data: report } = useExpensesByVendor()

  const handleExportExcel = () => {
    if (!report) return

    const rows = [
      ['EPILOG CREATIVE'],
      ['EXPENSES BY VENDOR REPORT'],
      [],
      ['Vendor', 'Bills', 'Expenses', 'VAT', 'Total Billed', 'Paid', 'Outstanding'],
    ]

    report.forEach((item: any) => {
      rows.push([
        item.vendor_name,
        item.bill_count,
        item.total_expenses,
        item.total_vat,
        item.total_billed,
        item.total_paid,
        item.outstanding,
      ] as any)
    })

    const ws = XLSX.utils.aoa_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Expenses by Vendor')
    XLSX.writeFile(wb, 'ExpensesByVendor.xlsx')
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Expenses by Vendor</h1>
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
              <th className="text-left p-3 border">Vendor</th>
              <th className="text-center p-3 border">Bills</th>
              <th className="text-right p-3 border">Expenses</th>
              <th className="text-right p-3 border">VAT</th>
              <th className="text-right p-3 border">Total Billed</th>
              <th className="text-right p-3 border">Paid</th>
              <th className="text-right p-3 border">Outstanding</th>
            </tr>
          </thead>
          <tbody>
            {report?.map((item: any) => (
              <tr key={item.vendor_id} className="hover:bg-muted/50">
                <td className="p-3 border font-semibold">{item.vendor_name}</td>
                <td className="p-3 border text-center">{item.bill_count}</td>
                <td className="p-3 border text-right font-mono">
                  {Number(item.total_expenses).toLocaleString()}
                </td>
                <td className="p-3 border text-right font-mono text-muted-foreground">
                  {Number(item.total_vat).toLocaleString()}
                </td>
                <td className="p-3 border text-right font-mono font-semibold">
                  {Number(item.total_billed).toLocaleString()}
                </td>
                <td className="p-3 border text-right font-mono text-green-600">
                  {Number(item.total_paid).toLocaleString()}
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
