import { useARAgingReport } from '@/hooks/useInvoices'

export function ARAgingReport() {
  const { data, isLoading } = useARAgingReport()

  if (isLoading) {
    return <div className="p-6">Loading AR aging report...</div>
  }

  if (!data) return null

  const { buckets, total, invoices } = data

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">AR Aging Report</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600 mb-1">Current (0-30)</div>
          <div className="text-2xl font-bold">
            {buckets.current.toLocaleString()}
          </div>
          <div className="text-xs text-gray-500">IDR</div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600 mb-1">31-60 Days</div>
          <div className="text-2xl font-bold text-yellow-600">
            {buckets.days31to60.toLocaleString()}
          </div>
          <div className="text-xs text-gray-500">IDR</div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600 mb-1">61-90 Days</div>
          <div className="text-2xl font-bold text-orange-600">
            {buckets.days61to90.toLocaleString()}
          </div>
          <div className="text-xs text-gray-500">IDR</div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600 mb-1">Over 90 Days</div>
          <div className="text-2xl font-bold text-red-600">
            {buckets.over90.toLocaleString()}
          </div>
          <div className="text-xs text-gray-500">IDR</div>
        </div>

        <div className="bg-blue-600 text-white rounded-lg shadow p-4">
          <div className="text-sm mb-1">Total AR</div>
          <div className="text-2xl font-bold">
            {total.toLocaleString()}
          </div>
          <div className="text-xs">IDR</div>
        </div>
      </div>

      {/* Detailed Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="text-left p-3 border">Invoice</th>
              <th className="text-left p-3 border">Client</th>
              <th className="text-left p-3 border">Date</th>
              <th className="text-left p-3 border">Due Date</th>
              <th className="text-right p-3 border">Total</th>
              <th className="text-right p-3 border">Paid</th>
              <th className="text-right p-3 border">Outstanding</th>
              <th className="text-right p-3 border">Days Overdue</th>
              <th className="text-left p-3 border">Status</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((invoice: any) => {
              let agingClass = ''
              if (invoice.daysOverdue > 90) agingClass = 'bg-red-50'
              else if (invoice.daysOverdue > 60) agingClass = 'bg-orange-50'
              else if (invoice.daysOverdue > 30) agingClass = 'bg-yellow-50'

              return (
                <tr key={invoice.id} className={agingClass}>
                  <td className="p-3 border font-mono text-sm">{invoice.number}</td>
                  <td className="p-3 border">{invoice.client?.name}</td>
                  <td className="p-3 border text-sm">
                    {new Date(invoice.date).toLocaleDateString('id-ID')}
                  </td>
                  <td className="p-3 border text-sm">
                    {new Date(invoice.due_date).toLocaleDateString('id-ID')}
                  </td>
                  <td className="p-3 border text-right font-mono">
                    {invoice.total.toLocaleString()}
                  </td>
                  <td className="p-3 border text-right font-mono">
                    {invoice.totalPaid.toLocaleString()}
                  </td>
                  <td className="p-3 border text-right font-mono font-semibold">
                    {invoice.outstanding.toLocaleString()}
                  </td>
                  <td className="p-3 border text-right">
                    {invoice.daysOverdue > 0 ? (
                      <span className="text-red-600 font-semibold">
                        {invoice.daysOverdue}
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="p-3 border">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      invoice.status === 'PAID' ? 'bg-green-100 text-green-800' :
                      invoice.status === 'PARTIAL' ? 'bg-yellow-100 text-yellow-800' :
                      invoice.status === 'OVERDUE' ? 'bg-red-100 text-red-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {invoice.status}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
          <tfoot className="bg-gray-50 font-semibold">
            <tr>
              <td colSpan={6} className="p-3 border text-right">Total Outstanding:</td>
              <td className="p-3 border text-right font-mono text-lg">
                IDR {total.toLocaleString()}
              </td>
              <td colSpan={2} className="p-3 border"></td>
            </tr>
          </tfoot>
        </table>
      </div>

      {invoices.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <p className="text-lg mb-2">✅ No outstanding invoices</p>
          <p className="text-sm">All receivables have been collected!</p>
        </div>
      )}
    </div>
  )
}
