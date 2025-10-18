import { useState } from 'react'
import { usePeriodSnapshot } from '@/hooks/usePeriodClose'

export function SnapshotViewer() {
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7))
  const { data: snapshot, isLoading } = usePeriodSnapshot(period)

  if (isLoading) {
    return <div className="p-6">Loading snapshot...</div>
  }

  if (!snapshot || snapshot.length === 0) {
    return (
      <div className="p-6">
        <h1 className="text-3xl font-bold mb-6">Period Snapshot</h1>
        <div className="p-8 text-center text-muted-foreground">
          <p>No snapshot found for {period}</p>
          <p className="text-sm mt-2">Period must be closed to view snapshot</p>
        </div>
      </div>
    )
  }

  // Group by account type
  const grouped = snapshot.reduce((acc, item) => {
    const type = item.account_code.startsWith('1-') ? 'ASSET' :
                 item.account_code.startsWith('2-') ? 'LIABILITY' :
                 item.account_code.startsWith('3-') ? 'EQUITY' :
                 item.account_code.startsWith('4-') ? 'REVENUE' :
                 item.account_code.startsWith('5-') ? 'COGS' : 'OPEX'
    
    if (!acc[type]) acc[type] = []
    acc[type].push(item)
    return acc
  }, {} as Record<string, any[]>)

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Period Snapshot</h1>
        <input
          type="month"
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="border rounded px-3 py-2"
        />
      </div>

      {Object.entries(grouped).map(([type, accounts]) => (
        <div key={type} className="mb-6">
          <h2 className="text-xl font-bold mb-3 bg-muted px-4 py-2 rounded">
            {type}
          </h2>
          <div className="bg-card shadow rounded-lg overflow-hidden">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-muted">
                  <th className="text-left p-3 border">Account</th>
                  <th className="text-right p-3 border">Debit</th>
                  <th className="text-right p-3 border">Credit</th>
                  <th className="text-right p-3 border">Balance</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((acc) => (
                  <tr key={acc.account_code} className="hover:bg-muted/50">
                    <td className="p-3 border font-mono text-sm">
                      {acc.account_code}
                    </td>
                    <td className="p-3 border text-right font-mono">
                      {Number(acc.debit_balance).toLocaleString()}
                    </td>
                    <td className="p-3 border text-right font-mono">
                      {Number(acc.credit_balance).toLocaleString()}
                    </td>
                    <td className="p-3 border text-right font-mono font-semibold">
                      {Number(acc.net_balance).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  )
}
