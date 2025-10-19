import { useBills } from '@/hooks/useBills'
import { Link } from 'react-router-dom'
import { exportToExcel } from '@/lib/exportToExcel'
import { Download } from 'lucide-react'

export function BillList() {
  const { data: bills, isLoading } = useBills()

  const handleExport = () => {
    const exportData = bills?.map(bill => {
      const totalPaid = bill.payments?.reduce(
        (sum: number, p: any) => sum + Number(p.amount) + Number(p.pph23_withheld),
        0
      ) || 0
      const balance = Number(bill.total) - totalPaid

      return {
        'Bill #': bill.number,
        'Date': new Date(bill.date).toLocaleDateString(),
        'Vendor': bill.vendor?.name,
        'Category': bill.category,
        'Project': bill.project?.code || '-',
        'Total': bill.total,
        'Status': bill.status,
        'Balance': balance,
      }
    }) || []
    
    exportToExcel(exportData, `bills-${new Date().toISOString().split('T')[0]}`, 'Bills')
  }

  if (isLoading) {
    return <div className="p-6">Loading bills...</div>
  }

  if (!bills || bills.length === 0) {
    return (
      <div className="p-6">
        <h1 className="text-3xl font-bold mb-6">Vendor Bills</h1>
        <div className="p-8 text-center text-muted-foreground">
          <p className="text-lg mb-4">No bills yet</p>
          <Link
            to="/bills/new"
            className="inline-block px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
          >
            Create First Bill
          </Link>
        </div>
      </div>
    )
  }

  const statusColors: Record<string, string> = {
    DRAFT: 'bg-muted text-muted-foreground',
    APPROVED: 'bg-blue-100 text-blue-800',
    PARTIAL: 'bg-yellow-100 text-yellow-800',
    PAID: 'bg-green-100 text-green-800',
    CANCELLED: 'bg-muted text-muted-foreground',
  }

  const categoryColors: Record<string, string> = {
    COGS: 'bg-purple-100 text-purple-800',
    OPEX: 'bg-muted text-muted-foreground',
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Vendor Bills</h1>
        <div className="flex gap-2">
          <button
            onClick={handleExport}
            className="px-4 py-2 bg-muted text-foreground rounded hover:bg-muted/80 flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Export to Excel
          </button>
          <Link
            to="/bills/new"
            className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
          >
            + New Bill
          </Link>
        </div>
      </div>

      <div className="bg-card shadow rounded-lg overflow-hidden">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-muted">
              <th className="text-left p-3 border">Bill #</th>
              <th className="text-left p-3 border">Date</th>
              <th className="text-left p-3 border">Vendor</th>
              <th className="text-center p-3 border">Category</th>
              <th className="text-left p-3 border">Project</th>
              <th className="text-right p-3 border">Total</th>
              <th className="text-center p-3 border">Status</th>
              <th className="text-center p-3 border">Actions</th>
            </tr>
          </thead>
          <tbody>
            {bills.map((bill: any) => {
              const totalPaid = bill.payments?.reduce(
                (sum: number, p: any) => sum + Number(p.amount) + Number(p.pph23_withheld),
                0
              ) || 0
              const balance = Number(bill.total) - totalPaid

              return (
                <tr key={bill.id} className="hover:bg-muted/50">
                  <td className="p-3 border font-mono text-sm">
                    <Link to={`/bills/${bill.id}`} className="text-primary hover:underline">
                      {bill.number}
                    </Link>
                  </td>
                  <td className="p-3 border">
                    {new Date(bill.date).toLocaleDateString()}
                  </td>
                  <td className="p-3 border">{bill.vendor?.name}</td>
                  <td className="p-3 border text-center">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        categoryColors[bill.category] || ''
                      }`}
                    >
                      {bill.category}
                    </span>
                  </td>
                  <td className="p-3 border">
                    {bill.project?.code || '-'}
                  </td>
                  <td className="p-3 border text-right font-mono">
                    {Number(bill.total).toLocaleString()}
                  </td>
                  <td className="p-3 border text-center">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        statusColors[bill.status] || ''
                      }`}
                    >
                      {bill.status}
                    </span>
                    {balance > 0 && (
                      <div className="text-xs text-muted-foreground mt-1">
                        Balance: {balance.toLocaleString()}
                      </div>
                    )}
                  </td>
                  <td className="p-3 border text-center">
                    {bill.status !== 'PAID' && (
                      <Link
                        to={`/payments/new?bill=${bill.id}`}
                        className="text-primary hover:underline text-sm"
                      >
                        Pay
                      </Link>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
