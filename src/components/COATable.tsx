import { useAccountsByType } from '@/hooks/useAccounts'
import { ACCOUNT_TYPE_LABELS } from '@/lib/types'
import { Loader2 } from 'lucide-react'

export function COATable() {
  const { accounts, isLoading } = useAccountsByType()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-8">
      <h1 className="text-3xl font-bold text-foreground">Chart of Accounts</h1>

      {Object.entries(accounts).map(([type, accts]) => (
        <div key={type}>
          <h2 className="text-xl font-semibold mb-3 text-primary">
            {ACCOUNT_TYPE_LABELS[type as keyof typeof ACCOUNT_TYPE_LABELS] || type}
          </h2>
          <div className="border border-border rounded-lg overflow-hidden">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-muted">
                  <th className="text-left p-3 border-b border-border text-muted-foreground font-medium">Code</th>
                  <th className="text-left p-3 border-b border-border text-muted-foreground font-medium">Account Name</th>
                  <th className="text-left p-3 border-b border-border text-muted-foreground font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="bg-card">
                {accts.map((account) => (
                  <tr key={account.id} className="hover:bg-accent transition-colors">
                    <td className="p-3 border-b border-border font-mono text-sm text-foreground">{account.code}</td>
                    <td className="p-3 border-b border-border text-foreground">{account.name}</td>
                    <td className="p-3 border-b border-border">
                      {account.is_active ? (
                        <span className="text-green-600 dark:text-green-400">Active</span>
                      ) : (
                        <span className="text-muted-foreground">Inactive</span>
                      )}
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
