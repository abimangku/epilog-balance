import { useAPAgingReport } from '@/hooks/useAPAging'

export function APAgingReport() {
  const { data, isLoading } = useAPAgingReport()

  if (isLoading) {
    return <div className="p-6">Loading AP Aging...</div>
  }

  if (!data || data.aging.length === 0) {
    return (
      <div className="p-6">
        <h1 className="text-3xl font-bold mb-6">AP Aging Report</h1>
        <div className="p-8 text-center text-muted-foreground">
          <p className="text-lg">✅ No outstanding payables!</p>
        </div>
      </div>
    )
  }

  const { aging, summary } = data

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">AP Aging Report</h1>

      <div className="grid grid-cols-5 gap-4 mb-6">
        <div className="bg-card rounded shadow p-4">
          <div className="text-sm text-muted-foreground">Current (0-30)</div>
          <div className="text-xl font-bold">
            {summary['0-30'].toLocaleString()}
          </div>
        </div>
        <div className="bg-yellow-50 rounded shadow p-4">
          <div className="text-sm text-muted-foreground">31-60 Days</div>
          <div className="text-xl font-bold text-yellow-700">
            {summary['31-60'].toLocaleString()}
          </div>
        </div>
        <div className="bg-orange-50 rounded shadow p-4">
          <div className="text-sm text-muted-foreground">61-90 Days</div>
          <div className="text-xl font-bold text-orange-700">
            {summary['61-90'].toLocaleString()}
          </div>
        </div>
        <div className="bg-red-50 rounded shadow p-4">
          <div className="text-sm text-muted-foreground">90+ Days</div>
          <div className="text-xl font-bold text-red-700">
            {summary['90+'].toLocaleString()}
          </div>
        </div>
        <div className="bg-blue-50 rounded shadow p-4">
          <div className="text-sm text-muted-foreground">Total AP</div>
          <div className="text-xl font-bold text-blue-700">
            {summary.total.toLocaleString()}
          </div>
        </div>
      </div>

      <div className="bg-card shadow rounded-lg overflow-hidden">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-muted">
              <th className="text-left p-3 border">Bill #</th>
              <th className="text-left p-3 border">Vendor</th>
              <th className="text-center p-3 border">Category</th>
              <th className="text-left p-3 border">Date</th>
              <th className="text-left p-3 border">Due Date</th>
              <th className="text-right p-3 border">Total</th>
              <th className="text-right p-3 border">Paid</th>
              <th className="text-right p-3 border">Balance</th>
              <th className="text-center p-3 border">Days Overdue</th>
              <th className="text-center p-3 border">Bucket</th>
            </tr>
          </thead>
          <tbody>
            {aging.map((item: any) => {
              const bucketColors: Record<string, string> = {
                '0-30': 'bg-card',
                '31-60': 'bg-yellow-50',
                '61-90': 'bg-orange-50',
                '90+': 'bg-red-50',
              }

              return (
                <tr
                  key={item.id}
                  className={`hover:bg-muted/50 ${bucketColors[item.aging_bucket] || ''}`}
                >
                  <td className="p-3 border font-mono text-sm">{item.number}</td>
                  <td className="p-3 border">{item.vendor_name}</td>
                  <td className="p-3 border text-center">
                    <span className="text-xs font-medium">{item.category}</span>
                  </td>
                  <td className="p-3 border">
                    {new Date(item.date).toLocaleDateString()}
                  </td>
                  <td className="p-3 border">
                    {new Date(item.due_date).toLocaleDateString()}
                  </td>
                  <td className="p-3 border text-right font-mono">
                    {Number(item.total).toLocaleString()}
                  </td>
                  <td className="p-3 border text-right font-mono text-muted-foreground">
                    {Number(item.total_paid).toLocaleString()}
                  </td>
                  <td className="p-3 border text-right font-mono font-semibold">
                    {Number(item.balance).toLocaleString()}
                  </td>
                  <td className="p-3 border text-center">
                    {item.days_overdue > 0 ? (
                      <span className="text-red-600 font-medium">
                        {item.days_overdue}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </td>
                  <td className="p-3 border text-center">
                    <span className="text-xs font-medium">{item.aging_bucket}</span>
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
